"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ZONE_RULES,
  PRODUCT_TYPES,
  DEFAULT_INPUT_RATIOS,
  SENSITIVITY_DELTAS,
  findZoneRule,
  calcFeasibility,
  sensitivityMatrix,
  FeasibilityInput,
} from "@/lib/feasibility";
import { downloadFeasibilityExcel } from "@/lib/excel";

function fmtManwon(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v).toLocaleString()}만`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

const inputCls =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-emerald-500";
const labelCls = "text-[11px] font-medium text-slate-500";
const sectionCls = "text-[11px] font-semibold tracking-[0.15em] text-emerald-700";

function NumField({
  label, value, onChange, suffix, step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className={`${inputCls} num`}
          value={Number.isFinite(value) ? value : ""}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="shrink-0 text-[11px] text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

function sensitivityColor(m: number): string {
  if (m >= 0.1) return "bg-emerald-50 text-emerald-800";
  if (m >= 0.05) return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-700";
}

function CalculatorInner() {
  const sp = useSearchParams();
  // API 용도지역 명칭("계획관리" 등)과 법정 명칭("계획관리지역")의 표기 차이를 흡수해 매칭
  const initialZone = findZoneRule(sp.get("zone"));
  const initialProduct = PRODUCT_TYPES[0];

  const [zoneName, setZoneName] = useState(initialZone?.name ?? "계획관리지역");
  const zone = ZONE_RULES.find((z) => z.name === zoneName)!;
  const [productName, setProductName] = useState(initialProduct.name);
  const product = PRODUCT_TYPES.find((p) => p.name === productName)!;
  const [downloading, setDownloading] = useState(false);

  const [input, setInput] = useState<FeasibilityInput>({
    landAreaPyeong: Number(sp.get("area")) || 500,
    far: (initialZone ?? ZONE_RULES.find((z) => z.name === "계획관리지역")!).far,
    salableRatio: initialProduct.salableRatio,
    landPricePerPyeong: Number(sp.get("landPrice")) || 300,
    constCostPerPyeong: initialProduct.constCostPerPyeong,
    salePricePerPyeong: 1300,
    salesCostRatio: initialProduct.salesCostRatio,
    periodMonths: initialProduct.periodMonths,
    loanRatio: 0.6,
    interestRate: 0.065,
    sellRate: DEFAULT_INPUT_RATIOS.sellRate,
    acqCostRatio: DEFAULT_INPUT_RATIOS.acqCostRatio,
    designCostRatio: DEFAULT_INPUT_RATIOS.designCostRatio,
    reserveRatio: DEFAULT_INPUT_RATIOS.reserveRatio,
    pfFeeRatio: DEFAULT_INPUT_RATIOS.pfFeeRatio,
    drawdownRatio: DEFAULT_INPUT_RATIOS.drawdownRatio,
  });

  // 상품-용도지역 통상 입지 불일치 경고 (법적 판단이 아닌 참고용)
  const zoneMismatch = !product.zoneKeywords.some((k) => zoneName.includes(k));

  const set = <K extends keyof FeasibilityInput>(k: K, v: FeasibilityInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));

  const r = useMemo(() => calcFeasibility(input), [input]);
  const sens = useMemo(() => sensitivityMatrix(input), [input]);

  const costParts = [
    { name: "토지비·취득", value: r.landCost + r.acqCost, color: "bg-emerald-900" },
    { name: "공사비·설계", value: r.constructionCost + r.designCost, color: "bg-emerald-600" },
    { name: "예비비·판매비", value: r.reserveCost + r.salesCost, color: "bg-emerald-300" },
    { name: "금융비용", value: r.financeCost, color: "bg-amber-500" },
  ];

  const handleExcel = async () => {
    setDownloading(true);
    try {
      await downloadFeasibilityExcel(input, { productName, zoneName });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={sectionCls}>FEASIBILITY STUDY</p>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">약식 사업수지 분석</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">
            개발사업 초기 검토 단계의 약식 수지 모델입니다. 용도지역 선택 시 국토계획법
            시행령상 상한 건폐율·용적률이 기본 적용되며, 실제 적용치는 지자체 조례에 따라
            하향될 수 있습니다. 금액 단위: 만원.
          </p>
        </div>
        <button
          onClick={handleExcel}
          disabled={downloading}
          className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
        >
          {downloading ? "생성 중…" : "↓ 엑셀 모델 다운로드"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        {/* 입력 */}
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <h2 className={sectionCls}>PRODUCT</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span className={labelCls}>개발 상품 (선택 시 공사비·분양비율·판매비율·사업기간 기준값 적용)</span>
              <select
                className={inputCls}
                value={productName}
                onChange={(e) => {
                  const p = PRODUCT_TYPES.find((x) => x.name === e.target.value)!;
                  setProductName(p.name);
                  setInput((prev) => ({
                    ...prev,
                    constCostPerPyeong: p.constCostPerPyeong,
                    salableRatio: p.salableRatio,
                    salesCostRatio: p.salesCostRatio,
                    periodMonths: p.periodMonths,
                  }));
                }}
              >
                {PRODUCT_TYPES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            <p className="text-[12px] leading-relaxed text-slate-400">{product.note}</p>
            {zoneMismatch && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                {productName}은(는) 통상 {product.zoneKeywords.join("·")} 계열 용도지역에서
                검토되는 상품입니다. 현재 선택된 &lsquo;{zoneName}&rsquo;에서는 건축이
                제한되거나 별도 인허가 검토가 필요할 수 있습니다.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className={sectionCls}>LAND &amp; BUILDING</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span className={labelCls}>용도지역</span>
              <select
                className={inputCls}
                value={zoneName}
                onChange={(e) => {
                  const z = ZONE_RULES.find((x) => x.name === e.target.value)!;
                  setZoneName(z.name);
                  set("far", z.far);
                }}
              >
                {ZONE_RULES.map((z) => (
                  <option key={z.name} value={z.name}>
                    {z.name} (건폐율 {z.bcr * 100}% / 용적률 {z.far * 100}%)
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="대지면적" value={input.landAreaPyeong} onChange={(v) => set("landAreaPyeong", v)} suffix="평" />
              <NumField label="적용 용적률" value={input.far * 100} onChange={(v) => set("far", v / 100)} suffix="%" step={10} />
              <NumField label="분양가능면적 비율" value={input.salableRatio * 100} onChange={(v) => set("salableRatio", v / 100)} suffix="%" step={5} />
              <NumField label="분양률" value={input.sellRate * 100} onChange={(v) => set("sellRate", v / 100)} suffix="%" step={5} />
              <NumField label="토지 매입단가" value={input.landPricePerPyeong} onChange={(v) => set("landPricePerPyeong", v)} suffix="만/평" step={10} />
              <NumField label="취득부대비율 (토지비 대비)" value={input.acqCostRatio * 100} onChange={(v) => set("acqCostRatio", v / 100)} suffix="%" step={0.1} />
              <NumField label="공사비 (연면적 기준)" value={input.constCostPerPyeong} onChange={(v) => set("constCostPerPyeong", v)} suffix="만/평" step={10} />
              <NumField label="설계·감리비율 (공사비 대비)" value={input.designCostRatio * 100} onChange={(v) => set("designCostRatio", v / 100)} suffix="%" />
              <NumField label="분양단가 (분양면적 기준)" value={input.salePricePerPyeong} onChange={(v) => set("salePricePerPyeong", v)} suffix="만/평" step={10} />
              <NumField label="판매비율 (분양수입 대비)" value={input.salesCostRatio * 100} onChange={(v) => set("salesCostRatio", v / 100)} suffix="%" />
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className={sectionCls}>COST &amp; FINANCING</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="예비비율 (토지+공사 대비)" value={input.reserveRatio * 100} onChange={(v) => set("reserveRatio", v / 100)} suffix="%" />
              <NumField label="대출비율 (LTC)" value={input.loanRatio * 100} onChange={(v) => set("loanRatio", v / 100)} suffix="%" step={5} />
              <NumField label="조달금리 (연)" value={input.interestRate * 100} onChange={(v) => set("interestRate", v / 100)} suffix="%" step={0.1} />
              <NumField label="평균 인출률" value={input.drawdownRatio * 100} onChange={(v) => set("drawdownRatio", v / 100)} suffix="%" step={5} />
              <NumField label="PF 취급수수료율" value={input.pfFeeRatio * 100} onChange={(v) => set("pfFeeRatio", v / 100)} suffix="%" step={0.1} />
              <NumField label="사업기간" value={input.periodMonths} onChange={(v) => set("periodMonths", v)} suffix="개월" />
            </div>
            <p className="text-[12px] leading-relaxed text-slate-400">
              건폐율({zone.bcr * 100}%)은 배치·층수 검토용 참고값이며 수지에는 용적률만
              반영됩니다. 대출원금은 직접사업비 × LTC로 산정하고, 이자는 평균 인출률을
              반영해 계산합니다.
            </p>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-[11px] text-slate-500">개발이익 (세전)</div>
              <div className={`num mt-1 text-[18px] font-bold ${r.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {fmtManwon(r.profit)}원
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-[11px] text-slate-500">사업이익률</div>
              <div className={`num mt-1 text-[18px] font-bold ${r.marginOnCost >= 0.1 ? "text-slate-900" : "text-red-600"}`}>
                {pct(r.marginOnCost)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-[11px] text-slate-500">자기자본수익률</div>
              <div className="num mt-1 text-[18px] font-bold text-slate-900">{pct(r.returnOnEquity)}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-[11px] text-slate-500">연환산 ROE</div>
              <div className="num mt-1 text-[18px] font-bold text-slate-900">{pct(r.annualizedRoe)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className={sectionCls}>PRO FORMA</h2>
            <table className="mt-3 w-full text-[13px]">
              <tbody>
                {[
                  ["연면적", `${r.grossFloorAreaPyeong.toFixed(0)}평 (대지 ${input.landAreaPyeong}평 × ${(input.far * 100).toFixed(0)}%)`, false],
                  ["분양면적 · 분양률", `${r.salableAreaPyeong.toFixed(0)}평 · ${pct(input.sellRate)}`, false],
                  ["분양수입", `${fmtManwon(r.totalRevenue)}원`, true],
                  ["토지비", `${fmtManwon(r.landCost)}원`, false],
                  ["취득부대비", `${fmtManwon(r.acqCost)}원`, false],
                  ["공사비", `${fmtManwon(r.constructionCost)}원`, false],
                  ["설계·감리비", `${fmtManwon(r.designCost)}원`, false],
                  ["예비비", `${fmtManwon(r.reserveCost)}원`, false],
                  ["직접사업비 계", `${fmtManwon(r.directCost)}원`, true],
                  ["판매비", `${fmtManwon(r.salesCost)}원`, false],
                  ["대출원금 (LTC 기준)", `${fmtManwon(r.loanPrincipal)}원`, false],
                  ["이자비용", `${fmtManwon(r.interestCost)}원`, false],
                  ["PF 수수료", `${fmtManwon(r.pfFee)}원`, false],
                  ["총사업비", `${fmtManwon(r.totalCost)}원`, true],
                  ["자기자본 (Equity)", `${fmtManwon(r.equity)}원`, false],
                  ["매출액이익률", pct(r.marginOnRevenue), false],
                ].map(([k, v, bold]) => (
                  <tr
                    key={k as string}
                    className={`border-t border-slate-100 first:border-0 ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}
                  >
                    <td className="py-1.5 text-slate-500">{k}</td>
                    <td className="num py-1.5 text-right">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className={sectionCls}>SENSITIVITY — 사업이익률</h2>
            <p className="mt-1 text-[11px] text-slate-400">행: 공사비 변동 / 열: 분양가 변동</p>
            <table className="num mt-3 w-full text-center text-[12px]">
              <thead>
                <tr>
                  <th className="py-1 text-left text-[11px] font-medium text-slate-400">공사비＼분양가</th>
                  {SENSITIVITY_DELTAS.map((dp) => (
                    <th key={dp} className="py-1 text-[11px] font-semibold text-slate-600">
                      {dp > 0 ? "+" : ""}{dp * 100}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sens.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1 text-left text-[11px] font-semibold text-slate-600">
                      {SENSITIVITY_DELTAS[i] > 0 ? "+" : ""}{SENSITIVITY_DELTAS[i] * 100}%
                    </td>
                    {row.map((m, j) => (
                      <td key={j} className="p-0.5">
                        <div className={`rounded px-1 py-1.5 font-semibold ${sensitivityColor(m)} ${i === 2 && j === 2 ? "ring-1 ring-slate-400" : ""}`}>
                          {pct(m)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className={sectionCls}>COST BREAKDOWN</h2>
            <div className="mt-3 flex h-4 w-full overflow-hidden rounded-sm">
              {costParts.map((p) => (
                <div
                  key={p.name}
                  className={p.color}
                  style={{ width: `${r.totalCost > 0 ? (p.value / r.totalCost) * 100 : 0}%` }}
                  title={`${p.name} ${fmtManwon(p.value)}원`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-slate-600">
              {costParts.map((p) => (
                <span key={p.name} className="num flex items-center gap-1.5">
                  <i className={`inline-block h-2 w-2 rounded-[2px] ${p.color}`} />
                  {p.name} {fmtManwon(p.value)}원 ({r.totalCost > 0 ? ((p.value / r.totalCost) * 100).toFixed(1) : 0}%)
                </span>
              ))}
            </div>
          </div>

          {r.marginOnCost < 0.1 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-800">
              사업이익률이 10%를 하회합니다. 통상적인 PF 심사 기준상 사업성 확보가
              어려운 수준으로, 분양가·토지비·공사비 가정에 대한 재검토가 필요합니다.
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-slate-400">
            본 산출 결과는 약식 추정치로서 취득세 외 세부 세금·부가가치세가 반영되지
            않았으며, 투자 판단의 근거로 사용될 수 없습니다. 엑셀 모델은 가정 셀 수정 시
            산출부·민감도표가 함께 재계산되도록 수식으로 작성되어 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense>
      <CalculatorInner />
    </Suspense>
  );
}
