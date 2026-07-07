import { FeasibilityInput, SENSITIVITY_DELTAS } from "./feasibility";

/**
 * 약식 사업수지 엑셀 모델 생성 — 현업 재무모델 컨벤션 적용.
 * - 파란 글씨 = 입력(가정) 셀, 검정 = 수식 셀
 * - 값이 아닌 수식으로 작성되어 가정(D열)을 바꾸면 전체가 재계산됨
 * - 소계 상단 괘선, 합계 이중 괘선, 음수 빨간 괄호, 민감도 3색 스케일
 */
export async function buildFeasibilityWorkbook(
  input: FeasibilityInput,
  meta: { productName: string; zoneName: string }
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "LandScope";
  const ws = wb.addWorksheet("Model", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 3 }],
    properties: { defaultRowHeight: 17 },
  });

  // 팔레트
  const DARK = "FF064E3B"; // emerald-900 — 타이틀 밴드
  const ACCENT = "FF047857"; // emerald-700 — 섹션 제목
  const HEAD = "FFECFDF5"; // emerald-50 — 표 헤더 배경
  const GRAY = "FF94A3B8";
  const INPUT_BLUE = "FF1F4E9C"; // 재무모델 입력셀 관례색

  // 표시형식
  const NUM = "#,##0;[Red](#,##0)";
  const PCT = "0.0%;[Red](0.0%)";
  const PCT2 = "0.00%";
  const MULT = '0.00"x"';

  // 컬럼: A 여백 | B 항목 | C 단위 | D 값 | E~H 비고/민감도
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 9;
  for (let c = 4; c <= 8; c++) ws.getColumn(c).width = 13.5;
  ws.getColumn(5).width = 13.5;

  const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  const medium = { style: "medium" as const, color: { argb: ACCENT } };

  // ── 타이틀 밴드 ─────────────────────────────────────
  ws.mergeCells("B1:H1");
  const t = ws.getCell("B1");
  t.value = "LANDSCOPE  |  PROJECT FEASIBILITY MODEL";
  t.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t.alignment = { vertical: "middle" };
  ws.getRow(1).height = 26;

  ws.mergeCells("B2:H2");
  const st = ws.getCell("B2");
  st.value = `${meta.productName} 개발사업 약식 사업수지  ·  용도지역: ${meta.zoneName}  ·  기준일: ${new Date().toISOString().slice(0, 10)}  ·  단위: 만원, 평`;
  st.font = { size: 9, color: { argb: "FFA7F3D0" } };
  st.alignment = { vertical: "middle" };
  ws.getRow(2).height = 16;

  for (const row of [1, 2]) {
    for (let c = 2; c <= 8; c++) {
      ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
    }
  }

  const section = (row: number, label: string) => {
    const c = ws.getCell(row, 2);
    c.value = label;
    c.font = { bold: true, size: 10, color: { argb: ACCENT } };
    for (let col = 2; col <= 8; col++) {
      ws.getCell(row, col).border = { bottom: medium };
    }
    ws.getRow(row).height = 20;
  };

  // ── 1. 가정 ─────────────────────────────────────────
  section(4, "1. ASSUMPTIONS  |  가정");
  // [라벨, 값, 단위, 표시형식, 비고]
  const assumptions: [string, number, string, string, string][] = [
    ["대지면적", input.landAreaPyeong, "평", NUM, ""],
    ["용적률", input.far, "%", PCT, "국토계획법 시행령 상한, 조례 확인 필요"],
    ["분양가능면적 비율", input.salableRatio, "%", PCT, "연면적 대비"],
    ["분양률", input.sellRate, "%", PCT, ""],
    ["토지 매입단가", input.landPricePerPyeong, "만/평", NUM, "실거래 기반"],
    ["취득부대비율", input.acqCostRatio, "%", PCT2, "취득세 4.0% + 농특세 0.2% + 교육세 0.4%"],
    ["공사비 단가", input.constCostPerPyeong, "만/평", NUM, "연면적 기준"],
    ["설계·감리비율", input.designCostRatio, "%", PCT, "공사비 대비"],
    ["분양단가", input.salePricePerPyeong, "만/평", NUM, "분양면적 기준"],
    ["판매비율", input.salesCostRatio, "%", PCT, "분양수입 대비 (분양대행·광고)"],
    ["부담금·인허가비율", input.permitRatio, "%", PCT, "토지비+공사비 대비 개산치"],
    ["예비비율", input.reserveRatio, "%", PCT, "토지비+공사비 대비"],
    ["브릿지 LTV", input.bridgeLtv, "%", PCT, "토지비+취득부대비 대비"],
    ["브릿지 금리", input.bridgeRate, "%/년", PCT2, ""],
    ["브릿지 기간", input.bridgeMonths, "개월", NUM, "본PF 기표 시 상환 가정"],
    ["본PF 대출비율 (LTC)", input.loanRatio, "%", PCT, "직접사업비 대비"],
    ["본PF 조달금리", input.interestRate, "%/년", PCT2, ""],
    ["평균 인출률", input.drawdownRatio, "%", PCT, "본PF 이자 계산용"],
    ["PF 취급수수료율", input.pfFeeRatio, "%", PCT2, "대출원금 기준 일시"],
    ["총 사업기간", input.periodMonths, "개월", NUM, "브릿지 기간 포함"],
  ];
  const A0 = 5;
  assumptions.forEach(([label, value, unit, fmt, note], idx) => {
    const row = A0 + idx;
    ws.getCell(row, 2).value = label;
    ws.getCell(row, 2).font = { size: 10 };
    ws.getCell(row, 3).value = unit;
    ws.getCell(row, 3).font = { size: 9, color: { argb: GRAY } };
    ws.getCell(row, 3).alignment = { horizontal: "center" };
    const v = ws.getCell(row, 4);
    v.value = value;
    v.numFmt = fmt;
    v.font = { size: 10, color: { argb: INPUT_BLUE } };
    v.border = { bottom: thin };
    v.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    ws.mergeCells(row, 5, row, 8);
    ws.getCell(row, 5).value = note;
    ws.getCell(row, 5).font = { size: 8, color: { argb: GRAY } };
    ws.getCell(row, 5).alignment = { vertical: "middle" };
  });
  // 가정 셀 참조 (D열)
  const R = {
    area: `D${A0}`, far: `D${A0 + 1}`, sal: `D${A0 + 2}`, sell: `D${A0 + 3}`,
    lp: `D${A0 + 4}`, acq: `D${A0 + 5}`, cc: `D${A0 + 6}`, dsg: `D${A0 + 7}`,
    sp: `D${A0 + 8}`, sls: `D${A0 + 9}`, pmt: `D${A0 + 10}`, rsv: `D${A0 + 11}`,
    bltv: `D${A0 + 12}`, brt: `D${A0 + 13}`, bm: `D${A0 + 14}`,
    ltc: `D${A0 + 15}`, ir: `D${A0 + 16}`, dd: `D${A0 + 17}`, fee: `D${A0 + 18}`,
    pm: `D${A0 + 19}`,
  };

  // ── 2. 사업수지 ─────────────────────────────────────
  const P0 = A0 + assumptions.length + 2; // 27
  section(P0 - 1, "2. PRO FORMA  |  사업수지");
  // [라벨, 수식, 단위, 표시형식, 스타일(sub=소계, total=합계, kpi=지표)]
  const proforma: [string, string, string, string, string][] = [
    ["연면적", `${R.area}*${R.far}`, "평", NUM, ""],                                        // P0
    ["분양면적", `D${P0}*${R.sal}`, "평", NUM, ""],                                         // +1
    ["분양수입 (Gross Revenue)", `D${P0 + 1}*${R.sp}*${R.sell}`, "만원", NUM, "total"],     // +2
    ["토지비", `${R.area}*${R.lp}`, "만원", NUM, ""],                                       // +3
    ["취득부대비", `D${P0 + 3}*${R.acq}`, "만원", NUM, ""],                                 // +4
    ["공사비", `D${P0}*${R.cc}`, "만원", NUM, ""],                                          // +5
    ["설계·감리비", `D${P0 + 5}*${R.dsg}`, "만원", NUM, ""],                                // +6
    ["부담금·인허가비", `(D${P0 + 3}+D${P0 + 5})*${R.pmt}`, "만원", NUM, ""],               // +7
    ["예비비", `(D${P0 + 3}+D${P0 + 5})*${R.rsv}`, "만원", NUM, ""],                        // +8
    ["직접사업비 계", `SUM(D${P0 + 3}:D${P0 + 8})`, "만원", NUM, "sub"],                    // +9
    ["판매비", `D${P0 + 2}*${R.sls}`, "만원", NUM, ""],                                     // +10
    ["브릿지론 원금", `(D${P0 + 3}+D${P0 + 4})*${R.bltv}`, "만원", NUM, ""],                // +11
    ["브릿지 이자", `D${P0 + 11}*${R.brt}*${R.bm}/12`, "만원", NUM, ""],                    // +12
    ["본PF 대출원금", `D${P0 + 9}*${R.ltc}`, "만원", NUM, ""],                              // +13
    ["본PF 이자비용", `D${P0 + 13}*${R.dd}*${R.ir}*MAX(${R.pm}-${R.bm},0)/12`, "만원", NUM, ""], // +14
    ["PF 취급수수료", `D${P0 + 13}*${R.fee}`, "만원", NUM, ""],                             // +15
    ["금융비용 계", `D${P0 + 12}+D${P0 + 14}+D${P0 + 15}`, "만원", NUM, "sub"],             // +16
    ["총사업비 (Total Cost)", `D${P0 + 9}+D${P0 + 10}+D${P0 + 16}`, "만원", NUM, "total"],  // +17
    ["개발이익 (세전)", `D${P0 + 2}-D${P0 + 17}`, "만원", NUM, "total"],                    // +18
    ["사업이익률 (÷총사업비)", `D${P0 + 18}/D${P0 + 17}`, "%", PCT, "kpi"],                 // +19
    ["매출액이익률", `D${P0 + 18}/D${P0 + 2}`, "%", PCT, "kpi"],                            // +20
    ["자기자본 (Equity)", `D${P0 + 17}-D${P0 + 13}`, "만원", NUM, ""],                      // +21
    ["자기자본수익률 (ROE)", `D${P0 + 18}/D${P0 + 21}`, "%", PCT, "kpi"],                   // +22
    ["연환산 ROE", `D${P0 + 22}/(${R.pm}/12)`, "%", PCT, "kpi"],                            // +23
    ["Equity Multiple", `(D${P0 + 21}+D${P0 + 18})/D${P0 + 21}`, "배", MULT, "kpi"],        // +24
    ["손익분기 분양률 (BEP)", `(D${P0 + 9}+D${P0 + 16})/(D${P0 + 1}*${R.sp}*(1-${R.sls}))`, "%", PCT, "kpi"], // +25
  ];
  proforma.forEach(([label, formula, unit, fmt, style], idx) => {
    const row = P0 + idx;
    const l = ws.getCell(row, 2);
    l.value = style === "" ? `  ${label}` : label;
    l.font = { size: 10, bold: style === "sub" || style === "total" };
    ws.getCell(row, 3).value = unit;
    ws.getCell(row, 3).font = { size: 9, color: { argb: GRAY } };
    ws.getCell(row, 3).alignment = { horizontal: "center" };
    const v = ws.getCell(row, 4);
    v.value = { formula };
    v.numFmt = fmt;
    v.font = { size: 10, bold: style !== "" };
    if (style === "sub") {
      v.border = { top: thin };
      l.border = { top: thin };
    }
    if (style === "total") {
      v.border = { top: thin, bottom: { style: "double", color: { argb: ACCENT } } };
      for (let c = 2; c <= 4; c++) {
        ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
      }
    }
  });

  // ── 3. 민감도 ───────────────────────────────────────
  const S0 = P0 + proforma.length + 2; // 헤더 행
  section(S0 - 1, "3. SENSITIVITY  |  민감도 분석 — 사업이익률");
  const corner = ws.getCell(S0, 3);
  corner.value = "공사비＼분양가";
  corner.font = { size: 8, bold: true, color: { argb: GRAY } };
  corner.alignment = { horizontal: "center", vertical: "middle" };
  SENSITIVITY_DELTAS.forEach((dp, j) => {
    const c = ws.getCell(S0, 4 + j);
    c.value = dp;
    c.numFmt = "+0%;-0%;0%";
    c.font = { bold: true, size: 9 };
    c.alignment = { horizontal: "center" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
    c.border = { bottom: thin };
  });
  SENSITIVITY_DELTAS.forEach((dc, i) => {
    const rowN = S0 + 1 + i;
    const h = ws.getCell(rowN, 3);
    h.value = dc;
    h.numFmt = "+0%;-0%;0%";
    h.font = { bold: true, size: 9 };
    h.alignment = { horizontal: "center" };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
    h.border = { right: thin };
    SENSITIVITY_DELTAS.forEach((_, j) => {
      const dpRef = `${String.fromCharCode(68 + j)}$${S0}`; // D$S0 …
      const dcRef = `$C${rowN}`;
      // 가정 셀 + 변동률 헤더를 참조하는 완전 수식 (가정 변경 시 함께 재계산)
      const rev = `${R.area}*${R.far}*${R.sal}*${R.sp}*(1+${dpRef})*${R.sell}`;
      const land = `${R.area}*${R.lp}`;
      const cons = `${R.area}*${R.far}*${R.cc}*(1+${dcRef})`;
      const direct = `(${land})*(1+${R.acq})+(${cons})*(1+${R.dsg})+((${land})+(${cons}))*(${R.pmt}+${R.rsv})`;
      const bridge = `(${land})*(1+${R.acq})*${R.bltv}*${R.brt}*${R.bm}/12`;
      const pf = `(${direct})*${R.ltc}*(${R.dd}*${R.ir}*MAX(${R.pm}-${R.bm},0)/12+${R.fee})`;
      const total = `(${direct})+(${rev})*${R.sls}+(${bridge})+(${pf})`;
      const cell = ws.getCell(rowN, 4 + j);
      cell.value = { formula: `((${rev})-(${total}))/(${total})` };
      cell.numFmt = PCT;
      cell.font = { size: 9 };
      cell.alignment = { horizontal: "center" };
    });
  });
  // 3색 스케일 (적자 → 손익분기권 → 목표 이익률)
  const gridRef = `D${S0 + 1}:H${S0 + SENSITIVITY_DELTAS.length}`;
  ws.addConditionalFormatting({
    ref: gridRef,
    rules: [
      {
        type: "colorScale",
        priority: 1,
        cfvo: [
          { type: "num", value: 0 },
          { type: "num", value: 0.1 },
          { type: "num", value: 0.2 },
        ],
        color: [{ argb: "FFF8696B" }, { argb: "FFFFEB84" }, { argb: "FF63BE7B" }],
      },
    ],
  });

  // ── 주석 ────────────────────────────────────────────
  const noteRow = S0 + SENSITIVITY_DELTAS.length + 2;
  ws.mergeCells(noteRow, 2, noteRow, 8);
  const note = ws.getCell(noteRow, 2);
  note.value =
    "※ 파란 글씨(D열 가정)를 수정하면 산출부·민감도표가 재계산됩니다. 본 모델은 약식 추정치로 취득세 외 세부 세금·부가세가 미반영되어 있으며, 투자 판단의 근거로 사용될 수 없습니다.";
  note.font = { size: 8, color: { argb: GRAY } };

  return wb;
}

/** 브라우저에서 워크북 생성 후 다운로드 트리거 */
export async function downloadFeasibilityExcel(
  input: FeasibilityInput,
  meta: { productName: string; zoneName: string }
) {
  const wb = await buildFeasibilityWorkbook(input, meta);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LandScope_사업수지_${meta.productName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
