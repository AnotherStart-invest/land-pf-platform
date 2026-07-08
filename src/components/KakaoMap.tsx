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
  /** 지오코딩 쿼리 접두어 (예: "경기 화성시 만세구") */
  regionQuery: string;
  rows: LandTransaction[];
  onSelectDong?: (umdNm: string) => void;
  /** 선택 거래 포커스 — 법정동 근사 위치에 면적 규모 원 표시 */
  focus?: { query: string; areaSqm: number; label: string } | null;
  /** 지도 이동 멈춤 시 중심 좌표의 시군구 감지 콜백 (법정동 코드 5자리, 시도+시군구명) */
  onRegionDetect?: (lawdCd5: string, fullName: string) => void;
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
export default function KakaoMap({ regionQuery, rows, onSelectDong, focus, onRegionDetect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const focusShapes = useRef<any[]>([]);
  const entriesRef = useRef<DongEntry[]>([]);
  const geocodeCache = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState(true);
  /** 지도 조작으로 권역이 바뀐 직후에는 프로그램적 재센터링을 억제 */
  const suppressRecenterUntil = useRef(0);
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

  const geocode = useCallback((addr: string) => {
    return new Promise<any>((resolve) => {
      const cached = geocodeCache.current.get(addr);
      if (cached !== undefined) return resolve(cached);
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(addr, (result: any[], status: string) => {
        const pos =
          status === window.kakao.maps.services.Status.OK && result.length > 0
            ? new window.kakao.maps.LatLng(Number(result[0].y), Number(result[0].x))
            : null;
        // 실패(null)는 캐시하지 않음 — 일시적 호출 제한이 영구 실패로 굳는 것 방지
        if (pos) geocodeCache.current.set(addr, pos);
        resolve(pos);
      });
    });
  }, []);

  /**
   * 폴백 지오코딩 — 주 쿼리 실패 시 구 단위 토큰을 뺀 쿼리로 재시도.
   * 예: "경기 화성시 병점구 진안동" 실패 → "경기 화성시 진안동"
   */
  const geocodeWithFallback = useCallback(
    async (primary: string) => {
      let pos = await geocode(primary);
      if (pos) return pos;
      const tokens = primary.split(/\s+/);
      if (tokens.length >= 4) {
        const fallback = [...tokens.slice(0, -2), tokens[tokens.length - 1]].join(" ");
        pos = await geocode(fallback);
      }
      return pos;
    },
    [geocode]
  );

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
      center: new window.kakao.maps.LatLng(37.5665, 126.978), // 초기값 — 지오코딩 후 이동
      level: 9,
    });
    window.kakao.maps.event.addListener(mapObj.current, "zoom_changed", renderOverlays);
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__map = mapObj.current;
    }
  }, [ready, renderOverlays]);

  // 지적편집도 오버레이 (확대 시 필지 경계·용도지역 표시)
  useEffect(() => {
    if (!ready || !mapObj.current) return;
    const type = window.kakao.maps.MapTypeId.USE_DISTRICT;
    if (district) mapObj.current.addOverlayMapTypeId(type);
    else mapObj.current.removeOverlayMapTypeId(type);
  }, [ready, district]);

  // 선택 거래 포커스 — 법정동 근사 위치로 확대 이동 + 면적 규모 원
  useEffect(() => {
    if (!ready || !mapObj.current) return;
    focusShapes.current.forEach((s) => s.setMap(null));
    focusShapes.current = [];
    if (!focus) return;

    let cancelled = false;
    (async () => {
      const pos = await geocodeWithFallback(focus.query);
      if (cancelled || !pos) return;

      const radius = Math.max(Math.sqrt(focus.areaSqm / Math.PI), 8);
      const circle = new window.kakao.maps.Circle({
        center: pos,
        radius,
        strokeWeight: 2,
        strokeColor: "#047857",
        strokeOpacity: 0.9,
        fillColor: "#10B981",
        fillOpacity: 0.25,
      });
      circle.setMap(mapObj.current);

      const el = document.createElement("div");
      el.className =
        "rounded bg-emerald-800/95 text-white text-[11px] px-2 py-1 shadow whitespace-nowrap";
      el.innerText = focus.label;
      const label = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: 2.4,
      });
      label.setMap(mapObj.current);

      focusShapes.current = [circle, label];
      mapObj.current.setLevel(3);
      mapObj.current.panTo(pos);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, focus, geocodeWithFallback]);

  // 권역 변경 시 지오코딩으로 중심 이동 (지도 조작으로 감지된 변경이면 억제)
  useEffect(() => {
    if (!ready || !mapObj.current) return;
    if (Date.now() < suppressRecenterUntil.current) return;
    let cancelled = false;
    (async () => {
      const pos = await geocode(regionQuery);
      if (!cancelled && pos) mapObj.current.setCenter(pos);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, regionQuery, geocode]);

  // 지도 이동 멈춤(idle) 시 중심 좌표의 시군구를 역지오코딩으로 감지
  useEffect(() => {
    if (!ready || !mapObj.current || !onRegionDetect) return;
    const map = mapObj.current;
    const geocoder = new window.kakao.maps.services.Geocoder();
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const c = map.getCenter();
        geocoder.coord2RegionCode(c.getLng(), c.getLat(), (result: any[], status: string) => {
          if (status !== window.kakao.maps.services.Status.OK) return;
          const b = result.find((r) => r.region_type === "B") ?? result[0];
          if (!b?.code) return;
          suppressRecenterUntil.current = Date.now() + 3000;
          onRegionDetect(
            String(b.code).slice(0, 5),
            `${b.region_1depth_name ?? ""} ${b.region_2depth_name ?? ""}`.trim()
          );
        });
      }, 400);
    };
    window.kakao.maps.event.addListener(map, "idle", handler);
    return () => {
      clearTimeout(timer);
      window.kakao.maps.event.removeListener(map, "idle", handler);
    };
  }, [ready, onRegionDetect]);

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

    let cancelled = false;
    (async () => {
      const entries: DongEntry[] = [];
      for (const [dong, agg] of byDong) {
        const pos = await geocodeWithFallback(`${regionQuery} ${dong}`);
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
  }, [ready, rows, regionQuery, renderOverlays, geocodeWithFallback]);

  if (!appKey) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되지 않아 지도를 표시할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <button
        onClick={() => setDistrict((d) => !d)}
        className={`absolute right-2 top-2 z-10 rounded border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm transition-colors ${
          district
            ? "border-emerald-600 bg-emerald-700 text-white"
            : "border-slate-300 bg-white/95 text-slate-600"
        }`}
      >
        지적편집도
      </button>
    </div>
  );
}
