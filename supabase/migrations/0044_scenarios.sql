-- ============================================================================
-- 시나리오 목록
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **행적을 손으로 치지 않고 골라 적기 위한 표다**(형님이 정했다).           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 행적(`0042`)이 시나리오 번호·위치 코드·장소 이름을 자유 입력으로 받는다. 갈 때마다
-- 셋을 치는 것은 일이고, 무엇보다 **사람마다 다르게 적으면 같은 곳이 여러 이름으로
-- 남는다** — 상점·업적을 목록에서 고르게 한 것과 같은 까닭이다(구현 결정 345·352).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **이름은 DB에만 있다 — 레포에도 마이그레이션에도 값을 안 적는다.**        │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 시나리오 이름은 책자에 인쇄된 게임 콘텐츠라 클래스 이름·특혜 글·보물 색인과 같은
-- 등급이다(구현 결정 111·135·462). 레포와 배포 사이트가 공개이므로 커밋하는 순간
-- 공개 배포가 되고, 그 선은 그대로다 — **여기에는 표와 정책만 있다.**
--
-- 번호와 위치 코드는 세계 지도에 인쇄돼 있어 처음부터 보이는 것이지만, 이름과 한
-- 표에 들어가므로 함께 DB에 둔다.
-- ============================================================================

create table if not exists public.scenarios (
  /** 책자에 박힌 번호. **이것이 열쇠다**(보물 색인과 같은 짜임, `0041`). */
  no         smallint primary key check (no between 1 and 999),
  /** 세계 지도의 칸. `글자-숫자` 꼴이며 지도에 인쇄돼 있다. */
  grid       text not null default '' check (length(grid) <= 12),
  /** 장소 이름. 책자에 인쇄된 글이다. */
  name       text not null default '' check (length(name) <= 120),
  created_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

/* 읽는 것은 승인된 사람, 쓰는 것은 관리자 — 보물 색인·클래스 수치와 같다. */
drop policy if exists "시나리오: 승인된 사람이 본다" on public.scenarios;
create policy "시나리오: 승인된 사람이 본다"
  on public.scenarios for select to authenticated
  using (public.is_approved());

drop policy if exists "시나리오: 관리자가 넣는다" on public.scenarios;
create policy "시나리오: 관리자가 넣는다"
  on public.scenarios for insert to authenticated
  with check (public.is_admin());

drop policy if exists "시나리오: 관리자가 고친다" on public.scenarios;
create policy "시나리오: 관리자가 고친다"
  on public.scenarios for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "시나리오: 관리자가 지운다" on public.scenarios;
create policy "시나리오: 관리자가 지운다"
  on public.scenarios for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 클리어 여부는 행적의 줄이 들고 있다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **「그 시나리오를 깼는가」가 아니라 「그때 깼는가」다.**                   │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 기록지에 「깬 시나리오 목록」을 따로 두지 않는다. 같은 시나리오를 두 번 가는 일이
-- 있고(실패한 뒤 다시 간다) **그때마다 결과가 다르다** — 행적의 줄이 한 번의 방문
-- 이므로 결과도 거기 붙는 것이 맞다.
--
-- 세 값이다: 아직 안 적음(`null`) · 깸(`true`) · 못 깸(`false`). **빈 것과 실패를
-- 같은 값으로 두지 않는다**(구현 결정 115).

alter table public.itinerary
  add column if not exists cleared boolean;

/** 어느 시나리오였나. 시나리오가 아닌 곳(도시·길)은 비어 있다. */
alter table public.itinerary
  add column if not exists scenario_no smallint;
