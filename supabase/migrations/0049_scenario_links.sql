-- ============================================================================
-- 시나리오끼리의 연결 — 깨면 무엇이 열리고 무엇이 막히는가
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **번호의 관계뿐이다. 값은 여기 없고 DB에만 넣는다.**                      │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 시나리오를 완료로 바꿔도 다음에 무엇이 열리는지 사람이 책자를 펴서 손으로
-- 열고 있었다. 이 관계가 있으면 「○·○가 열린다 — 열까?」를 권할 수 있고,
-- **깨면 영영 막히는 갈림길**을 깨기 전에 알려 줄 수 있다.
--
-- 자료는 시나리오 목록과 같은 곳(Gloomhaven Secretariat)에서 왔다(구현 결정
-- 531). 목록과 같은 선으로 **레포·마이그레이션에는 값을 안 적는다.**
--
-- 갈래는 넷이다(GHS의 칸 이름 그대로 뜻을 옮겼다):
--   * `unlocks` — 깨면 열린다.
--   * `choose`  — 깨면 이 가운데 **하나를 골라** 연다(GHS `rewards.chooseLocation`).
--   * `links`   — 깬 자리에서 곧바로 이어 갈 수 있다. 열기는 `unlocks`가 따로 적는다.
--   * `blocks`  — 깨면 막힌다.
--
-- 「이 시나리오들을 깼어야 간다」는 따로 둔다(`scenario_requires`). 묶음 안은
-- **모두**, 묶음끼리는 **하나라도**다 — `[[A, B], [A, C]]`는 「A와 B」
-- 또는 「A와 C」다. GHS가 `requires: string[][]`로 적는 꼴 그대로다.
--
-- 업적을 거치는 조건(「업적 X가 없어야 한다」)은 여기 없다 — 시나리오끼리의
-- 관계가 아니고 업적 이름을 우리 목록과 이어 주는 일이 따로 있다.
--
-- 외래키는 걸지 않는다 — 목록 표를 다시 넣을 때 흔들리면 안 된다(`0048`과 같은 결).
-- ============================================================================

create table if not exists public.scenario_links (
  from_no smallint not null check (from_no between 1 and 999),
  to_no   smallint not null check (to_no between 1 and 999),
  kind    text not null check (kind in ('unlocks', 'choose', 'links', 'blocks')),
  primary key (from_no, to_no, kind)
);

create table if not exists public.scenario_requires (
  no  smallint not null check (no between 1 and 999),
  /** 묶음 번호. 같은 묶음끼리는 「모두」, 묶음끼리는 「하나라도」. */
  grp smallint not null check (grp between 0 and 99),
  req smallint not null check (req between 1 and 999),
  primary key (no, grp, req)
);

alter table public.scenario_links enable row level security;
alter table public.scenario_requires enable row level security;

/* 시나리오 목록과 같은 자격 — 읽는 것은 승인된 사람, 쓰는 것은 관리자. */
drop policy if exists "시나리오 연결: 승인된 사람이 본다" on public.scenario_links;
create policy "시나리오 연결: 승인된 사람이 본다"
  on public.scenario_links for select to authenticated
  using (public.is_approved());

drop policy if exists "시나리오 연결: 관리자가 넣는다" on public.scenario_links;
create policy "시나리오 연결: 관리자가 넣는다"
  on public.scenario_links for insert to authenticated
  with check (public.is_admin());

drop policy if exists "시나리오 연결: 관리자가 지운다" on public.scenario_links;
create policy "시나리오 연결: 관리자가 지운다"
  on public.scenario_links for delete to authenticated
  using (public.is_admin());

drop policy if exists "시나리오 선행: 승인된 사람이 본다" on public.scenario_requires;
create policy "시나리오 선행: 승인된 사람이 본다"
  on public.scenario_requires for select to authenticated
  using (public.is_approved());

drop policy if exists "시나리오 선행: 관리자가 넣는다" on public.scenario_requires;
create policy "시나리오 선행: 관리자가 넣는다"
  on public.scenario_requires for insert to authenticated
  with check (public.is_admin());

drop policy if exists "시나리오 선행: 관리자가 지운다" on public.scenario_requires;
create policy "시나리오 선행: 관리자가 지운다"
  on public.scenario_requires for delete to authenticated
  using (public.is_admin());

/* 2026-10-30부터 새 표는 권한을 직접 준다(구현 결정 632). */
grant select on public.scenario_links, public.scenario_requires to anon;
grant select, insert, update, delete
  on public.scenario_links, public.scenario_requires to authenticated, service_role;
