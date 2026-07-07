/**
 * 약식 사업수지 분석 — PF 초기 검토용 수지 모델.
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
  /** 판매비율 기본값 (분양수입 대비) */
  salesCostRatio: number;
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
    salesCostRatio: 0.04,
    zoneKeywords: ["주거", "준주거"],
    note: "공용면적 비중이 커서 분양가능면적 비율이 낮고, 인허가·분양 일정으로 사업기간이 김",
  },
  {
    name: "오피스텔",
    constCostPerPyeong: 700,
    salableRatio: 0.7,
    periodMonths: 30,
    salesCostRatio: 0.05,
    zoneKeywords: ["상업", "준주거", "준공업"],
    note: "상업지역 고용적률 활용형. 전용률이 낮아 분양가능면적 비율도 낮게 설정",
  },
  {
    name: "지식산업센터",
    constCostPerPyeong: 600,
    salableRatio: 0.8,
    periodMonths: 30,
    salesCostRatio: 0.05,
    zoneKeywords: ["공업", "준공업"],
    note: "공업지역 위주. 기준층 반복 설계로 평당 건축비가 상대적으로 낮음",
  },
  {
    name: "물류센터",
    constCostPerPyeong: 450,
    salableRatio: 0.9,
    periodMonths: 24,
    salesCostRatio: 0.02,
    zoneKeywords: ["공업", "계획관리"],
    note: "계획관리지역 대형 필지형. 마감이 단순해 평당 건축비 낮음. 매출은 준공 후 통매각 기준으로 해석",
  },
  {
    name: "타운하우스/단독",
    constCostPerPyeong: 800,
    salableRatio: 0.95,
    periodMonths: 18,
    salesCostRatio: 0.04,
    zoneKeywords: ["주거", "계획관리", "녹지"],
    note: "저층 저밀. 연면적 대부분이 분양 대상이라 분양가능면적 비율이 높음",
  },
  {
    name: "근린생활시설",
    constCostPerPyeong: 650,
    salableRatio: 0.75,
    periodMonths: 24,
    salesCostRatio: 0.05,
    zoneKeywords: ["상업", "주거", "계획관리"],
    note: "상가·업무 복합 소규모 개발",
  },
];

export interface FeasibilityInput {
  /** 대지면적 (평) */
  landAreaPyeong: number;
  /** 적용 용적률 (2.5 = 250%) */
  far: number;
  /** 분양가능면적 비율 (연면적 대비) */
  salableRatio: number;
  /** 분양률 가정 */
  sellRate: number;
  /** 평당 토지매입가 (만원) */
  landPricePerPyeong: number;
  /** 취득부대비율 — 취득세 등 (토지비 대비, 통상 4.6%) */
  acqCostRatio: number;
  /** 평당 공사비 (만원, 연면적 기준) */
  constCostPerPyeong: number;
  /** 설계·감리비율 (공사비 대비) */
  designCostRatio: number;
  /** 평당 분양가 (만원, 분양면적 기준) */
  salePricePerPyeong: number;
  /** 판매비율 — 분양대행·광고 등 (분양수입 대비) */
  salesCostRatio: number;
  /** 부담금·인허가비율 — 학교용지·광역교통 부담금 등 (토지비+공사비 대비) */
  permitRatio: number;
  /** 예비비율 (토지비+공사비 대비) */
  reserveRatio: number;
  /** 브릿지 LTV — 토지비+취득부대비 대비 브릿지론 조달 비중 */
  bridgeLtv: number;
  /** 브릿지 금리 (연) */
  bridgeRate: number;
  /** 브릿지 기간 (개월) — 토지 매입~본PF 전환 */
  bridgeMonths: number;
  /** 본PF 대출비율 LTC (직접사업비 대비) */
  loanRatio: number;
  /** 본PF 조달금리 (연) */
  interestRate: number;
  /** PF 취급수수료율 (대출원금 대비) */
  pfFeeRatio: number;
  /** 평균 인출률 — 본PF 이자 계산 시 대출원금 중 평균 사용 비중 */
  drawdownRatio: number;
  /** 총 사업기간 (개월, 브릿지 기간 포함) */
  periodMonths: number;
}

export const DEFAULT_INPUT_RATIOS = {
  sellRate: 1.0,
  acqCostRatio: 0.046,
  designCostRatio: 0.05,
  salesCostRatio: 0.04,
  permitRatio: 0.03,
  reserveRatio: 0.02,
  bridgeLtv: 0.7,
  bridgeRate: 0.09,
  bridgeMonths: 9,
  pfFeeRatio: 0.015,
  drawdownRatio: 0.6,
} as const;

export interface FeasibilityResult {
  /** 연면적 (평) */
  grossFloorAreaPyeong: number;
  /** 분양면적 (평) */
  salableAreaPyeong: number;
  /** 분양수입 (만원) */
  totalRevenue: number;
  /** 토지비 (만원) */
  landCost: number;
  /** 취득부대비 (만원) */
  acqCost: number;
  /** 공사비 (만원) */
  constructionCost: number;
  /** 설계·감리비 (만원) */
  designCost: number;
  /** 부담금·인허가비 (만원) */
  permitCost: number;
  /** 예비비 (만원) */
  reserveCost: number;
  /** 직접사업비 합계 (만원) */
  directCost: number;
  /** 판매비 (만원) */
  salesCost: number;
  /** 브릿지론 원금 (만원) */
  bridgePrincipal: number;
  /** 브릿지 이자 (만원) */
  bridgeInterest: number;
  /** 본PF 대출원금 (만원) */
  loanPrincipal: number;
  /** 본PF 이자비용 (만원) */
  interestCost: number;
  /** PF 수수료 (만원) */
  pfFee: number;
  /** 금융비용 합계 (만원) */
  financeCost: number;
  /** 총사업비 (만원) */
  totalCost: number;
  /** 개발이익 (만원, 세전) */
  profit: number;
  /** 사업이익률 = 이익/총사업비 */
  marginOnCost: number;
  /** 매출액이익률 */
  marginOnRevenue: number;
  /** 자기자본 (만원) */
  equity: number;
  /** 자기자본수익률 (사업기간 전체) */
  returnOnEquity: number;
  /** 연환산 자기자본수익률 */
  annualizedRoe: number;
  /** Equity Multiple = (자기자본+이익) / 자기자본 */
  equityMultiple: number;
  /** 손익분기 분양률 — 총원가를 회수하는 최소 분양률 */
  bepSellRate: number;
}

/**
 * 수지 계산.
 * - 브릿지론(토지비+취득부대비 × LTV)으로 토지 선조달 후 본PF 전환 상환 가정
 * - 본PF 대출원금은 직접사업비 × LTC — 순환참조 없는 통상 약식 구조
 * - 본PF 이자는 원금 × 평균 인출률 × 금리 × (사업기간-브릿지기간)
 * - BEP 분양률: 분양수입×(1-판매비율) = 직접사업비+금융비용 이 되는 분양률
 */
export function calcFeasibility(i: FeasibilityInput): FeasibilityResult {
  const grossFloorAreaPyeong = i.landAreaPyeong * i.far;
  const salableAreaPyeong = grossFloorAreaPyeong * i.salableRatio;
  const totalRevenue = salableAreaPyeong * i.salePricePerPyeong * i.sellRate;

  const landCost = i.landAreaPyeong * i.landPricePerPyeong;
  const acqCost = landCost * i.acqCostRatio;
  const constructionCost = grossFloorAreaPyeong * i.constCostPerPyeong;
  const designCost = constructionCost * i.designCostRatio;
  const permitCost = (landCost + constructionCost) * i.permitRatio;
  const reserveCost = (landCost + constructionCost) * i.reserveRatio;
  const directCost =
    landCost + acqCost + constructionCost + designCost + permitCost + reserveCost;

  const salesCost = totalRevenue * i.salesCostRatio;

  const bridgePrincipal = (landCost + acqCost) * i.bridgeLtv;
  const bridgeInterest = bridgePrincipal * i.bridgeRate * (i.bridgeMonths / 12);

  const pfMonths = Math.max(i.periodMonths - i.bridgeMonths, 0);
  const loanPrincipal = directCost * i.loanRatio;
  const interestCost = loanPrincipal * i.drawdownRatio * i.interestRate * (pfMonths / 12);
  const pfFee = loanPrincipal * i.pfFeeRatio;
  const financeCost = bridgeInterest + interestCost + pfFee;

  const totalCost = directCost + salesCost + financeCost;
  const profit = totalRevenue - totalCost;
  const equity = totalCost - loanPrincipal;
  const years = i.periodMonths / 12;

  const grossSaleValue = salableAreaPyeong * i.salePricePerPyeong;
  const bepSellRate =
    grossSaleValue > 0
      ? (directCost + financeCost) / (grossSaleValue * (1 - i.salesCostRatio))
      : 0;

  return {
    grossFloorAreaPyeong,
    salableAreaPyeong,
    totalRevenue,
    landCost,
    acqCost,
    constructionCost,
    designCost,
    permitCost,
    reserveCost,
    directCost,
    salesCost,
    bridgePrincipal,
    bridgeInterest,
    loanPrincipal,
    interestCost,
    pfFee,
    financeCost,
    totalCost,
    profit,
    marginOnCost: totalCost > 0 ? profit / totalCost : 0,
    marginOnRevenue: totalRevenue > 0 ? profit / totalRevenue : 0,
    equity,
    returnOnEquity: equity > 0 ? profit / equity : 0,
    annualizedRoe: equity > 0 && years > 0 ? profit / equity / years : 0,
    equityMultiple: equity > 0 ? (equity + profit) / equity : 0,
    bepSellRate,
  };
}

/** 민감도 분석에 쓰는 변동폭 (분양가·공사비 공통) */
export const SENSITIVITY_DELTAS = [-0.1, -0.05, 0, 0.05, 0.1] as const;

/**
 * 분양가 × 공사비 민감도 매트릭스.
 * 행 = 공사비 변동, 열 = 분양가 변동, 값 = 사업이익률.
 */
export function sensitivityMatrix(base: FeasibilityInput): number[][] {
  return SENSITIVITY_DELTAS.map((dc) =>
    SENSITIVITY_DELTAS.map((dp) => {
      const r = calcFeasibility({
        ...base,
        salePricePerPyeong: base.salePricePerPyeong * (1 + dp),
        constCostPerPyeong: base.constCostPerPyeong * (1 + dc),
      });
      return r.marginOnCost;
    })
  );
}
