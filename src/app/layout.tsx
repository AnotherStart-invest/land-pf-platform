import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LandScope — 토지 실거래 조회 · 간이 사업성 분석",
  description:
    "국토교통부 공공데이터 기반 토지 매매 실거래 통합 조회와 PF 초기 검토용 간이 사업수지 분석 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-100 text-zinc-900">
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-bold tracking-tight">
              Land<span className="text-blue-600">Scope</span>
            </Link>
            <Link href="/explorer" className="text-zinc-600 hover:text-zinc-900">
              실거래 조회
            </Link>
            <Link href="/calculator" className="text-zinc-600 hover:text-zinc-900">
              사업성 분석
            </Link>
            <span className="ml-auto text-xs text-zinc-400">
              데이터: 국토교통부 실거래가 공개시스템
            </span>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
