import { FeasibilityInput, SENSITIVITY_DELTAS } from "./feasibility";

/**
 * 약식 사업수지 엑셀 모델 생성.
 * 값이 아니라 수식으로 작성되어, 다운로드 후 엑셀에서 가정(B열)을 바꾸면
 * 산출부와 민감도표가 함께 재계산된다.
 */
export async function buildFeasibilityWorkbook(
  input: FeasibilityInput,
  meta: { productName: string; zoneName: string }
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "LandScope";
  const ws = wb.addWorksheet("사업수지", {
    properties: { defaultRowHeight: 18 },
  });

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 34;
  for (let c = 4; c <= 10; c++) ws.getColumn(c).width = 12;

  const GREEN = "FF065F46"; // emerald-800
  const LIGHT = "FFECFDF5"; // emerald-50
  const NUM = "#,##0";
  const PCT = "0.0%";

  const title = ws.getCell("A1");
  title.value = "LandScope — 약식 사업수지 분석";
  title.font = { bold: true, size: 14, color: { argb: GREEN } };
  ws.getCell("A2").value = `상품: ${meta.productName} · 용도지역: ${meta.zoneName} · 단위: 만원, 평`;
  ws.getCell("A2").font = { size: 9, color: { argb: "FF64748B" } };

  const section = (row: number, label: string) => {
    const c = ws.getCell(row, 1);
    c.value = label;
    c.font = { bold: true, size: 11, color: { argb: GREEN } };
    ws.getRow(row).getCell(1).fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: LIGHT },
    };
  };

  // ── 가정 (Assumptions) ──────────────────────────────
  section(4, "1. 가정 (Assumptions)");
  // [라벨, 값, 표시형식, 비고]
  const assumptions: [string, number, string, string][] = [
    ["대지면적 (평)", input.landAreaPyeong, NUM, ""],
    ["용적률", input.far, PCT, "국토계획법 시행령 상한 기준, 조례 확인 필요"],
    ["분양가능면적 비율", input.salableRatio, PCT, "연면적 대비"],
    ["분양률", input.sellRate, PCT, ""],
    ["토지 매입단가 (만/평)", input.landPricePerPyeong, NUM, "실거래 기반"],
    ["취득부대비율", input.acqCostRatio, "0.00%", "취득세 4% + 농특세 0.2% + 교육세 0.4%"],
    ["공사비 단가 (만/평)", input.constCostPerPyeong, NUM, "연면적 기준"],
    ["설계·감리비율", input.designCostRatio, PCT, "공사비 대비"],
    ["분양단가 (만/평)", input.salePricePerPyeong, NUM, "분양면적 기준"],
    ["판매비율", input.salesCostRatio, PCT, "분양수입 대비 (대행·광고)"],
    ["부담금·인허가비율", input.permitRatio, PCT, "토지비+공사비 대비 개산치"],
    ["예비비율", input.reserveRatio, PCT, "토지비+공사비 대비"],
    ["브릿지 LTV", input.bridgeLtv, PCT, "토지비+취득부대비 대비"],
    ["브릿지 금리 (연)", input.bridgeRate, "0.00%", ""],
    ["브릿지 기간 (개월)", input.bridgeMonths, NUM, "본PF 전환 시 상환 가정"],
    ["본PF 대출비율 (LTC)", input.loanRatio, PCT, "직접사업비 대비"],
    ["본PF 조달금리 (연)", input.interestRate, "0.00%", ""],
    ["평균 인출률", input.drawdownRatio, PCT, "본PF 이자 계산용"],
    ["PF 취급수수료율", input.pfFeeRatio, "0.00%", "대출원금 기준 일시"],
    ["총 사업기간 (개월)", input.periodMonths, NUM, "브릿지 기간 포함"],
  ];
  const A0 = 5; // 첫 가정 행
  assumptions.forEach(([label, value, fmt, note], idx) => {
    const row = A0 + idx;
    ws.getCell(row, 1).value = label;
    const v = ws.getCell(row, 2);
    v.value = value;
    v.numFmt = fmt;
    v.font = { color: { argb: "FF1D4ED8" } }; // 입력셀 = 파란 글씨 (모델링 관례)
    ws.getCell(row, 3).value = note;
    ws.getCell(row, 3).font = { size: 9, color: { argb: "FF94A3B8" } };
  });
  // 가정 셀 참조
  const R = {
    area: `B${A0}`, far: `B${A0 + 1}`, sal: `B${A0 + 2}`, sell: `B${A0 + 3}`,
    lp: `B${A0 + 4}`, acq: `B${A0 + 5}`, cc: `B${A0 + 6}`, dsg: `B${A0 + 7}`,
    sp: `B${A0 + 8}`, sls: `B${A0 + 9}`, pmt: `B${A0 + 10}`, rsv: `B${A0 + 11}`,
    bltv: `B${A0 + 12}`, brt: `B${A0 + 13}`, bm: `B${A0 + 14}`,
    ltc: `B${A0 + 15}`, ir: `B${A0 + 16}`, dd: `B${A0 + 17}`, fee: `B${A0 + 18}`,
    pm: `B${A0 + 19}`,
  };

  // ── 산출 (Pro Forma) — 전부 수식 ────────────────────
  const P0 = A0 + assumptions.length + 2; // 산출 첫 행
  section(P0 - 1, "2. 산출 (Pro Forma)");
  const proforma: [string, string, string][] = [
    ["연면적 (평)", `${R.area}*${R.far}`, NUM],                                     // P0
    ["분양면적 (평)", `B${P0}*${R.sal}`, NUM],                                      // +1
    ["분양수입", `B${P0 + 1}*${R.sp}*${R.sell}`, NUM],                              // +2
    ["토지비", `${R.area}*${R.lp}`, NUM],                                           // +3
    ["취득부대비", `B${P0 + 3}*${R.acq}`, NUM],                                     // +4
    ["공사비", `B${P0}*${R.cc}`, NUM],                                              // +5
    ["설계·감리비", `B${P0 + 5}*${R.dsg}`, NUM],                                    // +6
    ["부담금·인허가비", `(B${P0 + 3}+B${P0 + 5})*${R.pmt}`, NUM],                   // +7
    ["예비비", `(B${P0 + 3}+B${P0 + 5})*${R.rsv}`, NUM],                            // +8
    ["직접사업비 계", `SUM(B${P0 + 3}:B${P0 + 8})`, NUM],                           // +9
    ["판매비", `B${P0 + 2}*${R.sls}`, NUM],                                         // +10
    ["브릿지론 원금", `(B${P0 + 3}+B${P0 + 4})*${R.bltv}`, NUM],                    // +11
    ["브릿지 이자", `B${P0 + 11}*${R.brt}*${R.bm}/12`, NUM],                        // +12
    ["본PF 대출원금", `B${P0 + 9}*${R.ltc}`, NUM],                                  // +13
    ["본PF 이자비용", `B${P0 + 13}*${R.dd}*${R.ir}*MAX(${R.pm}-${R.bm},0)/12`, NUM], // +14
    ["PF 수수료", `B${P0 + 13}*${R.fee}`, NUM],                                     // +15
    ["금융비용 계", `B${P0 + 12}+B${P0 + 14}+B${P0 + 15}`, NUM],                    // +16
    ["총사업비", `B${P0 + 9}+B${P0 + 10}+B${P0 + 16}`, NUM],                        // +17
    ["개발이익 (세전)", `B${P0 + 2}-B${P0 + 17}`, NUM],                             // +18
    ["사업이익률 (÷총사업비)", `B${P0 + 18}/B${P0 + 17}`, PCT],                     // +19
    ["매출액이익률", `B${P0 + 18}/B${P0 + 2}`, PCT],                                // +20
    ["자기자본 (Equity)", `B${P0 + 17}-B${P0 + 13}`, NUM],                          // +21
    ["자기자본수익률", `B${P0 + 18}/B${P0 + 21}`, PCT],                             // +22
    ["연환산 자기자본수익률", `B${P0 + 22}/(${R.pm}/12)`, PCT],                     // +23
    ["Equity Multiple", `(B${P0 + 21}+B${P0 + 18})/B${P0 + 21}`, "0.00\"x\""],      // +24
    ["손익분기 분양률 (BEP)", `(B${P0 + 9}+B${P0 + 16})/(B${P0 + 1}*${R.sp}*(1-${R.sls}))`, PCT], // +25
  ];
  proforma.forEach(([label, formula, fmt], idx) => {
    const row = P0 + idx;
    ws.getCell(row, 1).value = label;
    const v = ws.getCell(row, 2);
    v.value = { formula };
    v.numFmt = fmt;
    if (["직접사업비 계", "금융비용 계", "총사업비", "개발이익 (세전)"].includes(label)) {
      ws.getCell(row, 1).font = { bold: true };
      v.font = { bold: true };
    }
  });

  // ── 민감도 (분양가 × 공사비) — 수식 ─────────────────
  const S0 = P0 + proforma.length + 2;
  section(S0 - 1, "3. 민감도 — 사업이익률 (행: 공사비, 열: 분양가)");
  // 헤더
  SENSITIVITY_DELTAS.forEach((dp, j) => {
    const c = ws.getCell(S0, 2 + j);
    c.value = dp;
    c.numFmt = "+0%;-0%;0%";
    c.font = { bold: true, size: 9 };
    c.alignment = { horizontal: "center" };
  });
  SENSITIVITY_DELTAS.forEach((dc, i) => {
    const rowN = S0 + 1 + i;
    const h = ws.getCell(rowN, 1);
    h.value = dc;
    h.numFmt = "+0%;-0%;0%";
    h.font = { bold: true, size: 9 };
    SENSITIVITY_DELTAS.forEach((_, j) => {
      const dpRef = `${String.fromCharCode(66 + j)}$${S0}`; // B$S0 …
      const dcRef = `$A${rowN}`;
      // 가정 셀 + 변동률 헤더를 참조하는 완전 수식 (가정 변경 시 함께 재계산)
      const rev = `${R.area}*${R.far}*${R.sal}*${R.sp}*(1+${dpRef})*${R.sell}`;
      const land = `${R.area}*${R.lp}`;
      const cons = `${R.area}*${R.far}*${R.cc}*(1+${dcRef})`;
      const direct = `(${land})*(1+${R.acq})+(${cons})*(1+${R.dsg})+((${land})+(${cons}))*(${R.pmt}+${R.rsv})`;
      const bridge = `(${land})*(1+${R.acq})*${R.bltv}*${R.brt}*${R.bm}/12`;
      const pf = `(${direct})*${R.ltc}*(${R.dd}*${R.ir}*MAX(${R.pm}-${R.bm},0)/12+${R.fee})`;
      const total = `(${direct})+(${rev})*${R.sls}+(${bridge})+(${pf})`;
      const cell = ws.getCell(rowN, 2 + j);
      cell.value = { formula: `((${rev})-(${total}))/(${total})` };
      cell.numFmt = PCT;
      cell.alignment = { horizontal: "center" };
    });
  });

  const note = ws.getCell(S0 + SENSITIVITY_DELTAS.length + 2, 1);
  note.value =
    "※ 본 모델은 약식 추정치로 취득세 외 세부 세금·부가세가 반영되지 않았으며, 투자 판단의 근거로 사용될 수 없습니다. 파란 글씨(B열 가정)를 수정하면 산출부와 민감도표가 재계산됩니다.";
  note.font = { size: 9, color: { argb: "FF94A3B8" } };

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
