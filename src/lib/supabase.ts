import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** 조회 전용 클라이언트 (anon key, RLS로 select만 허용) */
export function supabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 필요합니다.");
  }
  return createClient(url, key);
}

/** 적재용 클라이언트 (service role key, 서버 전용) */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** land_transactions 테이블 행 타입 */
export interface LandTransaction {
  id?: number;
  lawd_cd: string;
  sgg_nm: string | null;
  umd_nm: string | null;
  jibun: string | null;
  jimok: string | null;
  use_zone: string | null;
  area_sqm: number;
  deal_amount_manwon: number;
  deal_year: number;
  deal_month: number;
  deal_day: number | null;
  share_dealing: boolean;
  dealing_type: string | null;
  cancel_deal: boolean;
}
