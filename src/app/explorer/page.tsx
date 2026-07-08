"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { REGIONS, PROVINCES, DEFAULT_REGION } from "@/lib/config";
import { LandTransaction } from "@/lib/supabase";
import { sqmToPyeong } from "@/lib/feasibility";
import KakaoMap from "@/components/KakaoMap";

const JIMOK_OPTIONS = ["전", "답", "대", "임야", "잡종지", "과수원", "공장용지", "창고용지"];

function fmtManwon(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

const inputCls =
  "rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-slate-500";
const labelCls = "text-[11px] font-medium text-slate-500";

export default function ExplorerPage() {
  const [region, setRegion] = useState(DEFAULT_REGION);
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

  // 지도 이동으로 감지된 시군구로 자동 전환 (코드 → 이름 순 매칭)
  const handleRegionDetect = useCallback((cd5: string, fullName: string) => {
    setRegion((cur) => {
      if (cur.lawdCd === cd5) return cur;
      const norm = fullName.replace(/\s/g, "");
      const found =
        REGIONS.find((r) => r.lawdCd === cd5) ??
        REGIONS.find((r) => norm.includes(r.name.replace(/\s/g, "")));
      if (found && found.lawdCd !== cur.lawdCd) {
        setDongFilter("");
        return found;
      }
      return cur;
    });
  }, []);

  const visibleRows = useMemo(
    () => (dongFilter ? rows.filter((r) => r.umd_nm === dongFilter) : rows),
    [rows, dongFilter]
  );

  // 선택된 동의 거래 요약 (이상치 영향을 줄이기 위해 중위값 사용)
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
    <div className="flex h-[calc(100vh-64px)] flex-col gap-2.5 p-2.5 lg:flex-row">
      {/* 좌측: 필터 + 리스트 */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 rounded-xl border border-slate-100 bg-white shadow-sm px-3.5 py-3">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>권역</span>
            <select
              className={inputCls}
              value={region.lawdCd}
              onChange={(e) => {
                setRegion(REGIONS.find((r) => r.lawdCd === e.target.value) ?? DEFAULT_REGION);
                setDongFilter("");
                setSelected(null);
              }}
            >
              {PROVINCES.map((prov) => (
                <optgroup key={prov} label={prov}>
                  {REGIONS.filter((r) => r.province === prov).map((r) => (
                    <option key={r.lawdCd} value={r.lawdCd}>{r.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>계약월 (부터)</span>
            <input type="month" className={inputCls} value={fromYm} onChange={(e) => setFromYm(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>계약월 (까지)</span>
            <input type="month" className={inputCls} value={toYm} onChange={(e) => setToYm(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>면적 하한 (평)</span>
            <input type="number" className={`${inputCls} w-24`} value={minArea} onChange={(e) => setMinArea(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>면적 상한 (평)</span>
            <input type="number" className={`${inputCls} w-24`} value={maxArea} onChange={(e) => setMaxArea(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>지목</span>
            <select className={inputCls} value={jimok} onChange={(e) => setJimok(e.target.value)}>
              <option value="">전체</option>
              {JIMOK_OPTIONS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </label>
          {dongFilter && (
            <button
              className="rounded border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-200"
              onClick={() => setDongFilter("")}
            >
              {dongFilter} ✕
            </button>
          )}
          <span className="ml-auto text-[11px] text-slate-400 num">
            {loading
              ? "조회 중"
              : `${visibleRows.length.toLocaleString()}건 / 전체 ${total.toLocaleString()}건`}
          </span>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
            데이터 조회에 실패했습니다: {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-left text-[11px] font-medium text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">계약일</th>
                <th className="px-3 py-2 font-medium">소재지</th>
                <th className="px-3 py-2 font-medium">지번</th>
                <th className="px-3 py-2 font-medium">지목</th>
                <th className="px-3 py-2 font-medium">용도지역</th>
                <th className="px-3 py-2 text-right font-medium">면적(평)</th>
                <th className="px-3 py-2 text-right font-medium">거래금액</th>
                <th className="px-3 py-2 text-right font-medium">평당가</th>
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
                    className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50 ${isSel ? "bg-slate-100" : ""}`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                      {r.deal_year}.{String(r.deal_month).padStart(2, "0")}.{r.deal_day ? String(r.deal_day).padStart(2, "0") : "–"}
                    </td>
                    <td className="px-3 py-1.5 text-slate-800">{r.umd_nm}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.jibun ?? "비공개"}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.jimok}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.use_zone ?? "–"}</td>
                    <td className="px-3 py-1.5 text-right text-slate-800">{pyeong.toFixed(0)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{fmtManwon(r.deal_amount_manwon)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{Math.round(perPyeong).toLocaleString()}만</td>
                  </tr>
                );
              })}
              {!loading && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-[13px] text-slate-400">
                    조회 조건에 해당하는 거래가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 우측: 지도 + 상세 패널 */}
      <div className="flex min-h-[400px] w-full flex-col gap-2.5 lg:w-[460px]">
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-100 shadow-sm">
          <KakaoMap
            regionQuery={`${region.province} ${region.name}`}
            rows={rows}
            onSelectDong={setDongFilter}
            onRegionDetect={handleRegionDetect}
            focus={
              selected
                ? {
                    query: `${region.province} ${region.name} ${selected.umd_nm ?? ""}`,
                    areaSqm: selected.area_sqm,
                    label: `${selected.umd_nm ?? ""} ${selected.jibun ?? ""} · ${sqmToPyeong(selected.area_sqm).toFixed(0)}평 규모`,
                  }
                : null
            }
          />
        </div>
        {dongFilter && dongStats && (
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-emerald-600">AREA SUMMARY</p>
                <h3 className="mt-0.5 text-[14px] font-bold text-slate-900">{dongFilter}</h3>
              </div>
              <button className="text-slate-300 hover:text-slate-500" onClick={() => setDongFilter("")}>✕</button>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-slate-100 text-center">
              <div className="px-1">
                <dt className="text-[11px] text-slate-500">거래건수</dt>
                <dd className="num mt-0.5 text-[15px] font-semibold text-slate-900">{dongStats.count}건</dd>
              </div>
              <div className="px-1">
                <dt className="text-[11px] text-slate-500">중위 평당가</dt>
                <dd className="num mt-0.5 text-[15px] font-semibold text-slate-900">{dongStats.medianPricePerPyeong.toLocaleString()}만</dd>
              </div>
              <div className="px-1">
                <dt className="text-[11px] text-slate-500">중위 면적</dt>
                <dd className="num mt-0.5 text-[15px] font-semibold text-slate-900">{dongStats.medianAreaPyeong.toLocaleString()}평</dd>
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
              className="mt-3.5 block rounded-full bg-emerald-700 px-4 py-2.5 text-center text-[13px] font-semibold text-white transition-all hover:bg-emerald-600"
            >
              지역 중위가 기준 사업수지 분석
            </Link>
          </div>
        )}
        {selected && (
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-emerald-600">PARCEL DETAIL</p>
                <h3 className="mt-0.5 text-[14px] font-bold text-slate-900">
                  {selected.umd_nm} {selected.jibun ?? "(지번 비공개)"}
                </h3>
              </div>
              <button className="text-slate-300 hover:text-slate-500" onClick={() => setSelected(null)}>✕</button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
              <dt className="text-slate-500">거래금액</dt>
              <dd className="num text-right font-semibold text-slate-900">{fmtManwon(selected.deal_amount_manwon)}원</dd>
              <dt className="text-slate-500">면적</dt>
              <dd className="num text-right text-slate-800">{selected.area_sqm.toLocaleString()}㎡ ({sqmToPyeong(selected.area_sqm).toFixed(1)}평)</dd>
              <dt className="text-slate-500">평당가</dt>
              <dd className="num text-right text-slate-800">{Math.round(selected.deal_amount_manwon / sqmToPyeong(selected.area_sqm)).toLocaleString()}만원</dd>
              <dt className="text-slate-500">지목</dt>
              <dd className="text-right text-slate-800">{selected.jimok ?? "–"}</dd>
              <dt className="text-slate-500">용도지역</dt>
              <dd className="text-right text-slate-800">{selected.use_zone ?? "미제공"}</dd>
              <dt className="text-slate-500">거래유형</dt>
              <dd className="text-right text-slate-800">{selected.dealing_type ?? "–"}{selected.share_dealing ? " (지분)" : ""}</dd>
            </dl>
            <p className="mt-2 text-[11px] text-slate-400">
              지도 표시는 법정동 기준 근사 위치 · 규모 (지번 일부 비공개)
            </p>
            <Link
              href={{
                pathname: "/calculator",
                query: {
                  area: sqmToPyeong(selected.area_sqm).toFixed(1),
                  landPrice: Math.round(selected.deal_amount_manwon / sqmToPyeong(selected.area_sqm)),
                  zone: selected.use_zone ?? "",
                },
              }}
              className="mt-3.5 block rounded-full bg-emerald-700 px-4 py-2.5 text-center text-[13px] font-semibold text-white transition-all hover:bg-emerald-600"
            >
              본 건 기준 사업수지 분석
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
