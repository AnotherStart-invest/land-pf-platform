import Link from "next/link";
import { REGIONS } from "@/lib/config";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-slate-500">
        LAND MARKET INTELLIGENCE
      </p>
      <h1 className="max-w-3xl text-[32px] font-bold leading-[1.25] tracking-tight text-slate-900">
        토지 실거래 데이터에 기반한
        <br />
        개발사업 초기 검토
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
        국토교통부 실거래 신고 자료를 일 단위로 수집·정제하여 권역별 토지 거래
        동향을 제공하고, 대상 필지의 취득가격과 용도지역 조건을 반영한 약식
        사업수지를 산출합니다.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link
          href="/explorer"
          className="rounded bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          실거래 데이터 조회
        </Link>
        <Link
          href="/calculator"
          className="rounded border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400"
        >
          사업수지 분석
        </Link>
      </div>

      <div className="mt-20 grid gap-px overflow-hidden rounded border border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          {
            no: "01",
            title: "데이터 파이프라인",
            body: "국토교통부 토지 매매 실거래 신고 자료를 공식 Open API로 수집합니다. 일 단위 자동 갱신으로 신고 반영분이 지속 축적됩니다.",
          },
          {
            no: "02",
            title: "권역 커버리지",
            body: `${REGIONS.map((r) => r.name).join(" · ")}. 개발수요가 집중된 경기 남부 권역을 대상으로 하며, 법정동 코드 기반으로 커버리지 확장이 가능합니다.`,
          },
          {
            no: "03",
            title: "약식 사업수지",
            body: "상품 유형별 원가 가정과 용도지역별 법정 건폐율·용적률을 반영하여 총사업비, 개발이익, 자기자본수익률을 산출합니다.",
          },
        ].map((c) => (
          <div key={c.no} className="bg-white p-6">
            <p className="text-[11px] font-semibold tracking-[0.15em] text-slate-400">{c.no}</p>
            <h3 className="mt-2 text-[15px] font-bold text-slate-900">{c.title}</h3>
            <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 border-t border-slate-200 pt-6">
        <p className="text-[11px] leading-relaxed text-slate-400">
          본 서비스는 정보 제공을 목적으로 하며, 특정 부동산의 매입·매각 또는 투자 권유를
          구성하지 않습니다. 사업수지 산출 결과는 약식 추정치로서 실제 사업성과 상이할 수
          있으며, 투자 판단의 근거로 사용될 수 없습니다. 실거래 자료 출처: 국토교통부
          실거래가 공개시스템(공공데이터포털).
        </p>
      </div>
    </div>
  );
}
