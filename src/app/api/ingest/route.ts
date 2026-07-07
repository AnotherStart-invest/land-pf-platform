import { NextRequest, NextResponse } from "next/server";
import { REGIONS, DEFAULT_INGEST_MONTHS } from "@/lib/config";
import { fetchLandTrades, recentMonths } from "@/lib/molit";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300; // Vercel 함수 타임아웃 (초)

/**
 * 실거래 데이터 적재 배치.
 * GET /api/ingest?months=6
 * 헤더: Authorization: Bearer <INGEST_SECRET>
 * Vercel Cron 또는 수동 호출로 실행.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const months = Math.min(
    Number(req.nextUrl.searchParams.get("months")) || DEFAULT_INGEST_MONTHS,
    24
  );
  const yms = recentMonths(months);
  const db = supabaseAdmin();

  const summary: Record<string, { fetched: number; upserted: number }> = {};
  const errors: string[] = [];

  for (const region of REGIONS) {
    let fetched = 0;
    let upserted = 0;

    for (const ym of yms) {
      try {
        const rows = await fetchLandTrades(region.lawdCd, ym);
        fetched += rows.length;
        if (rows.length === 0) continue;

        const { error, count } = await db
          .from("land_transactions")
          .upsert(rows, {
            onConflict:
              "lawd_cd,umd_nm,jibun,deal_year,deal_month,deal_day,area_sqm,deal_amount_manwon",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (error) throw new Error(`DB upsert 실패: ${error.message}`);
        upserted += count ?? rows.length;
      } catch (e) {
        errors.push(`${region.name} ${ym}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    summary[region.name] = { fetched, upserted };
  }

  return NextResponse.json({ ok: errors.length === 0, months: yms, summary, errors });
}
