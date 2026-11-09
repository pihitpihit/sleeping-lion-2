-- ============================================================================
-- 시나리오마다 놓인 보물 번호
-- ----------------------------------------------------------------------------
-- 보물 타일에는 번호가 박혀 있고(`0041`의 색인 번호) 한 시나리오에 하나 또는 몇 개가
-- 놓인다. 기록지는 찾은 번호를 들고 있으므로(`campaigns.treasures`) 시나리오마다 어떤
-- 번호가 놓였는지 알면 「아직 안 찾은 보물」을 셈할 수 있다.
--
-- 번호가 없는 금화 보물은 담지 않는다 — 찾았는지 기록지가 적지 않는다.
--
-- **값은 레포에 적지 않는다**(구현 결정 532) — 시나리오 목록과 같은 GHS에서 와서
-- DB에만 들어간다. 이 파일에는 표와 정책만 있다.
-- ============================================================================

create table if not exists public.scenario_treasures (
  no       smallint not null check (no between 1 and 999),
  treasure smallint not null check (treasure between 1 and 999),
  primary key (no, treasure)
);

alter table public.scenario_treasures enable row level security;

/* 시나리오 연결과 같은 자격 — 읽는 것은 승인된 사람, 쓰는 것은 관리자. */
drop policy if exists "시나리오 보물: 승인된 사람이 본다" on public.scenario_treasures;
create policy "시나리오 보물: 승인된 사람이 본다"
  on public.scenario_treasures for select to authenticated
  using (public.is_approved());
drop policy if exists "시나리오 보물: 관리자가 넣는다" on public.scenario_treasures;
create policy "시나리오 보물: 관리자가 넣는다"
  on public.scenario_treasures for insert to authenticated
  with check (public.is_admin());
drop policy if exists "시나리오 보물: 관리자가 지운다" on public.scenario_treasures;
create policy "시나리오 보물: 관리자가 지운다"
  on public.scenario_treasures for delete to authenticated
  using (public.is_admin());

/* 새 표는 권한을 직접 준다(구현 결정 632). */
grant select on public.scenario_treasures to anon;
grant select, insert, update, delete on public.scenario_treasures to authenticated, service_role;
