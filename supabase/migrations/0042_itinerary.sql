-- ============================================================================
-- 파티의 행적
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **「머무는 곳」 한 칸을 행적이 대신한다**(형님이 정했다).                  │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 지금까지 파티가 어디 있는지는 자유 입력 한 칸이었다(`campaigns.location`).
-- 그러면 **지나온 자리가 남지 않는다** — 다음 곳으로 옮기면 앞의 것이 지워진다.
-- 한 줄씩 쌓아 두면 그것이 곧 파티의 행적이고, **맨 위가 지금 머무는 곳**이다.
--
-- 적는 칸이 둘로 늘지 않게 옛 칸은 걷는다: 들어 있던 값을 행적의 첫 줄로 옮기고
-- 열을 지운다 — **창구를 둘로 두면 어긋난다**(구현 결정 247).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **글은 사람이 적는다 — 우리가 목록을 담지 않는다.**                       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 시나리오 번호·위치 코드·장소 이름 셋 다 자유 입력이다. 시나리오 이름은 책자에
-- 인쇄된 것이라 우리가 목록으로 담지 않고(절대 원칙 1), **사용자가 적은 라벨**로
-- 둔다 — 파티 업적과 같은 등급이다(구현 결정 2).
-- ============================================================================

create table if not exists public.itinerary (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  /**
   * 그 자리에 있던 날. **비워 둘 수 있다.**
   *
   * 날짜가 있으면 그 순서로 세우고, 없으면 사람이 끼워 넣은 자리를 지킨다
   * (`itinerary.ts`의 `placeByDate`). 지난 판을 뒤늦게 적을 때 날짜를 기억
   * 못 하는 일이 흔하다.
   */
  at          date,
  /**
   * 화면에 서는 차례. **0이 맨 위(지금 머무는 곳)다.**
   *
   * 날짜는 차례를 **정하는 데 쓰이고** 차례 자체는 이 칸이 들고 있다 — 날짜
   * 없는 줄이 섞여 있으므로 날짜만으로는 세울 수가 없다.
   */
  sort        smallint not null default 0,
  /** 시나리오 번호. `7`·`7a`처럼 적히므로 수가 아니라 글자다. */
  scenario    text not null default '' check (length(scenario) <= 20),
  /** 지도의 위치 코드(`G-12`). */
  code        text not null default '' check (length(code) <= 20),
  /** 장소 이름. 사람이 적는다. */
  place       text not null default '' check (length(place) <= 120),
  created_at  timestamptz not null default now()
);

create index if not exists itinerary_by_campaign_idx
  on public.itinerary (campaign_id, sort);

alter table public.itinerary enable row level security;

/*
  **파티 상태는 함께 쓰는 것이다**(구현 결정 44). 기록지와 같은 자격으로 본다 —
  `campaigns`의 정책과 나란히 두어 한쪽만 열리는 일이 없게 한다.
*/
drop policy if exists "행적: 파티원이 본다" on public.itinerary;
create policy "행적: 파티원이 본다"
  on public.itinerary for select to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "행적: 파티원이 적는다" on public.itinerary;
create policy "행적: 파티원이 적는다"
  on public.itinerary for insert to authenticated
  with check (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "행적: 파티원이 고친다" on public.itinerary;
create policy "행적: 파티원이 고친다"
  on public.itinerary for update to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)))
  with check (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "행적: 파티원이 지운다" on public.itinerary;
create policy "행적: 파티원이 지운다"
  on public.itinerary for delete to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)));

-- ----------------------------------------------------------------------------
-- 옛 칸을 옮긴다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **지우기 전에 옮긴다.** 들어 있던 값을 잃지 않는다.                       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 적혀 있던 곳은 **날짜 없는 첫 줄**이 된다 — 언제부터 거기 있었는지는 우리가
-- 알 수 없으므로 짐작해서 날짜를 넣지 않는다(구현 결정 115).
--
-- 로그의 옛 줄은 `field: 'location'`을 그대로 들고 있고 화면이 그것을 우리말로
-- 옮긴다(`describeChange`) — **칸이 사라져도 지난 기록은 그대로 읽힌다.**

insert into public.itinerary (campaign_id, place, sort)
select c.id, trim(c.location), 0
  from public.campaigns c
 where c.location is not null
   and trim(c.location) <> ''
   and not exists (select 1 from public.itinerary i where i.campaign_id = c.id);

alter table public.campaigns drop column if exists location;
