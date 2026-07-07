/**
 * 간이 사업성(수지) 분석 — PF 초기 검토용 약식 사업수지 계산.
 *
 * 단위 규약:
 * - 면적 입력은 평 단위 (1평 = 3.3058㎡)
 * - 금액 입력은 만원 단위 (평당 단가 포함)
 * - 비율은 0~1 소수 (예: 60% → 0.6)
 */

export const PYEONG_IN_SQM = 3.3058;

export function sqmToPyeong(sqm: number): number {
  return sqm / PYEONG_IN_SQM;
}

/** 용도지역별 법정 상한 (국토계획법 시행령 기준, 지자체 조례로 하향 가능) */
export interface ZoneRule {
  name: string;
  /** 건폐율 상한 */
  bcr: number;
  /** 용적률 상한 */
  far: number;
}

export const ZONE_RULES: ZoneRule[] = [
  { name: "제1종전용주거지역", bcr: 0.5, far: 1.0 },
  { name: "제2종전용주거지역", bcr: 0.5, far: 1.5 },
  { name: "제1종일반주거지역", bcr: 0.6, far: 2.0 },
  { name: "제2종일반주거지역", bcr: 0.6, far: 2.5 },
  { name: "제3종일반주거지역", bcr: 0.5, far: 3.0 },
  { name: "준주거지역", bcr: 0.7, far: 5.0 },
  { name: "중심상업지역", bcr: 0.9, far: 15.0 },
  { name: "일반상업지역", bcr: 0.8, far: 13.0 },
  { name: "근린상업지역", bcr: 0.7, far: 9.0 },
  { name: "유통상업지역", bcr: 0.8, far: 11.0 },
  { name: "전용공업지역", bcr: 0.7, far: 3.0 },
  { name: "일반공업지역", bcr: 0.7, far: 3.5 },
  { name: "준공업지역", bcr: 0.7, far: 4.0 },
  { name: "보전녹지지역", bcr: 0.2, far: 0.8 },
  { name: "생산녹지지역", bcr: 0.2, far: 1.0 },
  { name: "자연녹지지역", bcr: 0.2, far: 1.0 },
  { name: "계획관리지역", bcr: 0.4, far: 1.0 },
  { name: "생산관리지역", bcr: 0.2, far: 0.8 },
  { name: "보전관리지역", bcr: 0.2, far: 0.8 },
  { name: "농림지역", bcr: 0.2, far: 0.8 },
];

/**
 * API가 주는 용도지역 명칭을 ZONE_RULES와 매칭.
 * "계획관리" ↔ "계획관리지역", 공백 등 표기 차이를 흡수한다.
 */
export function findZoneRule(name: string | null | undefined): ZoneRule | null {
  if (!name) return null;
  const n = name.replace(/\s/g, "");
  return (
    ZONE_RULES.find((z) => z.name === n) ??
    ZONE_RULES.find((z) => z.name === `${n}지역`) ??
    ZONE_RULES.find((z) => n.startsWith(z.name.replace(/지역$/, ""))) ??
    null
  );
}

/** 개발 상품 유형별 참고 기본값 (모두 수정 가능한 초기값) */
export interface ProductType {
  name: string;
  /** 평당 건축비 기본값 (만원, 연면적 기준) */
  constCostPerPyeong: number;
  /** 분양가능면적 비율 기본값 */
  salableRatio: number;
  /** 사업기간 기본값 (개월) */
  periodMonths: number;
  /** 기타 사업경비율 기본값 */
  miscCostRatio: number;
  /** 통상 입지 가능한 용도지역 키워드 (경고 표시용, 법적 판단 아님) */
  zoneKeywords: string[];
  note: string;
}

export const PRODUCT_TYPES: ProductType[] = [
  {
    name: "아파트",
    constCostPerPyeong: 750,
    salableRatio: 0.75,
    periodMonths: 36,
    miscCostRatio: 0.12,
    zoneKeywords: ["주거", "준주거"],
    note: "공용면적 비중이 커서 분양가능면적 비율이 낮고, 인허가·분양 일정으로 사업기간이 김",
  },
  {
    name: "오피스텔",
    constCostPerPyeong: 700,
    salableRatio: 0.7,
    periodMonths: 30,
    miscCostRatio: 0.12,
    zoneKeywords: ["상업", "준주거", "준공업"],
    note: "상업지역 고용적률 활용형. 전용률이 낮아 분양가능면적 비율도 낮게 설정",
  },
  {
    name: "지식산업센터",
    constCostPerPyeong: 600,
    salableRatio: 0.8,
    periodMonths: 30,
    miscCostRatio: 0.1,
    zoneKeywords: ["공업", "준공업"],
    note: "공업지역 위주. 기준층 반복 설계로 평당 건축비가 상대적으로 낮음",
  },
  {
    name: "물류센터",
    constCostPerPyeong: 450,
    salableRatio: 0.9,
    periodMonths: 24,
    miscCostRatio: 0.1,
    zoneKeywords: ["공업", "계획관리"],
    note: "계획관리지역 대형 필지형. 층고가 높은 대신 마감이 단순해 평당 건축비 낮음. 매출은 분양이 아닌 통매각 기준으로 해석",
  },
  {
    name: "타운하우스/단독",
    constCostPerPyeong: 800,
    salableRatio: 0.95,
    periodMonths: 18,
    miscCostRatio: 0.08,
    zoneKeywords: ["주거", "계획관리", "녹지"],
    note: "저층 저밀. 연면적 대부분이 분양 대상이라 분양가능면적 비율이 높음",
  },
  {
    name: "근린생활시설",
    constCostPerPyeong: 650,
    salableRatio: 0.75,
    periodMonths: 24,
    miscCostRatio: 0.1,
    zoneKeywords: ["상업", "주거", "계획관리"],
    note: "상가·업무 복합 소규모 개발",
  },
];

export interface FeasibilityInput {
  /** 대지면적 (평) */
  landAreaPyeong: number;
  /** 적용 용적률 (0~1 소수 아님 — 2.5 = 250%) */
  far: number;
  /** 분양가능면적 비율 (연면적 대비 전용+공용 중 분양대상, 통상 0.75~0.85) */
  salableRatio: number;
  /** 평당 토지매입가 (만원) */
  landPricePerPyeong: number;
  /** 평당 건축비 (만원, 연면적 기준) */
  constCostPerPyeong: number;
  /** 평당 분양가 (만원, 분양면적 기준) */
  salePricePerPyeong: number;
  /** 기타 사업경비율 — (토지비+건축비) 대비 % (인허가/설계/판관비 등), 0~1 */
  miscCostRatio: number;
  /** PF 대출비율 (총사업비 대비), 0~1 */
  loanRatio: number;
  /** 연 금리, 0~1 */
  interestRate: number;
  /** 사업기간 (개월) */
  periodMonths: number;
}

export interface FeasibilityResult {
  /** 연면적 (평) */
  grossFloorAreaPyeong: number;
  /** 분양면적 (평) */
  salableAreaPyeong: number;
  /** 총 분양매출 (만원) */
  totalRevenue: number;
  /** 토지비 (만원) */
  landCost: number;
  /** 건축비 (만원) */
  constructionCost: number;
  /** 기타 사업경비 (만원) */
  miscCost: number;
  /** 금융비용 (만원) */
  financeCost: number;
  /** 총사업비 (만원) */
  totalCost: number;
  /** 예상이익 (만원) */
  profit: number;
  /** 마진율 = 이익/총사업비 */
  marginOnCost: number;
  /** 매출액 대비 이익률 */
  marginOnRevenue: number;
  /** 자기자본 (만원) */
  equity: number;
  /** 자기자본수익률 (사업기간 전체 기준) */
  returnOnEquity: number;
}

/**
 * 금융비용은 "직접사업비(토지+건축+기타)의 loanRatio 만큼을 사업기간 평균 50% 인출"
 * 가정의 단순식 대신, 실무 약식 관행대로 대출원금 × 금리 × 기간(년) 전액 부과로 보수적으로 계산.
 */
export function calcFeasibility(input: FeasibilityInput): FeasibilityResult {
  const {
    landAreaPyeong, far, salableRatio,
    landPricePerPyeong, constCostPerPyeong, salePricePerPyeong,
    miscCostRatio, loanRatio, interestRate, periodMonths,
  } = input;

  const grossFloorAreaPyeong = landAreaPyeong * far;
  const salableAreaPyeong = grossFloorAreaPyeong * salableRatio;
  const totalRevenue = salableAreaPyeong * salePricePerPyeong;

  const landCost = landAreaPyeong * landPricePerPyeong;
  const constructionCost = grossFloorAreaPyeong * constCostPerPyeong;
  const directCost = landCost + constructionCost;
  const miscCost = directCost * miscCostRatio;

  const principal = (directCost + miscCost) * loanRatio;
  const financeCost = principal * interestRate * (periodMonths / 12);

  const totalCost = directCost + miscCost + financeCost;
  const profit = totalRevenue - totalCost;
  const equity = totalCost - principal;

  return {
    grossFloorAreaPyeong,
    salableAreaPyeong,
    totalRevenue,
    landCost,
    constructionCost,
    miscCost,
    financeCost,
    totalCost,
    profit,
    marginOnCost: totalCost > 0 ? profit / totalCost : 0,
    marginOnRevenue: totalRevenue > 0 ? profit / totalRevenue : 0,
    equity,
    returnOnEquity: equity > 0 ? profit / equity : 0,
  };
}
