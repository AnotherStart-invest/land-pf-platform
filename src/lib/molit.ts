import { LandTransaction } from "./supabase";

/**
 * 국토교통부 토지 매매 신고 실거래가 API 클라이언트
 * https://www.data.go.kr/data/15126466/openapi.do
 *
 * 응답이 XML이므로 의존성 없이 태그 단위로 파싱한다.
 * API 버전에 따라 태그명이 영문(dealAmount)일 수도, 국문(거래금액)일 수도 있어 둘 다 지원.
 */

const ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade";

const PAGE_SIZE = 1000;

function tag(block: string, ...names: string[]): string | null {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
    if (m) {
      const v = m[1].trim();
      if (v !== "") return v;
    }
  }
  return null;
}

function parseAmountManwon(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseItems(xml: string, lawdCd: string): LandTransaction[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const rows: LandTransaction[] = [];

  for (const block of items) {
    const amount = parseAmountManwon(tag(block, "dealAmount", "거래금액"));
    const area = Number(tag(block, "dealArea", "거래면적") ?? NaN);
    const year = Number(tag(block, "dealYear", "년") ?? NaN);
    const month = Number(tag(block, "dealMonth", "월") ?? NaN);
    if (amount === null || !Number.isFinite(area) || !Number.isFinite(year) || !Number.isFinite(month)) {
      continue; // 필수값 없는 행은 스킵
    }

    const day = Number(tag(block, "dealDay", "일") ?? NaN);
    const cdeal = tag(block, "cdealType", "해제여부");
    const share = tag(block, "shareDealingType", "지분거래구분");

    rows.push({
      lawd_cd: lawdCd,
      sgg_nm: tag(block, "sggNm", "시군구"),
      umd_nm: tag(block, "umdNm", "법정동"),
      jibun: tag(block, "jibun", "지번"),
      jimok: tag(block, "jimok", "지목"),
      use_zone: tag(block, "useZone", "용도지역"),
      area_sqm: area,
      deal_amount_manwon: amount,
      deal_year: year,
      deal_month: month,
      deal_day: Number.isFinite(day) ? day : null,
      share_dealing: share !== null && share !== "",
      dealing_type: tag(block, "dealingGbn", "거래유형"),
      cancel_deal: cdeal === "O" || cdeal === "Y" || cdeal === "해제",
    });
  }
  return rows;
}

function parseTotalCount(xml: string): number {
  const m = xml.match(/<totalCount>(\d+)<\/totalCount>/);
  return m ? Number(m[1]) : 0;
}

function parseResultCode(xml: string): { code: string; msg: string } {
  const code = xml.match(/<resultCode>([\s\S]*?)<\/resultCode>/)?.[1]?.trim() ?? "";
  const msg = xml.match(/<resultMsg>([\s\S]*?)<\/resultMsg>/)?.[1]?.trim() ?? "";
  return { code, msg };
}

/**
 * 특정 시군구(lawdCd) + 계약년월(dealYmd, YYYYMM)의 토지 매매 실거래 전체 조회.
 * totalCount 기준으로 페이지네이션.
 */
export async function fetchLandTrades(
  lawdCd: string,
  dealYmd: string
): Promise<LandTransaction[]> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY 환경변수가 필요합니다.");

  const all: LandTransaction[] = [];
  let page = 1;

  for (;;) {
    const url =
      `${ENDPOINT}?serviceKey=${encodeURIComponent(serviceKey)}` +
      `&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${page}&numOfRows=${PAGE_SIZE}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`공공데이터포털 API HTTP ${res.status} (${lawdCd}/${dealYmd})`);
    const xml = await res.text();

    const { code, msg } = parseResultCode(xml);
    // 정상 코드: "00" 또는 "000"
    if (code && !/^0+$/.test(code)) {
      throw new Error(`공공데이터포털 API 오류 [${code}] ${msg} (${lawdCd}/${dealYmd})`);
    }

    all.push(...parseItems(xml, lawdCd));

    const total = parseTotalCount(xml);
    if (all.length >= total || page * PAGE_SIZE >= total) break;
    page += 1;
  }

  return all;
}

/** 당월 포함 과거 N개월의 YYYYMM 목록 (최신순) */
export function recentMonths(n: number, from = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}
