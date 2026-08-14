-- ============================================================================
-- 파티 기록지도 로그를 남긴다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **파티는 여럿이 고치므로 캐릭터보다 되짚을 일이 잦다.**                   │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 파티 상태는 파티원이면 누구나 고친다(구현 결정 44). 「평판이 언제 −3이 됐지」,
-- 「머무는 곳을 누가 옮겼지」를 물을 데가 없었다 — 캐릭터와 같은 짜임으로 둔다
-- (`0018`·`0019`).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **캐릭터와 반대로, 이 기록은 파티원이 다 본다.**                          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 캐릭터 이력은 주인만 본다(`0019`, 형님이 좁혔다) — 제 것이기 때문이다. 파티
-- 상태는 **함께 쓰는 것**이라 누가 무엇을 고쳤는지 서로 보여야 뜻이 있다. 나만
-- 보이는 공용 장부는 장부가 아니다.
--
-- 고치거나 지우는 정책은 두지 않는다 — 안 만들면 RLS가 통째로 막는다. 이력이지
-- 정본이 아니므로(구현 결정 369) 손대는 길이 없어야 한다.
-- ============================================================================

create table if not exists public.campaign_log (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  actor_id    uuid not null references public.profiles (id) on delete cascade,
  at          timestamptz not null default now(),
  /*
    어떤 경로로 고쳤는가. 지금은 시트에서 손으로 고치는 길뿐이지만, 시나리오
    정산으로 들어오는 길이 따로 난다(구현 결정 380).
  */
  reason      text not null default 'manual'
              check (reason in ('created', 'scenario', 'manual', 'other')),
  /*
    무엇이 어떻게 바뀌었는가. **글이 아니라 값으로 담는다** — 우리말로 옮기는
    것은 화면이 한다(`describeChange`). 글로 담으면 나중에 문구를 고칠 때
    옛 기록만 옛말로 남는다.
  */
  changes     jsonb not null default '[]'::jsonb
);

create index if not exists campaign_log_by_campaign_idx
  on public.campaign_log (campaign_id, at desc);

alter table public.campaign_log enable row level security;

/* 파티원이면 본다. 공용 장부이므로 서로의 손질이 다 보여야 한다. */
drop policy if exists "파티 로그: 파티원이 본다" on public.campaign_log;
create policy "파티 로그: 파티원이 본다"
  on public.campaign_log for select
  using (public.is_party_member(public.campaign_party(campaign_id)));

/* 남기는 것도 파티원이며, **제 이름으로만** 남긴다. */
drop policy if exists "파티 로그: 파티원이 제 이름으로 남긴다" on public.campaign_log;
create policy "파티 로그: 파티원이 제 이름으로 남긴다"
  on public.campaign_log for insert
  with check (
    actor_id = auth.uid()
    and public.is_party_member(public.campaign_party(campaign_id))
  );
