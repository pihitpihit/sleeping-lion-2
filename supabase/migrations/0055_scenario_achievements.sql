-- ============================================================================
-- 시나리오의 업적 조건과 보상
-- ----------------------------------------------------------------------------
-- 시나리오끼리의 연결(`0049`)만으로는 갈림길의 절반이 안 보였다 — 「이 업적이
-- 있어야(없어야) 할 수 있다」는 조건과 「깨면 이 업적을 얻는다(잃는다)」는 보상이
-- 빠져 있었다. 그래서 #8을 깨 「상인 도주」를 얻으면 그 업적이 없어야 하는 #9가
-- 막힌다는 것을 앱이 몰랐다.
--
-- * **조건**은 묶음(`alt`)으로 든다. 묶음 안은 모두, 묶음끼리는 하나라도.
--   `negate`면 그 업적이 **없어야** 한다. `count`는 되풀이해 이루는 전역 업적의 횟수.
-- * **보상**은 얻음과 잃음(`lose`)이다.
-- * 업적은 열쇠(`achievements.code`, `0054`)로 가리킨다.
--
-- **값은 레포에 적지 않는다**(구현 결정 532) — 시나리오 목록과 같은 GHS에서 와서
-- DB에만 들어간다. 이 파일에는 표와 정책만 있다.
-- ============================================================================

create table if not exists public.scenario_achievement_reqs (
  no     smallint not null check (no between 1 and 999),
  alt    smallint not null check (alt between 0 and 99),
  scope  text not null check (scope in ('global', 'party')),
  code   text not null,
  negate boolean not null default false,
  count  smallint not null default 1 check (count between 1 and 99),
  primary key (no, alt, scope, code)
);

create table if not exists public.scenario_achievement_rewards (
  no    smallint not null check (no between 1 and 999),
  scope text not null check (scope in ('global', 'party')),
  code  text not null,
  lose  boolean not null default false,
  primary key (no, scope, code, lose)
);

alter table public.scenario_achievement_reqs enable row level security;
alter table public.scenario_achievement_rewards enable row level security;

/* 시나리오 연결과 같은 자격 — 읽는 것은 승인된 사람, 쓰는 것은 관리자. */
drop policy if exists "시나리오 업적 조건: 승인된 사람이 본다" on public.scenario_achievement_reqs;
create policy "시나리오 업적 조건: 승인된 사람이 본다"
  on public.scenario_achievement_reqs for select to authenticated
  using (public.is_approved());
drop policy if exists "시나리오 업적 조건: 관리자가 넣는다" on public.scenario_achievement_reqs;
create policy "시나리오 업적 조건: 관리자가 넣는다"
  on public.scenario_achievement_reqs for insert to authenticated
  with check (public.is_admin());
drop policy if exists "시나리오 업적 조건: 관리자가 지운다" on public.scenario_achievement_reqs;
create policy "시나리오 업적 조건: 관리자가 지운다"
  on public.scenario_achievement_reqs for delete to authenticated
  using (public.is_admin());

drop policy if exists "시나리오 업적 보상: 승인된 사람이 본다" on public.scenario_achievement_rewards;
create policy "시나리오 업적 보상: 승인된 사람이 본다"
  on public.scenario_achievement_rewards for select to authenticated
  using (public.is_approved());
drop policy if exists "시나리오 업적 보상: 관리자가 넣는다" on public.scenario_achievement_rewards;
create policy "시나리오 업적 보상: 관리자가 넣는다"
  on public.scenario_achievement_rewards for insert to authenticated
  with check (public.is_admin());
drop policy if exists "시나리오 업적 보상: 관리자가 지운다" on public.scenario_achievement_rewards;
create policy "시나리오 업적 보상: 관리자가 지운다"
  on public.scenario_achievement_rewards for delete to authenticated
  using (public.is_admin());

/* 새 표는 권한을 직접 준다(구현 결정 632). */
grant select on public.scenario_achievement_reqs, public.scenario_achievement_rewards to anon;
grant select, insert, update, delete
  on public.scenario_achievement_reqs, public.scenario_achievement_rewards
  to authenticated, service_role;
