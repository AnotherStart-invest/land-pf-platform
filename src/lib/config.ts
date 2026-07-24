/**
 * 서비스 대상 권역 — 수도권 전체 시군구 (법정동 코드 앞 5자리).
 *
 * 전체 코드를 실거래가 API에 직접 조회해 검증한 목록 (2026-07 기준).
 * 행정구역 개편 반영: 화성시 4구(2025), 부천시 3구 재설치,
 * 인천 제물포·영종·서해·검단구(2026-07).
 * 지도 중심좌표는 하드코딩하지 않고 클라이언트에서 지오코딩한다.
 */
export interface Region {
  /** 법정동 코드 앞 5자리 */
  lawdCd: string;
  /** 시군구명 (API sggNm 기준) */
  name: string;
  /** 시도 (선택 UI 그룹, 지오코딩 접두어) */
  province: string;
}

const 서울 = "서울";
const 인천 = "인천";
const 경기 = "경기";
const 충남 = "충남";

export const REGIONS: Region[] = [
  // 서울 25구
  { lawdCd: "11110", name: "종로구", province: 서울 },
  { lawdCd: "11140", name: "중구", province: 서울 },
  { lawdCd: "11170", name: "용산구", province: 서울 },
  { lawdCd: "11200", name: "성동구", province: 서울 },
  { lawdCd: "11215", name: "광진구", province: 서울 },
  { lawdCd: "11230", name: "동대문구", province: 서울 },
  { lawdCd: "11260", name: "중랑구", province: 서울 },
  { lawdCd: "11290", name: "성북구", province: 서울 },
  { lawdCd: "11305", name: "강북구", province: 서울 },
  { lawdCd: "11320", name: "도봉구", province: 서울 },
  { lawdCd: "11350", name: "노원구", province: 서울 },
  { lawdCd: "11380", name: "은평구", province: 서울 },
  { lawdCd: "11410", name: "서대문구", province: 서울 },
  { lawdCd: "11440", name: "마포구", province: 서울 },
  { lawdCd: "11470", name: "양천구", province: 서울 },
  { lawdCd: "11500", name: "강서구", province: 서울 },
  { lawdCd: "11530", name: "구로구", province: 서울 },
  { lawdCd: "11545", name: "금천구", province: 서울 },
  { lawdCd: "11560", name: "영등포구", province: 서울 },
  { lawdCd: "11590", name: "동작구", province: 서울 },
  { lawdCd: "11620", name: "관악구", province: 서울 },
  { lawdCd: "11650", name: "서초구", province: 서울 },
  { lawdCd: "11680", name: "강남구", province: 서울 },
  { lawdCd: "11710", name: "송파구", province: 서울 },
  { lawdCd: "11740", name: "강동구", province: 서울 },
  // 인천 11개 군구 (2026-07 개편 반영)
  { lawdCd: "28125", name: "제물포구", province: 인천 },
  { lawdCd: "28155", name: "영종구", province: 인천 },
  { lawdCd: "28177", name: "미추홀구", province: 인천 },
  { lawdCd: "28185", name: "연수구", province: 인천 },
  { lawdCd: "28200", name: "남동구", province: 인천 },
  { lawdCd: "28237", name: "부평구", province: 인천 },
  { lawdCd: "28245", name: "계양구", province: 인천 },
  { lawdCd: "28275", name: "서해구", province: 인천 },
  { lawdCd: "28290", name: "검단구", province: 인천 },
  { lawdCd: "28710", name: "강화군", province: 인천 },
  { lawdCd: "28720", name: "옹진군", province: 인천 },
  // 경기 47개 시군구
  { lawdCd: "41111", name: "수원시 장안구", province: 경기 },
  { lawdCd: "41113", name: "수원시 권선구", province: 경기 },
  { lawdCd: "41115", name: "수원시 팔달구", province: 경기 },
  { lawdCd: "41117", name: "수원시 영통구", province: 경기 },
  { lawdCd: "41131", name: "성남시 수정구", province: 경기 },
  { lawdCd: "41133", name: "성남시 중원구", province: 경기 },
  { lawdCd: "41135", name: "성남시 분당구", province: 경기 },
  { lawdCd: "41150", name: "의정부시", province: 경기 },
  { lawdCd: "41171", name: "안양시 만안구", province: 경기 },
  { lawdCd: "41173", name: "안양시 동안구", province: 경기 },
  { lawdCd: "41192", name: "부천시 원미구", province: 경기 },
  { lawdCd: "41194", name: "부천시 소사구", province: 경기 },
  { lawdCd: "41196", name: "부천시 오정구", province: 경기 },
  { lawdCd: "41210", name: "광명시", province: 경기 },
  { lawdCd: "41220", name: "평택시", province: 경기 },
  { lawdCd: "41250", name: "동두천시", province: 경기 },
  { lawdCd: "41271", name: "안산시 상록구", province: 경기 },
  { lawdCd: "41273", name: "안산시 단원구", province: 경기 },
  { lawdCd: "41281", name: "고양시 덕양구", province: 경기 },
  { lawdCd: "41285", name: "고양시 일산동구", province: 경기 },
  { lawdCd: "41287", name: "고양시 일산서구", province: 경기 },
  { lawdCd: "41290", name: "과천시", province: 경기 },
  { lawdCd: "41310", name: "구리시", province: 경기 },
  { lawdCd: "41360", name: "남양주시", province: 경기 },
  { lawdCd: "41370", name: "오산시", province: 경기 },
  { lawdCd: "41390", name: "시흥시", province: 경기 },
  { lawdCd: "41410", name: "군포시", province: 경기 },
  { lawdCd: "41430", name: "의왕시", province: 경기 },
  { lawdCd: "41450", name: "하남시", province: 경기 },
  { lawdCd: "41461", name: "용인시 처인구", province: 경기 },
  { lawdCd: "41463", name: "용인시 기흥구", province: 경기 },
  { lawdCd: "41465", name: "용인시 수지구", province: 경기 },
  { lawdCd: "41480", name: "파주시", province: 경기 },
  { lawdCd: "41500", name: "이천시", province: 경기 },
  { lawdCd: "41550", name: "안성시", province: 경기 },
  { lawdCd: "41570", name: "김포시", province: 경기 },
  { lawdCd: "41591", name: "화성시 만세구", province: 경기 },
  { lawdCd: "41593", name: "화성시 효행구", province: 경기 },
  { lawdCd: "41595", name: "화성시 병점구", province: 경기 },
  { lawdCd: "41597", name: "화성시 동탄구", province: 경기 },
  { lawdCd: "41610", name: "광주시", province: 경기 },
  { lawdCd: "41630", name: "양주시", province: 경기 },
  { lawdCd: "41650", name: "포천시", province: 경기 },
  { lawdCd: "41670", name: "여주시", province: 경기 },
  { lawdCd: "41800", name: "연천군", province: 경기 },
  { lawdCd: "41820", name: "가평군", province: 경기 },
  { lawdCd: "41830", name: "양평군", province: 경기 },
  // 충남 16개 시군구 (천안·아산 중심 개발권역)
  { lawdCd: "44131", name: "천안시 동남구", province: 충남 },
  { lawdCd: "44133", name: "천안시 서북구", province: 충남 },
  { lawdCd: "44150", name: "공주시", province: 충남 },
  { lawdCd: "44180", name: "보령시", province: 충남 },
  { lawdCd: "44200", name: "아산시", province: 충남 },
  { lawdCd: "44210", name: "서산시", province: 충남 },
  { lawdCd: "44230", name: "논산시", province: 충남 },
  { lawdCd: "44250", name: "계룡시", province: 충남 },
  { lawdCd: "44270", name: "당진시", province: 충남 },
  { lawdCd: "44710", name: "금산군", province: 충남 },
  { lawdCd: "44760", name: "부여군", province: 충남 },
  { lawdCd: "44770", name: "서천군", province: 충남 },
  { lawdCd: "44790", name: "청양군", province: 충남 },
  { lawdCd: "44800", name: "홍성군", province: 충남 },
  { lawdCd: "44810", name: "예산군", province: 충남 },
  { lawdCd: "44825", name: "태안군", province: 충남 },
];

export const PROVINCES = [서울, 인천, 경기, 충남];

export const DEFAULT_REGION = REGIONS.find((r) => r.lawdCd === "41591")!;

/** ingest 시 기본으로 수집할 개월 수 (당월 포함 과거 N개월) */
export const DEFAULT_INGEST_MONTHS = 2;
