import Link from "next/link";
import { REGIONS } from "@/lib/config";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
        토지 실거래 데이터 · 사업수지 분석
      </h1>
      <p className="mt-3 text-[14px] text-slate-500">
        국토교통부 실거래 자료 기반 토지 거래 조회 · 약식 사업수지 산출 도구
      </p>

      <div className="mt-8 flex gap-2.5">
        <Link
          href="/explorer"
          className="rounded-lg bg-emerald-700 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          실거래 데이터
        </Link>
        <Link
          href="/calculator"
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300"
        >
          사업수지 분석
        </Link>
      </div>

      <dl className="mt-14 divide-y divide-slate-100 border-y border-slate-100 text-[13px]">
        {[
          ["커버리지", REGIONS.map((r) => r.name).join(" · ")],
          ["데이터", "국토교통부 토지 매매 실거래가 (공공데이터포털 Open API) · 일 단위 자동 갱신"],
          ["조회", "지도 기반 읍면동별 거래 집계(건수·중위 평당가), 기간·면적·지목 필터"],
          [
            "수지 모델",
            "상품 유형 6종 원가 기준, 용도지역별 법정 용적률, 브릿지·본PF 금융구조, 분양가×공사비 민감도, BEP 분양률",
          ],
          ["산출물", "약식 수지표 및 수식 기반 엑셀 모델 (가정 수정 시 재계산)"],
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-[100px_1fr] gap-4 py-3.5">
            <dt className="font-semibold text-slate-400">{k}</dt>
            <dd className="leading-relaxed text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
