-- ============================================================================
-- 판이 아무에게도 안 보이던 자리
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **정책끼리 서로를 물고 돌았다 — `infinite recursion detected`.**          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- `0032`에서 「참가자의 주인만 판을 본다」로 좁히면서 `battles`의 읽기 정책이
-- `battle_characters`를 보게 되었다. 그런데 `battle_characters`의 읽기 정책은
-- `battles`를 본다 — **정책 안의 조회에도 그 표의 RLS가 걸리므로** 둘이 서로를
-- 불러 판이 통째로 안 보였다. `battle_participants`도 같은 고리에 걸려 있다.
--
-- 게다가 `battles` 정책에 적어 둔 `bc.battle_id = id`의 `id`가 **바깥의 판이
-- 아니라 안쪽 `characters.id`로 묶였다.** 고리를 풀어도 그것만으로는 안 맞는다.
--
-- 고리를 끊는 길은 하나다: **자격을 보는 조회를 `security definer` 함수로 내려
-- RLS 바깥에서 한 번에 답하게 한다**(`is_party_member`·`is_battle_participant`가
-- 이미 그렇게 되어 있다). 정책은 그 함수의 예/아니오만 본다.
-- ============================================================================

/** 그 판이 어느 파티의 것인가. RLS 바깥에서 답한다 — 정책이 이것을 쓴다. */
create or replace function public.battle_party(p_battle uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.party_id from public.battles b where b.id = p_battle;
$$;

/** 그 판의 참가자 중에 **내 캐릭터**가 있는가. */
create or replace function public.owns_battle_character(p_battle uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.battle_characters bc
    join public.characters c on c.id = bc.character_id
    where bc.battle_id = p_battle and c.owner_id = auth.uid()
  );
$$;

revoke all on function public.battle_party(uuid) from public;
revoke all on function public.owns_battle_character(uuid) from public;
grant execute on function public.battle_party(uuid) to authenticated;
grant execute on function public.owns_battle_character(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 고리를 끊는다
-- ----------------------------------------------------------------------------

drop policy if exists "전투: 참가자의 주인이 본다" on public.battles;
create policy "전투: 참가자의 주인이 본다"
  on public.battles for select
  using (public.owns_battle_character(id));

drop policy if exists "전투 참가자: 파티원이 본다" on public.battle_characters;
create policy "전투 참가자: 파티원이 본다"
  on public.battle_characters for select
  using (public.is_party_member(public.battle_party(battle_id)));

drop policy if exists "참여자: 같은 파티 것만 본다" on public.battle_participants;
create policy "참여자: 같은 파티 것만 본다"
  on public.battle_participants for select
  using (public.is_party_member(public.battle_party(battle_id)));

drop policy if exists "참여자: 스스로 든다" on public.battle_participants;
create policy "참여자: 스스로 든다"
  on public.battle_participants for insert
  with check (
    user_id = auth.uid()
    and public.is_party_member(public.battle_party(battle_id))
  );

-- ----------------------------------------------------------------------------
-- 난이도가 바뀌면 상 위의 모두에게 간다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **난이도는 상 위의 사실이지 사람의 것이 아니다.**                         │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 원소·라운드와 같은 결이다(구현 결정 23·32) — 한 사람이 3레벨을 보는데 옆
-- 사람이 5레벨을 보면 어느 쪽이 판의 사실인지 알 수 없다. `battles`를 복제
-- 대상에 넣어 **밀기 전에 RLS로 자격을 보게** 한다(구현 결정 100).
--
-- `battles`에는 이제 판 값이 없다 — 그것은 `battle_state`로 떼어 두었다
-- (구현 결정 101). 여기 남은 것은 어느 파티·누가 열었나·언제·난이도뿐이라
-- 참가자의 주인에게 통째로 가도 된다.

alter table public.battles replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'battles'
  ) then
    alter publication supabase_realtime add table public.battles;
  end if;
end;
$$;
