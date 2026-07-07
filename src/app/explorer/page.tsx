"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { REGIONS } from "@/lib/config";
import { LandTransaction } from "@/lib/supabase";
import { sqmToPyeong } from "@/lib/feasibility";
import KakaoMap from "@/components/KakaoMap";

const JIMOK_OPTIONS = ["전", "답", "대", "임야", "잡종지", "과수원", "공장용지", "창고용지"];

function fmtManwon(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

export default function ExplorerPage() {
  const [region, setRegion] = useState(REGIONS[0]);
  const [fromYm, setFromYm] = useState("");
  const [toYm, setToYm] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [jimok, setJimok] = useState("");
  const [dongFilter, setDongFilter] = useState("");

  const [rows, setRows] = useState<LandTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LandTransaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ region: region.lawdCd, pageSize: "1000" });
      if (fromYm) p.set("fromYm", fromYm.replace("-", ""));
      if (toYm) p.set("toYm", toYm.replace("-", ""));
      if (minArea) p.set("minArea", String(Number(minArea) * 3.3058)); // 평 → ㎡
      if (maxArea) p.set("maxArea", String(Number(maxArea) * 3.3058));
      if (jimok) p.set("jimok", jimok);
      const res = await fetch(`/api/land?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [region, fromYm, toYm, minArea, maxArea, jimok]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = useMemo(
    () => (dongFilter ? rows.filter((r) => r.umd_nm === dongFilter) : rows),
    [rows, dongFilter]
  );

  // 선택된 동의 시세 요약 (이상치 영향을 줄이기 위해 중위값 사용)
  const dongStats = useMemo(() => {
    if (!dongFilter || visibleRows.length === 0) return null;
    const median = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };
    const pricesPerPyeong: number[] = [];
    const areas: number[] = [];
    for (const r of visibleRows) {
      const py = sqmToPyeong(r.area_sqm);
      if (py <= 0) continue;
      pricesPerPyeong.push(r.deal_amount_manwon / py);
      areas.push(py);
    }
    if (pricesPerPyeong.length === 0) return null;
    return {
      count: pricesPerPyeong.length,
      medianPricePerPyeong: Math.round(median(pricesPerPyeong)),
      medianAreaPyeong: Math.round(median(areas)),
    };
  }, [dongFilter, visibleRows]);

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col gap-3 p-3 lg:flex-row">
      {/* 좌측: 필터 + 리스트 */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">권역</span>
            <select
              className="rounded border border-zinc-300 px-2 py-1.5"
              value={region.lawdCd}
              onChange={(e) => {
                setRegion(REGIONS.find((r) => r.lawdCd === e.target.value) ?? REGIONS[0]);
                setDongFilter("");
                setSelected(null);
              }}
            >
              {REGIONS.map((r) => (
                <option key={r.lawdCd} value={r.lawdCd}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">계약 시작월</span>
            <input type="month" className="rounded border border-zinc-300 px-2 py-1" value={fromYm} onChange={(e) => setFromYm(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">계약 종료월</span>
            <input type="month" className="rounded border border-zinc-300 px-2 py-1" value={toYm} onChange={(e) => setToYm(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">면적(평) 최소</span>
            <input type="number" className="w-24 rounded border border-zinc-300 px-2 py-1" value={minArea} onChange={(e) => setMinArea(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">면적(평) 최대</span>
            <input type="number" className="w-24 rounded border border-zinc-300 px-2 py-1" value={maxArea} onChange={(e) => setMaxArea(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">지목</span>
            <select className="rounded border border-zinc-300 px-2 py-1.5" value={jimok} onChange={(e) => setJimok(e.target.value)}>
              <option value="">전체</option>
              {JIMOK_OPTIONS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </label>
          {dongFilter && (
            <button
              className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 hover:bg-blue-200"
              onClick={() => setDongFilter("")}
            >
              {dongFilter} ✕
            </button>
          )}
          <span className="ml-auto text-xs text-zinc-500">
            {loading ? "불러오는 중…" : `${visibleRows.length.toLocaleString()}건 표시 (전체 ${total.toLocaleString()}건)`}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            데이터 조회 실패: {error} — Supabase 환경변수 설정과 schema.sql 실행, /api/ingest 적재 여부를 확인하세요.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2">계약일</th>
                <th className="px-3 py-2">읍면동</th>
                <th className="px-3 py-2">지번</th>
                <th className="px-3 py-2">지목</th>
                <th className="px-3 py-2 text-right">면적(평)</th>
                <th className="px-3 py-2 text-right">거래금액</th>
                <th className="px-3 py-2 text-right">평당가</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const pyeong = sqmToPyeong(r.area_sqm);
                const perPyeong = pyeong > 0 ? r.deal_amount_manwon / pyeong : 0;
                const isSel = selected?.id === r.id;
                return (
                  <tr
                    key={r.id}
                    className={`cursor-pointer border-t border-zinc-100 hover:bg-blue-50 ${isSel ? "bg-blue-50" : ""}`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{r.deal_year}.{String(r.deal_month).padStart(2, "0")}.{r.deal_day ? String(r.deal_day).padStart(2, "0") : "–"}</td>
                    <td className="px-3 py-2">{r.umd_nm}</td>
                    <td className="px-3 py-2">{r.jibun ?? "비공개"}</td>
                    <td className="px-3 py-2">{r.jimok}</td>
                    <td className="px-3 py-2 text-right">{pyeong.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtManwon(r.deal_amount_manwon)}</td>
                    <td className="px-3 py-2 text-right">{Math.round(perPyeong).toLocaleString()}만</td>
                  </tr>
                );
              })}
              {!loading && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-zinc-400">
                    표시할 거래가 없습니다. 필터를 조정하거나 /api/ingest로 데이터를 적재하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 우측: 지도 + 상세 패널 */}
      <div className="flex min-h-[400px] w-full flex-col gap-3 lg:w-[480px]">
        <div className="min-h-0 flex-1">
          <KakaoMap center={region.center} regionName={region.name} rows={rows} onSelectDong={setDongFilter} />
        </div>
        {dongFilter && dongStats && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
            <div className="mb-2 flex items-start justify-between">
              <h3 className="font-semibold text-blue-900">{dongFilter} 시세 요약</h3>
              <button className="text-blue-400 hover:text-blue-600" onClick={() => setDongFilter("")}>✕</button>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-blue-700/70">거래</dt>
                <dd className="font-semibold text-blue-900">{dongStats.count}건</dd>
              </div>
              <div>
                <dt className="text-xs text-blue-700/70">중위 평당가</dt>
                <dd className="font-semibold text-blue-900">{dongStats.medianPricePerPyeong.toLocaleString()}만원</dd>
              </div>
              <div>
                <dt className="text-xs text-blue-700/70">중위 면적</dt>
                <dd className="font-semibold text-blue-900">{dongStats.medianAreaPyeong.toLocaleString()}평</dd>
              </div>
            </dl>
            <Link
              href={{
                pathname: "/calculator",
                query: {
                  area: dongStats.medianAreaPyeong,
                  landPrice: dongStats.medianPricePerPyeong,
                },
              }}
              className="mt-3 block rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-500"
            >
              이 지역 시세로 사업성 분석 →
            </Link>
          </div>
        )}
        {selected && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
            <div className="mb-2 flex items-start justify-between">
              <h3 className="font-semibold">
                {selected.umd_nm} {selected.jibun ?? "(지번 비공개)"}
              </h3>
              <button className="text-zinc-400 hover:text-zinc-600" onClick={() => setSelected(null)}>✕</button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-700">
              <dt className="text-zinc-500">거래금액</dt>
              <dd className="text-right font-medium">{fmtManwon(selected.deal_amount_manwon)}원</dd>
              <dt className="text-zinc-500">면적</dt>
              <dd className="text-right">{selected.area_sqm.toLocaleString()}㎡ ({sqmToPyeong(selected.area_sqm).toFixed(1)}평)</dd>
              <dt className="text-zinc-500">평당가</dt>
              <dd className="text-right">{Math.round(selected.deal_amount_manwon / sqmToPyeong(selected.area_sqm)).toLocaleString()}만원</dd>
              <dt className="text-zinc-500">지목</dt>
              <dd className="text-right">{selected.jimok ?? "–"}</dd>
              <dt className="text-zinc-500">용도지역</dt>
              <dd className="text-right">{selected.use_zone ?? "미제공"}</dd>
              <dt className="text-zinc-500">거래유형</dt>
              <dd className="text-right">{selected.dealing_type ?? "–"}{selected.share_dealing ? " (지분)" : ""}</dd>
            </dl>
            <Link
              href={{
                pathname: "/calculator",
                query: {
                  area: sqmToPyeong(selected.area_sqm).toFixed(1),
                  landPrice: Math.round(selected.deal_amount_manwon / sqmToPyeong(selected.area_sqm)),
                  zone: selected.use_zone ?? "",
                },
              }}
              className="mt-3 block rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-500"
            >
              이 필지로 사업성 분석 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
