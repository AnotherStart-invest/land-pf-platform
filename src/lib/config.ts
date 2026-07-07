/**
 * 서비스 대상 권역 설정.
 * 법정동 코드 앞 5자리(시군구 단위) 기준 — 다른 지역으로 확장하려면 여기에 추가.
 * 코드 조회: https://www.code.go.kr (행정표준코드관리시스템)
 *
 * 주의: 화성시는 2025년 일반구 4개(만세·효행·병점·동탄) 신설로
 * 기존 41590 코드가 더 이상 실거래 API에서 조회되지 않는다.
 */
export interface Region {
  /** 법정동 코드 앞 5자리 */
  lawdCd: string;
  name: string;
  /** 지도 초기 중심 좌표 */
  center: { lat: number; lng: number };
}

export const REGIONS: Region[] = [
  { lawdCd: "41591", name: "화성시 만세구", center: { lat: 37.2069, lng: 126.8231 } },
  { lawdCd: "41593", name: "화성시 효행구", center: { lat: 37.2160, lng: 126.9530 } },
  { lawdCd: "41595", name: "화성시 병점구", center: { lat: 37.2074, lng: 127.0332 } },
  { lawdCd: "41597", name: "화성시 동탄구", center: { lat: 37.2000, lng: 127.0960 } },
  { lawdCd: "41220", name: "평택시", center: { lat: 36.9921, lng: 127.1129 } },
];

export const DEFAULT_REGION = REGIONS[0];

/** ingest 시 기본으로 수집할 개월 수 (당월 포함 과거 N개월) */
export const DEFAULT_INGEST_MONTHS = 6;
