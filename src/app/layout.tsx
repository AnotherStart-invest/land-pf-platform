import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://land-pf-platform-kappa.vercel.app"),
  title: "랜드스코프 LandScope — 토지 실거래 조회 · PF 사업수지 분석",
  description:
    "랜드스코프(LandScope)는 국토교통부 실거래 자료 기반으로 화성·평택 토지 거래를 조회하고 개발사업 약식 사업수지를 산출하는 검토 도구입니다.",
  keywords: [
    "랜드스코프", "LandScope", "토지 실거래가", "토지 시세",
    "사업수지 분석", "부동산 PF", "개발사업 사업성", "화성 토지", "평택 토지",
  ],
  verification: {
    google: "WwNLOfTWG_k7fVxQOqREB4r_VQaO_hxf0mYcsYPvlgY",
    other: {
      "naver-site-verification": "af44cae012f0f0e178ac9abfd5de5d46461c4a15",
    },
  },
  openGraph: {
    title: "랜드스코프 LandScope — 토지 실거래 조회 · PF 사업수지 분석",
    description:
      "국토교통부 실거래 자료 기반 토지 거래 조회 및 약식 사업수지 산출 도구",
    url: "https://land-pf-platform-kappa.vercel.app",
    siteName: "LandScope",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
          <nav className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-[13px] font-black text-white">
                L
              </span>
              <span className="text-[17px] font-bold tracking-tight">
                Land<span className="text-emerald-700">Scope</span>
              </span>
            </Link>
            <div className="ml-4 hidden items-center gap-7 sm:flex">
              <Link
                href="/explorer"
                className="text-[14px] font-medium text-slate-600 transition-colors hover:text-emerald-700"
              >
                실거래 데이터
              </Link>
              <Link
                href="/calculator"
                className="text-[14px] font-medium text-slate-600 transition-colors hover:text-emerald-700"
              >
                사업수지 분석
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <span className="text-[15px] font-bold tracking-tight text-slate-700">
                Land<span className="text-emerald-700">Scope</span>
              </span>
              <span className="text-[12px] text-slate-400">
                Data. 국토교통부 실거래가 공개시스템 (공공데이터포털)
              </span>
            </div>
            <p className="mt-5 max-w-4xl text-[11px] leading-relaxed text-slate-400">
              본 서비스는 정보 제공을 목적으로 하며, 특정 부동산의 매입·매각 또는 투자
              권유를 구성하지 않습니다. 사업수지 산출 결과는 약식 추정치로서 실제
              사업성과 상이할 수 있으며, 투자 판단의 근거로 사용될 수 없습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
