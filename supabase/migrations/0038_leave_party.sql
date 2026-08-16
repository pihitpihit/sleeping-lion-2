-- ============================================================================
-- 동행을 그만두면 캐릭터를 데리고 나온다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **파티를 나가자 제 캐릭터가 목록에서 사라졌다**(형님이 짚었다).           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 읽기 정책이 「파티에 안 들었으면 주인만 본다」였는데(`0015`), 그 「안 들었으면」이
-- **`campaign_id`가 비었을 때**를 말한다. 나가도 캐릭터는 그 기록지를 가리킨 채
-- 남으므로 — 주인 갈래에도 안 걸리고 파티원 갈래에도 안 걸려 **누구에게도 안 보인다.**
--
-- 두 겹으로 막는다:
--   ① **주인은 언제나 제 캐릭터를 본다.** 어느 기록지를 가리키고 있든 그렇다.
--   ② **나갈 때 제 캐릭터를 그 기록지에서 뺀다** — 파티에 들기 전으로 돌아간다
--      (해산이 `set null`로 돌려놓는 것과 같은 결, `0037`).
--
-- ①만으로는 캐릭터가 못 읽는 기록지를 계속 가리키고, ②만으로는 옛 줄이 남은
-- 캐릭터가 영영 안 보인다.
-- ============================================================================

drop policy if exists "캐릭터: 파티원이 본다" on public.characters;
create policy "캐릭터: 파티원이 본다"
  on public.characters for select
  using (
    owner_id = auth.uid()
    or public.is_party_member(public.campaign_party(campaign_id))
  );

-- ----------------------------------------------------------------------------
-- 나가는 일은 한 번에 끝난다
-- ----------------------------------------------------------------------------
-- 줄을 지우는 것과 캐릭터를 빼는 것이 **한 가지 일**이다. 나눠 보내면 사이에
-- 끊겼을 때 **파티에는 없는데 캐릭터는 그 기록지를 가리키는** 꼴이 남는다.

create or replace function public.leave_party(p_party uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  /* **내 캐릭터만 뺀다.** 남의 캐릭터는 그 사람이 나갈 때 따라 나간다. */
  update public.characters c
     set campaign_id = null
   where c.owner_id = auth.uid()
     and c.campaign_id in (
       select g.id from public.campaigns g where g.party_id = p_party
     );

  delete from public.party_members
   where party_id = p_party and user_id = auth.uid();
end;
$$;

/* **`revoke ... from public`을 함께 적어야 잠긴다**(구현 결정 80). */
revoke all on function public.leave_party(uuid) from public;
grant execute on function public.leave_party(uuid) to authenticated;
