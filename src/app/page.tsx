import Link from "next/link";
import { REGIONS } from "@/lib/config";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold leading-tight">
        토지 실거래 데이터로 시작하는
        <br />
        <span className="text-blue-600">PF 초기 사업성 검토</span>
      </h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        국토교통부 실거래가 공개시스템의 토지 매매 신고 데이터를 수집·정제해
        권역별로 조회하고, 선택한 필지의 실거래가를 바탕으로 약식 사업수지를
        즉시 계산합니다. 대상 권역: {REGIONS.map((r) => r.name).join(", ")}.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/explorer"
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500"
        >
          실거래 조회 →
        </Link>
        <Link
          href="/calculator"
          className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 font-medium hover:bg-zinc-50"
        >
          사업성 분석 계산기
        </Link>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "공공데이터 파이프라인",
            body: "국토교통부 토지 매매 실거래가 API를 주기적으로 수집해 DB에 적재. 크롤링 없이 공식 소스만 사용합니다.",
          },
          {
            title: "권역 집중 조회",
            body: "지도 위 읍면동 단위 집계(거래 건수·평균 평당가)와 기간·면적·지목 필터로 관심 필지를 빠르게 추립니다.",
          },
          {
            title: "간이 사업수지",
            body: "용도지역별 법정 용적률, 실거래 기반 토지비, PF 금융조건을 반영한 약식 수지표로 초기 사업성을 가늠합니다.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{c.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-zinc-400">
        본 서비스의 사업수지 결과는 약식 추정치이며 투자 판단의 근거로 사용될 수 없습니다.
        실거래가 데이터 출처: 국토교통부 실거래가 공개시스템 (공공데이터포털).
      </p>
    </div>
  );
}
