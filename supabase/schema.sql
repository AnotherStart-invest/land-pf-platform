-- 토지 매매 실거래 테이블
-- Supabase SQL Editor에서 실행
create table if not exists land_transactions (
  id bigint generated always as identity primary key,
  lawd_cd text not null,                -- 법정동 코드 앞 5자리 (시군구)
  sgg_nm text,                          -- 시군구명
  umd_nm text,                          -- 법정동(읍면동)명
  jibun text,                           -- 지번 (개인정보보호로 일부만 공개됨)
  jimok text,                           -- 지목 (전/답/대/임야 등)
  use_zone text,                        -- 용도지역 (API 제공 시)
  area_sqm numeric not null,            -- 거래면적 (㎡)
  deal_amount_manwon bigint not null,   -- 거래금액 (만원)
  deal_year int not null,
  deal_month int not null,
  deal_day int,
  share_dealing boolean default false,  -- 지분거래 여부
  dealing_type text,                    -- 거래유형 (중개/직거래)
  cancel_deal boolean default false,    -- 해제여부
  created_at timestamptz default now(),

  -- 동일 거래 중복 적재 방지용 자연키
  unique (lawd_cd, umd_nm, jibun, deal_year, deal_month, deal_day, area_sqm, deal_amount_manwon)
);

create index if not exists idx_land_tx_region_period
  on land_transactions (lawd_cd, deal_year, deal_month);
create index if not exists idx_land_tx_area on land_transactions (area_sqm);
create index if not exists idx_land_tx_amount on land_transactions (deal_amount_manwon);

-- 공개 조회만 허용 (쓰기는 service role 키로만)
alter table land_transactions enable row level security;

drop policy if exists "public read" on land_transactions;
create policy "public read" on land_transactions
  for select using (true);
