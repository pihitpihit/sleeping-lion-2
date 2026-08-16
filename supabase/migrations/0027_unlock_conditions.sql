-- ============================================================================
-- 봉투·상자 개봉을 위한 특수 조건
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **인쇄된 캠페인 시트의 그 칸이다 — 글은 DB에만 둔다.**                    │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 형님이 실물 시트를 찍어 보내 주었다. 「파티 평판이 10점 이상이 됨」처럼 조건이
-- 줄로 늘어서고 줄마다 체크상자가 붙는데, 하나는 상자가 열 개다(금화 기부).
--
-- 특혜 표와 **판박이다**(`0013`): 글은 게임 콘텐츠라 레포·배포물에 안 담기고
-- (절대 원칙 1) 마이그레이션 SQL에도 값을 안 적는다. 값은 앱 안의 관리자 화면
-- 에서 들어간다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **켠 것은 줄 번호가 아니라 조건 id로 센다.**                              │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 특혜는 상자 번호를 통째로 이어 붙여 셌지만(구현 결정 136) 그 짜임은 **표를 다시
-- 넣을 때 번호가 밀리면 켠 것이 딴 줄을 가리킨다**(구현 결정 137이 통째로 갈아
-- 끼우는 까닭이다). 여기서는 조건마다 제 id를 두고 **몇 칸 켰는지**만 센다 —
-- 줄이 늘거나 순서가 바뀌어도 켠 것이 안 흔들린다.
-- ============================================================================

create table if not exists public.unlock_conditions (
  id         uuid primary key default gen_random_uuid(),
  /** 시트에 적힌 줄 그대로. */
  text       text not null check (length(trim(text)) between 1 and 400),
  /** 그 줄에 붙은 체크상자 수. 금화 기부처럼 여럿인 줄이 있다. */
  boxes      smallint not null default 1 check (boxes between 1 and 20),
  /** 시트에 적힌 차례. */
  sort       smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.unlock_conditions enable row level security;

/* 읽는 것은 승인된 사람, 쓰는 것은 관리자 — 클래스 수치·특혜와 같다(`0011`·`0013`). */
drop policy if exists "개봉 조건: 승인된 사람이 본다" on public.unlock_conditions;
create policy "개봉 조건: 승인된 사람이 본다"
  on public.unlock_conditions for select
  to authenticated
  using (public.is_approved());

drop policy if exists "개봉 조건: 관리자가 넣는다" on public.unlock_conditions;
create policy "개봉 조건: 관리자가 넣는다"
  on public.unlock_conditions for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "개봉 조건: 관리자가 고친다" on public.unlock_conditions;
create policy "개봉 조건: 관리자가 고친다"
  on public.unlock_conditions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "개봉 조건: 관리자가 지운다" on public.unlock_conditions;
create policy "개봉 조건: 관리자가 지운다"
  on public.unlock_conditions for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 파티가 어디까지 왔는가
-- ----------------------------------------------------------------------------
-- `{ "<조건 id>": 켠 칸 수 }`. 없는 열쇠는 0으로 읽는다 — 빈 값을 굳이 적어 두지
-- 않는다. 고치는 것은 파티원 누구나이며(구현 결정 44) 정책은 `campaigns`의 것을
-- 그대로 탄다.

alter table public.campaigns
  add column if not exists unlocks jsonb not null default '{}'::jsonb;
