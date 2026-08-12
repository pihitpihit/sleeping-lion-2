-- ============================================================================
-- 캐릭터가 먼저 서고, 파티에는 나중에 든다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **캐릭터가 먼저다. 파티는 그 캐릭터가 나중에 드는 곳이다.**               │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 지금까지는 파티를 먼저 세우고 그 안에서 캐릭터를 만들었다. 실제로 사람은
-- **제 캐릭터를 먼저 정하고** 누구와 놀지는 그다음에 정한다 — 봉투를 뜯는 것과
-- 약속을 잡는 것은 다른 일이다.
--
-- 그래서 `campaign_id`가 비어 있을 수 있게 된다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **파티가 없으면 「파티원이 본다」가 주인에게서도 감춘다.**                 │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 읽기 정책이 `is_party_member(campaign_party(campaign_id))` 하나였는데,
-- `campaign_id`가 `null`이면 그 값도 `null`이라 **누구에게도 안 보인다** —
-- 만든 사람 자신에게도 그렇다. 파티에 들기 전까지는 주인만 보게 한 줄을 더한다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **고치기에 `with check`를 채운다. 남의 파티에 밀어 넣지 못하게.**          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 고치기 정책이 `owner_id = auth.uid()`만 보고 있었다. 그동안은 화면이 파티를
-- 옮기지 않아 드러나지 않았지만, **파티에 드는 것이 이제 진짜 기능이 되므로**
-- 아무 기록지 id나 적어 남의 파티에 제 캐릭터를 밀어 넣을 수 있다. 드는 파티의
-- 파티원일 때만 되게 막는다.
-- ============================================================================

alter table public.characters alter column campaign_id drop not null;

-- **파티원은 다 본다. 파티에 들기 전에는 주인만 본다.**
drop policy if exists "캐릭터: 파티원이 본다" on public.characters;
create policy "캐릭터: 파티원이 본다"
  on public.characters for select
  using (
    (campaign_id is null and owner_id = auth.uid())
    or public.is_party_member(public.campaign_party(campaign_id))
  );

-- **만드는 것은 제 것만.** 파티 없이 세우거나, 제가 든 파티에 세운다.
drop policy if exists "캐릭터: 제 것을 만든다" on public.characters;
create policy "캐릭터: 제 것을 만든다"
  on public.characters for insert
  with check (
    owner_id = auth.uid()
    and (
      campaign_id is null
      or public.is_party_member(public.campaign_party(campaign_id))
    )
  );

-- **고치는 것도 제 것만**(SPEC 6장). 옮겨 갈 파티도 제가 든 곳이어야 한다.
drop policy if exists "캐릭터: 제 것만 고친다" on public.characters;
create policy "캐릭터: 제 것만 고친다"
  on public.characters for update
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (
      campaign_id is null
      or public.is_party_member(public.campaign_party(campaign_id))
    )
  );
