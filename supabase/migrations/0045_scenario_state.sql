-- ============================================================================
-- 시나리오 상태
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **「그 방문의 결과」가 아니라 「지금 어떤 상태인가」다.**                  │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- `0044`에서 클리어 여부를 행적의 줄(`itinerary.cleared`)에 붙였다. 형님이 상태를
-- 넷으로 정하면서 그 자리가 틀렸다는 것이 드러났다 — **닫힘·열림은 방문에 붙을 수
-- 있는 값이 아니다.** 가 보지도 않은 시나리오가 닫혀 있고, 열린 것은 아직 안 간
-- 것이다. 넷 다 **캠페인이 그 시나리오를 어떻게 보고 있는가**를 말한다.
--
--   · 닫힘 — 아직 해금되지 않았다
--   · 열림 — 갈 수 있다
--   · 막힘 — 해금됐지만 지금은 갈 수 없다
--   · 완료 — 깼다
--
-- 「막힘」은 형님이 「못감」이라 부른 것이다. **칸에 서는 말은 두 글자로 맞춘다** —
-- 열림·닫힘과 같은 결이라야 넷이 한 벌로 읽힌다. 글자가 닮은 닫힘·막힘은 화면에서
-- 색으로 가른다(흐림 / 잉걸빛).
--
-- **없는 줄은 「닫힘」이다.** 아흔다섯 줄을 기록지마다 미리 깔지 않는다 — 처음에는
-- 전부 닫혀 있고, 손대는 것만 줄이 생긴다(개봉 조건이 켠 것만 담는 것과 같은 결).
-- ============================================================================

create table if not exists public.campaign_scenarios (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  /** 책자에 박힌 번호. `scenarios`를 가리키지만 **외래키를 걸지 않는다** — 목록이
      비어 있어도(값을 아직 안 넣었어도) 상태는 적을 수 있어야 한다(절대 원칙 3). */
  no          smallint not null check (no between 1 and 999),
  /** `open` · `blocked` · `done`. **`closed`는 줄이 없는 것으로 나타낸다.** */
  state       text not null check (state in ('open', 'blocked', 'done')),
  updated_at  timestamptz not null default now(),
  primary key (campaign_id, no)
);

alter table public.campaign_scenarios enable row level security;

/* **파티 상태는 함께 쓰는 것이다**(구현 결정 44) — 기록지와 같은 자격이다. */
drop policy if exists "시나리오 상태: 파티원이 본다" on public.campaign_scenarios;
create policy "시나리오 상태: 파티원이 본다"
  on public.campaign_scenarios for select to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "시나리오 상태: 파티원이 적는다" on public.campaign_scenarios;
create policy "시나리오 상태: 파티원이 적는다"
  on public.campaign_scenarios for insert to authenticated
  with check (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "시나리오 상태: 파티원이 고친다" on public.campaign_scenarios;
create policy "시나리오 상태: 파티원이 고친다"
  on public.campaign_scenarios for update to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)))
  with check (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "시나리오 상태: 파티원이 지운다" on public.campaign_scenarios;
create policy "시나리오 상태: 파티원이 지운다"
  on public.campaign_scenarios for delete to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)));

-- ----------------------------------------------------------------------------
-- 행적의 칸 하나를 걷는다
-- ----------------------------------------------------------------------------
-- `cleared`는 하루도 안 쓰인 칸이다(`0044`에서 만들고 값이 들어간 적이 없다).
-- **남겨 두면 「깼는가」를 말하는 자리가 둘이 되고, 둘은 언젠가 어긋난다**
-- (구현 결정 247). `scenario_no`는 남긴다 — 그 방문이 어느 시나리오였는지는
-- 행적의 것이 맞다.

alter table public.itinerary drop column if exists cleared;
