import { NextRequest, NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

/**
 * 실거래 조회 API.
 * GET /api/land?region=41590&fromYm=202601&toYm=202607&minArea=&maxArea=&minAmt=&maxAmt=&jimok=&page=1
 * 금액 단위: 만원, 면적 단위: ㎡
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const region = p.get("region");
  if (!region) return NextResponse.json({ error: "region 파라미터가 필요합니다." }, { status: 400 });

  const page = Math.max(Number(p.get("page")) || 1, 1);
  const pageSize = Math.min(Number(p.get("pageSize")) || 200, 1000);

  let db;
  try {
    db = supabaseAnon();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
  let q = db
    .from("land_transactions")
    .select("*", { count: "exact" })
    .eq("lawd_cd", region)
    .eq("cancel_deal", false);

  // 기간 필터: YYYYMM 문자열 → (year*100+month) 비교
  const fromYm = p.get("fromYm");
  const toYm = p.get("toYm");
  // deal_year/deal_month 조합 비교는 or 절이 복잡해지므로 연도 범위 + 클라이언트 필터로 단순화하지 않고
  // 정수 비교식으로 처리: Postgres에서 (deal_year * 100 + deal_month) 범위는 rpc 없이 표현이 어려워
  // 연·월을 나눠 처리한다.
  if (fromYm && /^\d{6}$/.test(fromYm)) {
    const y = Number(fromYm.slice(0, 4));
    const m = Number(fromYm.slice(4, 6));
    q = q.or(`deal_year.gt.${y},and(deal_year.eq.${y},deal_month.gte.${m})`);
  }
  if (toYm && /^\d{6}$/.test(toYm)) {
    const y = Number(toYm.slice(0, 4));
    const m = Number(toYm.slice(4, 6));
    q = q.or(`deal_year.lt.${y},and(deal_year.eq.${y},deal_month.lte.${m})`);
  }

  const minArea = Number(p.get("minArea"));
  const maxArea = Number(p.get("maxArea"));
  if (minArea > 0) q = q.gte("area_sqm", minArea);
  if (maxArea > 0) q = q.lte("area_sqm", maxArea);

  const minAmt = Number(p.get("minAmt"));
  const maxAmt = Number(p.get("maxAmt"));
  if (minAmt > 0) q = q.gte("deal_amount_manwon", minAmt);
  if (maxAmt > 0) q = q.lte("deal_amount_manwon", maxAmt);

  const jimok = p.get("jimok");
  if (jimok) q = q.eq("jimok", jimok);

  const useZone = p.get("useZone");
  if (useZone) q = q.eq("use_zone", useZone);

  const { data, error, count } = await q
    .order("deal_year", { ascending: false })
    .order("deal_month", { ascending: false })
    .order("deal_day", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data, total: count, page, pageSize });
}
