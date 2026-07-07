"use client";

import { useEffect, useRef, useState } from "react";
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

/** 읍면동 단위로 거래를 집계해 지도에 원형 오버레이로 표시 */
export default function KakaoMap({ center, regionName, rows, onSelectDong }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const overlays = useRef<any[]>([]);
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

  // 지도 생성
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    mapObj.current = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(center.lat, center.lng),
      level: 9,
    });
  }, [ready, center]);

  // 권역 변경 시 중심 이동
  useEffect(() => {
    if (!mapObj.current) return;
    mapObj.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
  }, [center]);

  // 거래 데이터 → 동별 집계 오버레이
  useEffect(() => {
    if (!ready || !mapObj.current) return;

    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];

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
    byDong.forEach((agg, dong) => {
      geocoder.addressSearch(`${regionName} ${dong}`, (result: any[], status: string) => {
        if (status !== window.kakao.maps.services.Status.OK || result.length === 0) return;
        const pos = new window.kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
        const avg = Math.round(agg.sumPricePerPyeong / agg.count);

        const el = document.createElement("div");
        el.className =
          "rounded-full bg-blue-600/85 text-white text-xs px-2.5 py-1.5 shadow-lg cursor-pointer whitespace-nowrap hover:bg-blue-500";
        el.innerHTML = `<b>${dong}</b> ${agg.count}건 · 평당 ${avg.toLocaleString()}만`;
        el.onclick = () => onSelectDong?.(dong);

        const overlay = new window.kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 0.5 });
        overlay.setMap(mapObj.current);
        overlays.current.push(overlay);
      });
    });
  }, [ready, rows, regionName, onSelectDong]);

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
