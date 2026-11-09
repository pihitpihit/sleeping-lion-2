-- ============================================================================
-- 모험 화면을 걷으며 0048을 되돌린다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **판은 시나리오를 모른다. 결과는 기록지에서 적는다.**                     │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 모험 화면(`#/adventure`)을 걷었다(2026-11-09) — 판을 굴리는 곳은 행낭이라 여는
-- 문만 대문에 따로 있으니 동선이 갈렸고, 행낭만으로 충분했다. 판은 다시 행낭의
-- 전투 팝업에서 열고, 시나리오 결과(완료·실패)는 기록지의 시나리오 칸에서 적는다.
--
-- 그러면 판이 시나리오 번호를 들 까닭도, 판을 마치며 행적을 적는 함수도 쓰는 데가
-- 없다. 쓰는 데 없는 것을 남겨 두면 다음에 읽는 사람이 두 길 중 어느 것이 진짜인지
-- 헷갈린다(구현 결정 229·421과 같은 결).
--
-- **화면이 먼저 배포된 뒤에 적용한다.** 옛 화면은 `battles.scenario_no`를 읽고
-- `open_adventure`에 `p_scenario`를 넘긴다.
-- ============================================================================

drop function if exists public.finish_adventure(uuid, text, date);

drop function if exists public.open_adventure(uuid, uuid[], smallint, smallint);

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

  insert into public.battle_participants (battle_id, user_id)
  values (v_battle, auth.uid())
  on conflict do nothing;

  return v_battle;
end;
$$;

/*
  `revoke ... from public`만으로는 안 잠긴다 — Supabase는 새 함수에 `anon`의 실행
  권한을 기본으로 따로 준다(`pg_default_acl`). 익명으로 찔러 보고 알았다.
*/
revoke all on function public.open_adventure(uuid, uuid[], smallint) from public, anon;
grant execute on function public.open_adventure(uuid, uuid[], smallint) to authenticated;

alter table public.battles drop column if exists scenario_no;
