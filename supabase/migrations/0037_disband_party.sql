-- ============================================================================
-- 파티를 해산한다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **지우는 길이 아예 없었다.**                                              │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- `parties`에 DELETE 정책이 없어 아무도 파티를 지울 수 없었다. 나가는 것은 제
-- 줄만 지우는 것이라 빈 파티가 그대로 남는다 — **목록이 모두에게 열린 지금**
-- (`0035`) 시험 삼아 만든 것들이 그대로 쌓인다(형님이 짚었다).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **캐릭터는 남는다.**                                                      │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 여태 `characters.campaign_id`가 **cascade**였다 — 기록지가 지워지면 캐릭터도
-- 함께 사라졌다. 파티가 없어졌다고 사람이 사라질 이유가 없다(구현 결정 122와 같은
-- 결): 파티에 들기 전 상태로 돌아갈 뿐이다(`0015`가 그 자리를 이미 비워 두었다).
--
-- 지우는 자격은 **파티원**이되(파티는 평평하다, 구현 결정 20) **남의 캐릭터가 든
-- 파티는 못 지운다** — 남의 기록을 날리는 일은 그 사람이 할 일이다.
-- ============================================================================

alter table public.characters
  drop constraint if exists characters_campaign_id_fkey;
alter table public.characters
  add constraint characters_campaign_id_fkey
  foreign key (campaign_id) references public.campaigns (id) on delete set null;

drop policy if exists "parties: 파티원이 해산한다" on public.parties;
create policy "parties: 파티원이 해산한다"
  on public.parties for delete
  to authenticated
  using (
    public.is_party_member(id)
    and not exists (
      select 1
      from public.characters c
      join public.campaigns g on g.id = c.campaign_id
      where g.party_id = parties.id and c.owner_id <> auth.uid()
    )
  );
