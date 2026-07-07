"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ZONE_RULES,
  PRODUCT_TYPES,
  findZoneRule,
  calcFeasibility,
  FeasibilityInput,
} from "@/lib/feasibility";

function fmtManwon(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v).toLocaleString()}만`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

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
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="w-full rounded border border-zinc-300 px-2 py-1.5"
          value={Number.isFinite(value) ? value : ""}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="shrink-0 text-xs text-zinc-500">{suffix}</span>}
      </div>
    </label>
  );
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

  const [input, setInput] = useState<FeasibilityInput>({
    landAreaPyeong: Number(sp.get("area")) || 500,
    far: (initialZone ?? ZONE_RULES.find((z) => z.name === "계획관리지역")!).far,
    salableRatio: initialProduct.salableRatio,
    landPricePerPyeong: Number(sp.get("landPrice")) || 300,
    constCostPerPyeong: initialProduct.constCostPerPyeong,
    salePricePerPyeong: 1300,
    miscCostRatio: initialProduct.miscCostRatio,
    loanRatio: 0.6,
    interestRate: 0.065,
    periodMonths: initialProduct.periodMonths,
  });

  // 상품-용도지역 통상 입지 불일치 경고 (법적 판단이 아닌 참고용)
  const zoneMismatch = !product.zoneKeywords.some((k) => zoneName.includes(k));

  const set = <K extends keyof FeasibilityInput>(k: K, v: FeasibilityInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));

  const r = useMemo(() => calcFeasibility(input), [input]);

  const costParts = [
    { name: "토지비", value: r.landCost, color: "bg-blue-500" },
    { name: "건축비", value: r.constructionCost, color: "bg-emerald-500" },
    { name: "기타경비", value: r.miscCost, color: "bg-amber-500" },
    { name: "금융비용", value: r.financeCost, color: "bg-rose-500" },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 text-xl font-bold">간이 사업성(수지) 분석</h1>
      <p className="mb-4 text-sm text-zinc-500">
        PF 초기 검토용 약식 사업수지입니다. 용도지역 선택 시 국토계획법 시행령상 상한 용적률이 자동 적용되며(조례로 하향 가능), 모든 금액은 만원 단위입니다.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* 입력 */}
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">개발 상품 유형</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">상품 유형 (선택 시 건축비·분양비율·경비율·사업기간 기본값 적용)</span>
            <select
              className="rounded border border-zinc-300 px-2 py-1.5"
              value={productName}
              onChange={(e) => {
                const p = PRODUCT_TYPES.find((x) => x.name === e.target.value)!;
                setProductName(p.name);
                setInput((prev) => ({
                  ...prev,
                  constCostPerPyeong: p.constCostPerPyeong,
                  salableRatio: p.salableRatio,
                  miscCostRatio: p.miscCostRatio,
                  periodMonths: p.periodMonths,
                }));
              }}
            >
              {PRODUCT_TYPES.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-zinc-400">{product.note}</p>
          {zoneMismatch && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              ⚠ {productName}은(는) 통상 {product.zoneKeywords.join("·")} 계열 용도지역에서 검토되는 상품입니다.
              현재 선택된 &lsquo;{zoneName}&rsquo;에서는 건축이 제한되거나 별도 인허가 검토가 필요할 수 있습니다.
            </p>
          )}

          <h2 className="pt-2 text-sm font-semibold text-zinc-700">토지 및 건축 조건</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">용도지역</span>
            <select
              className="rounded border border-zinc-300 px-2 py-1.5"
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
            <NumField label="평당 토지매입가" value={input.landPricePerPyeong} onChange={(v) => set("landPricePerPyeong", v)} suffix="만원" step={10} />
            <NumField label="평당 건축비 (연면적)" value={input.constCostPerPyeong} onChange={(v) => set("constCostPerPyeong", v)} suffix="만원" step={10} />
            <NumField label="평당 분양가 (분양면적)" value={input.salePricePerPyeong} onChange={(v) => set("salePricePerPyeong", v)} suffix="만원" step={10} />
          </div>

          <h2 className="pt-2 text-sm font-semibold text-zinc-700">사업경비 · PF 금융 조건</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="기타 사업경비율 (직접비 대비)" value={input.miscCostRatio * 100} onChange={(v) => set("miscCostRatio", v / 100)} suffix="%" />
            <NumField label="PF 대출비율 (사업비 대비)" value={input.loanRatio * 100} onChange={(v) => set("loanRatio", v / 100)} suffix="%" step={5} />
            <NumField label="연 금리" value={input.interestRate * 100} onChange={(v) => set("interestRate", v / 100)} suffix="%" step={0.1} />
            <NumField label="사업기간" value={input.periodMonths} onChange={(v) => set("periodMonths", v)} suffix="개월" />
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            건폐율({zone.bcr * 100}%)은 층수 계획 검토용 참고값이며 수지에는 용적률만 반영됩니다. 금융비용은 보수적으로 대출원금 전액 × 금리 × 사업기간으로 계산합니다.
          </p>
        </div>

        {/* 결과 */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl border p-4 ${r.profit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="text-xs text-zinc-500">예상이익</div>
              <div className={`text-lg font-bold ${r.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmtManwon(r.profit)}원</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="text-xs text-zinc-500">사업비 대비 마진율</div>
              <div className="text-lg font-bold">{pct(r.marginOnCost)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="text-xs text-zinc-500">자기자본수익률</div>
              <div className="text-lg font-bold">{pct(r.returnOnEquity)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">사업수지표</h2>
            <table className="w-full">
              <tbody>
                {[
                  ["연면적", `${r.grossFloorAreaPyeong.toFixed(0)}평 (대지 ${input.landAreaPyeong}평 × 용적률 ${(input.far * 100).toFixed(0)}%)`],
                  ["분양면적", `${r.salableAreaPyeong.toFixed(0)}평`],
                  ["총 분양매출", `${fmtManwon(r.totalRevenue)}원`],
                  ["토지비", `${fmtManwon(r.landCost)}원`],
                  ["건축비", `${fmtManwon(r.constructionCost)}원`],
                  ["기타 사업경비", `${fmtManwon(r.miscCost)}원`],
                  ["금융비용", `${fmtManwon(r.financeCost)}원`],
                  ["총사업비", `${fmtManwon(r.totalCost)}원`],
                  ["자기자본 투입", `${fmtManwon(r.equity)}원 (대출 ${fmtManwon(r.totalCost - r.equity)}원)`],
                  ["매출액 대비 이익률", pct(r.marginOnRevenue)],
                ].map(([k, v]) => (
                  <tr key={k} className="border-t border-zinc-100 first:border-0">
                    <td className="py-1.5 text-zinc-500">{k}</td>
                    <td className="py-1.5 text-right font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">총사업비 구성</h2>
            <div className="flex h-6 w-full overflow-hidden rounded-full">
              {costParts.map((p) => (
                <div
                  key={p.name}
                  className={p.color}
                  style={{ width: `${r.totalCost > 0 ? (p.value / r.totalCost) * 100 : 0}%` }}
                  title={`${p.name} ${fmtManwon(p.value)}원`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
              {costParts.map((p) => (
                <span key={p.name} className="flex items-center gap-1.5">
                  <i className={`inline-block h-2.5 w-2.5 rounded-sm ${p.color}`} />
                  {p.name} {fmtManwon(p.value)}원 ({r.totalCost > 0 ? ((p.value / r.totalCost) * 100).toFixed(1) : 0}%)
                </span>
              ))}
            </div>
          </div>

          {r.marginOnCost < 0.1 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              마진율 10% 미만 — 통상 PF 심사에서 사업성 부족으로 판단될 수 있는 수준입니다. 분양가·토지비·공사비 가정을 재검토하세요.
            </div>
          )}
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
