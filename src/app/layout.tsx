import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LandScope — 토지 실거래 데이터 · 사업수지 분석",
  description:
    "국토교통부 실거래 신고 자료 기반 토지 마켓 데이터 조회 및 개발사업 초기 검토용 약식 사업수지 분석",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900">
          <nav className="mx-auto flex max-w-7xl items-baseline gap-8 px-5 py-3.5 text-sm">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-bold tracking-[0.18em] text-white">
                LANDSCOPE
              </span>
              <span className="hidden text-[10px] font-medium tracking-[0.14em] text-slate-500 sm:inline">
                LAND MARKET INTELLIGENCE
              </span>
            </Link>
            <Link
              href="/explorer"
              className="text-[13px] font-medium text-slate-300 transition-colors hover:text-white"
            >
              실거래 데이터
            </Link>
            <Link
              href="/calculator"
              className="text-[13px] font-medium text-slate-300 transition-colors hover:text-white"
            >
              사업수지 분석
            </Link>
            <span className="ml-auto hidden text-[11px] text-slate-500 md:inline">
              Source. 국토교통부 실거래가 공개시스템
            </span>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
