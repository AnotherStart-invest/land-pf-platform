import { NextRequest, NextResponse } from "next/server";
import { REGIONS, DEFAULT_INGEST_MONTHS } from "@/lib/config";
import { fetchLandTrades, recentMonths } from "@/lib/molit";
import { supabaseAdmin } from "@/lib/supabase";
import { LandTransaction } from "@/lib/supabase";

export const maxDuration = 300; // Vercel 함수 타임아웃 (초)

const CONCURRENCY = 8;

/**
 * 실거래 데이터 적재 배치.
 * GET /api/ingest?months=2&sido=41&region=41591
 *  - months: 당월 포함 과거 N개월 (기본 2, 최대 24)
 *  - sido:   법정동 코드 접두어 필터 (11=서울, 28=인천, 41=경기) — 선택
 *  - region: 특정 시군구 코드만 — 선택
 * 헤더: Authorization: Bearer <INGEST_SECRET>
 * Vercel Cron 또는 수동 호출로 실행.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const p = req.nextUrl.searchParams;
  const months = Math.min(Number(p.get("months")) || DEFAULT_INGEST_MONTHS, 24);
  const sido = p.get("sido");
  const regionCd = p.get("region");

  let targets = REGIONS;
  if (regionCd) targets = targets.filter((r) => r.lawdCd === regionCd);
  else if (sido) targets = targets.filter((r) => r.lawdCd.startsWith(sido));

  const yms = recentMonths(months);
  const db = supabaseAdmin();

  // (권역 × 월) 작업 목록을 만들어 동시 처리
  const jobs = targets.flatMap((region) => yms.map((ym) => ({ region, ym })));
  const errors: string[] = [];
  let fetched = 0;
  let upserted = 0;

  const dedupeKey = (r: LandTransaction) =>
    [r.lawd_cd, r.umd_nm, r.jibun, r.deal_year, r.deal_month, r.deal_day, r.area_sqm, r.deal_amount_manwon].join("|");

  async function runJob(job: { region: (typeof REGIONS)[number]; ym: string }) {
    try {
      const rows = await fetchLandTrades(job.region.lawdCd, job.ym);
      fetched += rows.length;
      if (rows.length === 0) return;

      // 같은 배치 안에 자연키가 겹치는 행이 있으면 ON CONFLICT DO UPDATE가 실패하므로 선 중복 제거
      const seen = new Set<string>();
      const deduped = rows.filter((r) => {
        const key = dedupeKey(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const { error, count } = await db.from("land_transactions").upsert(deduped, {
        onConflict:
          "lawd_cd,umd_nm,jibun,deal_year,deal_month,deal_day,area_sqm,deal_amount_manwon",
        ignoreDuplicates: false, // 재적재 시 기존 행도 갱신 (필드 백필)
        count: "exact",
      });
      if (error) throw new Error(`DB upsert 실패: ${error.message}`);
      upserted += count ?? deduped.length;
    } catch (e) {
      errors.push(`${job.region.name} ${job.ym}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    await Promise.all(jobs.slice(i, i + CONCURRENCY).map(runJob));
  }

  return NextResponse.json({
    ok: errors.length === 0,
    regions: targets.length,
    months: yms,
    fetched,
    upserted,
    errors,
  });
}
