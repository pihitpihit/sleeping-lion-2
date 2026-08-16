-- ============================================================================
-- 모험은 참가자를 미리 정한다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **아무 판에나 난입할 수 없다 — 지정된 캐릭터의 주인에게만 보인다.**       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 여태 「파티원이면 다 본다」였다(`0001`). 한 파티가 두 자리로 갈려 놀 수 있으므로
-- 그 자리 사람만 보아야 한다(형님이 정했다) — 옆에서 구경하다 남의 판을 굴리는
-- 일도 그만큼 막힌다.
--
-- 시나리오 레벨도 판에 적어 둔다. **참가자들의 레벨에서 셈해 내고**(평균 ÷ 2,
-- 올림 — `rules/scenarioLevel.ts`) 난이도로 보정한 값이다.
-- ============================================================================

alter table public.battles
  add column if not exists level smallint not null default 1
  check (level between 0 and 7);

create table if not exists public.battle_characters (
  battle_id    uuid not null references public.battles (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  primary key (battle_id, character_id)
);

create index if not exists battle_characters_by_character_idx
  on public.battle_characters (character_id);

alter table public.battle_characters enable row level security;

/*
  참가자 목록은 **판을 볼 수 있는 사람이 본다.** `battles`의 정책이 아래에서
  이 표를 보므로 여기서 다시 파티원을 따지면 서로 물고 돈다 — 파티원인지만 본다.
*/
drop policy if exists "전투 참가자: 파티원이 본다" on public.battle_characters;
create policy "전투 참가자: 파티원이 본다"
  on public.battle_characters for select
  using (
    exists (
      select 1 from public.battles b
      where b.id = battle_id and public.is_party_member(b.party_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 판이 보이는 자격이 좁아진다
-- ----------------------------------------------------------------------------
-- **내 캐릭터가 참가자로 지정된 판만** 보인다. 옛 판에는 참가자 줄이 없으므로
-- 아무에게도 안 보이는데, 판은 하루면 서버가 거둔다(구현 결정 72).

drop policy if exists "전투: 파티원이 본다" on public.battles;
drop policy if exists "전투: 참가자의 주인이 본다" on public.battles;
create policy "전투: 참가자의 주인이 본다"
  on public.battles for select
  using (
    exists (
      select 1
      from public.battle_characters bc
      join public.characters c on c.id = bc.character_id
      where bc.battle_id = id and c.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 판을 여는 일은 한 번에 끝난다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **줄을 다 넣기 전에는 판이 제 눈에도 안 보인다.**                         │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 보이는 자격이 참가자 줄에 달려 있으므로, 판을 만들고 줄을 따로 넣는 동안에는
-- 방금 만든 판이 제 눈에도 안 보인다 — 그 사이에 끊기면 **아무도 못 보는 판**이
-- 남는다. 그래서 함수 하나가 다 한다(`donate_to_oak`과 같은 짜임, 구현 결정 391).

create or replace function public.open_adventure(
  p_party uuid,
  p_characters uuid[],
  p_level smallint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_battle uuid;
  v_mine   integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_party_member(p_party) then
    raise exception '이 파티의 파티원이 아닙니다.' using errcode = 'insufficient_privilege';
  end if;

  if p_characters is null or array_length(p_characters, 1) is null then
    raise exception '참가자를 골라야 합니다.' using errcode = 'check_violation';
  end if;

  /* 고른 것이 다 이 파티의 캐릭터인지 본다 — 남의 파티 사람을 끌어들이지 못한다. */
  if exists (
    select 1
    from unnest(p_characters) as want(id)
    where not exists (
      select 1 from public.characters c
      join public.campaigns g on g.id = c.campaign_id
      where c.id = want.id and g.party_id = p_party and c.deleted_at is null
    )
  ) then
    raise exception '이 파티의 캐릭터가 아닙니다.' using errcode = 'check_violation';
  end if;

  /* **내 캐릭터가 하나는 있어야 한다** — 안 그러면 내가 연 판이 내 눈에 안 보인다. */
  select count(*) into v_mine
    from public.characters c
   where c.id = any (p_characters) and c.owner_id = auth.uid();
  if v_mine = 0 then
    raise exception '내 캐릭터가 하나는 참가해야 합니다.' using errcode = 'check_violation';
  end if;

  insert into public.battles (party_id, opened_by, level)
  values (p_party, auth.uid(), greatest(0, least(7, coalesce(p_level, 1))))
  returning id into v_battle;

  insert into public.battle_characters (battle_id, character_id)
  select v_battle, id from unnest(p_characters) as id;

  /* 연 사람은 곧바로 앉는다 — 열어 놓고 안 앉는 일은 없다(구현 결정 67과 같은 결). */
  insert into public.battle_participants (battle_id, user_id)
  values (v_battle, auth.uid())
  on conflict do nothing;

  return v_battle;
end;
$$;

revoke all on function public.open_adventure(uuid, uuid[], smallint) from public;
grant execute on function public.open_adventure(uuid, uuid[], smallint) to authenticated;
