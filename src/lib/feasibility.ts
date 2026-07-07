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
