-- ============================================================================
-- 업적 목록 — 상점과 같은 짜임, 값만 없다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **함께 적어 두고 골라 담는다.**                                           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 업적 이름은 여태 파티 기록지에서 손으로 쳤다 — 같은 것을 사람마다 다르게 적어
-- 놓으면 나중에 무엇이 무엇인지 알 수 없다. 상점을 꼬리표 다는 결로 바꾼 것과
-- 같은 까닭이며(구현 결정 345) **다른 것은 값이 없다는 것뿐**이다(형님이 정했다).
--
-- 이름은 게임 콘텐츠다 — **DB에만 둔다**(구현 결정 111·135). 레포와 배포물에는
-- 표와 정책뿐이고 마이그레이션 SQL에도 값을 안 적는다.
--
-- 읽는 것도 쓰는 것도 승인된 사람이며 지우는 것만 적은 사람과 관리자다 —
-- 상점과 같다(구현 결정 330).
-- ============================================================================

create table if not exists public.achievements (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

/*
  겹치는지 보는 눈은 화면과 같다(`searchFold.ts`) — 공백을 통째로 빼고, 대소문자를
  지우고, NFC로 모은다. **화면이 「없다」고 보는 것과 서버가 「있다」고 막는 것이
  갈리면 사람은 왜 안 되는지 알 수 없다**(구현 결정 351).
*/
create unique index if not exists achievements_name_idx
  on public.achievements ((lower(normalize(regexp_replace(name, '\s', '', 'g'), nfc))));

alter table public.achievements enable row level security;

drop policy if exists "업적: 승인된 사람이 본다" on public.achievements;
create policy "업적: 승인된 사람이 본다"
  on public.achievements for select
  to authenticated
  using (public.is_approved());

drop policy if exists "업적: 승인된 사람이 적는다" on public.achievements;
create policy "업적: 승인된 사람이 적는다"
  on public.achievements for insert
  to authenticated
  with check (public.is_approved() and created_by = auth.uid());

drop policy if exists "업적: 적은 사람이 지운다" on public.achievements;
create policy "업적: 적은 사람이 지운다"
  on public.achievements for delete
  to authenticated
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));
