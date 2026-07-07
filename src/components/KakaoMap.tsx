"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LandTransaction } from "@/lib/supabase";
import { sqmToPyeong } from "@/lib/feasibility";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: any;
  }
}

interface Props {
  center: { lat: number; lng: number };
  regionName: string;
  rows: LandTransaction[];
  onSelectDong?: (umdNm: string) => void;
}

interface DongEntry {
  dong: string;
  count: number;
  avgPricePerPyeong: number;
  pos: any; // kakao.maps.LatLng
}

/** 줌 레벨별 최대 표시 개수 — 축소 상태일수록 거래 많은 동네만 보여줘서 지도를 가리지 않게 */
function maxOverlaysForLevel(level: number): number {
  if (level >= 10) return 6;
  if (level >= 9) return 10;
  if (level >= 8) return 18;
  if (level >= 7) return 30;
  return Infinity;
}

/** 읍면동 단위로 거래를 집계해 지도에 오버레이로 표시 (줌 레벨에 따라 개수 조절) */
export default function KakaoMap({ center, regionName, rows, onSelectDong }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const entriesRef = useRef<DongEntry[]>([]);
  const geocodeCache = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  // SDK 로드
  useEffect(() => {
    if (!appKey) return;
    if (window.kakao?.maps) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => setReady(true));
    document.head.appendChild(script);
  }, [appKey]);

  /** 현재 줌 레벨 기준으로 오버레이 다시 그림 */
  const renderOverlays = useCallback(() => {
    const map = mapObj.current;
    if (!map) return;

    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];

    const level = map.getLevel();
    const limit = maxOverlaysForLevel(level);
    const visible = [...entriesRef.current]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    for (const e of visible) {
      // 축소 상태에서는 마지막 지명(리/동)만, 확대하면 전체 지명
      const shortName = level >= 8 ? e.dong.split(" ").pop() : e.dong;

      const el = document.createElement("div");
      el.className =
        "group flex items-center gap-1 rounded-full bg-emerald-950/90 text-white text-[11px] px-2 py-1 shadow-md cursor-pointer whitespace-nowrap hover:bg-emerald-800 hover:z-50";
      el.innerHTML =
        `<b>${shortName}</b><span class="rounded-full bg-white/25 px-1 num">${e.count}</span>` +
        `<span class="hidden group-hover:inline"> 평당 ${e.avgPricePerPyeong.toLocaleString()}만</span>`;
      el.onclick = () => onSelectDong?.(e.dong);
      el.title = `${e.dong} — ${e.count}건 · 평균 평당 ${e.avgPricePerPyeong.toLocaleString()}만원`;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: e.pos,
        content: el,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      overlays.current.push(overlay);
    }
  }, [onSelectDong]);

  // 지도 생성 + 줌 변경 시 오버레이 재계산
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    mapObj.current = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(center.lat, center.lng),
      level: 9,
    });
    window.kakao.maps.event.addListener(mapObj.current, "zoom_changed", renderOverlays);
  }, [ready, center, renderOverlays]);

  // 권역 변경 시 중심 이동
  useEffect(() => {
    if (!mapObj.current) return;
    mapObj.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
  }, [center]);

  // 거래 데이터 → 동별 집계 → 지오코딩(캐시) → 렌더
  useEffect(() => {
    if (!ready || !mapObj.current) return;

    const byDong = new Map<string, { count: number; sumPricePerPyeong: number }>();
    for (const r of rows) {
      if (!r.umd_nm) continue;
      const pyeong = sqmToPyeong(r.area_sqm);
      if (pyeong <= 0) continue;
      const cur = byDong.get(r.umd_nm) ?? { count: 0, sumPricePerPyeong: 0 };
      cur.count += 1;
      cur.sumPricePerPyeong += r.deal_amount_manwon / pyeong;
      byDong.set(r.umd_nm, cur);
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    const geocode = (addr: string) =>
      new Promise<any>((resolve) => {
        const cached = geocodeCache.current.get(addr);
        if (cached !== undefined) return resolve(cached);
        geocoder.addressSearch(addr, (result: any[], status: string) => {
          const pos =
            status === window.kakao.maps.services.Status.OK && result.length > 0
              ? new window.kakao.maps.LatLng(Number(result[0].y), Number(result[0].x))
              : null;
          geocodeCache.current.set(addr, pos);
          resolve(pos);
        });
      });

    let cancelled = false;
    (async () => {
      const entries: DongEntry[] = [];
      for (const [dong, agg] of byDong) {
        const pos = await geocode(`${regionName} ${dong}`);
        if (pos) {
          entries.push({
            dong,
            count: agg.count,
            avgPricePerPyeong: Math.round(agg.sumPricePerPyeong / agg.count),
            pos,
          });
        }
      }
      if (cancelled) return;
      entriesRef.current = entries;
      renderOverlays();
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, rows, regionName, renderOverlays]);

  if (!appKey) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되지 않아 지도를 표시할 수 없습니다.
        <br />
        Kakao Developers에서 JavaScript 키를 발급받아 .env.local에 추가하세요.
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full rounded-xl" />;
}
