import Link from "next/link";
import { REGIONS } from "@/lib/config";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_0%,rgba(16,185,129,0.08),transparent)]"
        />
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-[12px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            국토교통부 실거래 신고 자료 · 일 단위 자동 갱신
          </span>
          <h1 className="mt-7 max-w-3xl text-[44px] font-extrabold leading-[1.15] tracking-tight sm:text-[56px]">
            토지 데이터에서
            <br />
            <span className="text-emerald-700">사업수지</span>까지, 한 흐름으로
          </h1>
          <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-slate-500">
            권역별 토지 실거래 동향을 확인하고, 대상 필지의 취득가격과 용도지역
            조건을 반영한 약식 사업수지를 즉시 산출합니다. 개발사업 초기 검토를
            위한 마켓 인텔리전스입니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/explorer"
              className="rounded-full bg-emerald-700 px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-700/20"
            >
              실거래 데이터 조회
            </Link>
            <Link
              href="/calculator"
              className="rounded-full border border-slate-200 bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-700 transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              사업수지 분석
            </Link>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-100 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { v: `${REGIONS.length}개`, k: "커버리지 시·군·구", d: "경기 남부 개발수요 집중 권역" },
            { v: "일 1회", k: "데이터 자동 갱신", d: "실거래 신고 반영분 지속 축적" },
            { v: "6종", k: "개발 상품 수지 모델", d: "아파트부터 물류센터까지" },
          ].map((s) => (
            <div key={s.k} className="py-10 sm:px-10 sm:first:pl-0">
              <p className="num text-[34px] font-extrabold tracking-tight text-emerald-700">{s.v}</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-800">{s.k}</p>
              <p className="mt-1 text-[13px] text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="text-[13px] font-semibold text-emerald-700">HOW IT WORKS</p>
        <h2 className="mt-3 text-[30px] font-extrabold tracking-tight">
          심사역의 초기 검토 흐름 그대로
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              no: "01",
              title: "마켓 데이터 수집",
              body: "국토교통부 토지 매매 실거래 신고 자료를 공식 Open API로 수집·정제합니다. 크롤링 없이 공식 소스만 사용합니다.",
            },
            {
              no: "02",
              title: "권역·필지 탐색",
              body: "지도 기반으로 읍면동별 거래량과 중위 평당가를 파악하고, 기간·면적·지목 조건으로 대상 필지를 압축합니다.",
            },
            {
              no: "03",
              title: "약식 사업수지 산출",
              body: "상품 유형별 원가 가정과 용도지역별 법정 건폐율·용적률을 반영해 총사업비, 개발이익, 자기자본수익률을 산출합니다.",
            },
          ].map((c) => (
            <div
              key={c.no}
              className="group rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-900/5"
            >
              <p className="num text-[13px] font-bold text-emerald-600">{c.no}</p>
              <h3 className="mt-3 text-[18px] font-bold tracking-tight">{c.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-500">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-3xl bg-emerald-900 px-10 py-14 text-center sm:px-16">
          <h2 className="text-[26px] font-extrabold tracking-tight text-white sm:text-[30px]">
            {REGIONS.map((r) => r.name.replace("화성시 ", "")).slice(0, 3).join(" · ")} 외{" "}
            {Math.max(REGIONS.length - 3, 0)}개 권역의 토지 거래, 지금 확인하세요
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-emerald-200/80">
            법정동 코드 기반 설계로 커버리지 확장이 가능합니다.
          </p>
          <Link
            href="/explorer"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 text-[15px] font-bold text-emerald-900 transition-all hover:bg-emerald-50"
          >
            데이터 조회 시작
          </Link>
        </div>
      </section>
    </div>
  );
}
