-- ============================================================================
-- 모험이 어느 시나리오인지 안다 — 마칠 때 행적과 상태가 함께 간다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **모험·행적·시나리오 상태가 따로 놀고 있었다.**                           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 판을 열고, 끝나면 행적에 한 줄 적고, 시나리오를 완료로 바꾸는 것을 세 군데에서
-- 손으로 했다. 판을 열 때 시나리오를 고르게 하고, 마칠 때 결과를 고르면 서버가
-- 한 번에 처리한다.
--
-- **번호만 담는다.** 이름·좌표는 `scenarios`에 있고(`0044`) 행적에 옮겨 적을 때
-- 거기서 꺼낸다. 외래키는 걸지 않는다 — 목록 표를 다시 넣을 때 판이 흔들리면
-- 안 된다(`campaign_scenarios.no`와 같은 결).
-- ============================================================================

alter table public.battles
  add column if not exists scenario_no smallint
  check (scenario_no is null or scenario_no between 1 and 999);

-- ----------------------------------------------------------------------------
-- 판 열기 — 시나리오를 함께 받는다
-- ----------------------------------------------------------------------------
-- 인자가 하나 늘었다. 옛 것을 남겨 두면 PostgREST가 이름 붙은 인자로 둘 다에
-- 맞아 어느 것을 부를지 못 고른다 — 지운다.

drop function if exists public.open_adventure(uuid, uuid[], smallint);

create or replace function public.open_adventure(
  p_party uuid,
  p_characters uuid[],
  p_level smallint,
  p_scenario smallint default null
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

  insert into public.battles (party_id, opened_by, level, scenario_no)
  values (
    p_party,
    auth.uid(),
    greatest(0, least(7, coalesce(p_level, 1))),
    case when p_scenario between 1 and 999 then p_scenario end
  )
  returning id into v_battle;

  insert into public.battle_characters (battle_id, character_id)
  select v_battle, id from unnest(p_characters) as id;

  insert into public.battle_participants (battle_id, user_id)
  values (v_battle, auth.uid())
  on conflict do nothing;

  return v_battle;
end;
$$;

revoke all on function public.open_adventure(uuid, uuid[], smallint, smallint) from public;
grant execute on function public.open_adventure(uuid, uuid[], smallint, smallint) to authenticated;

-- ----------------------------------------------------------------------------
-- 모험 마치기 — 결과를 남기고 판을 접는다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **행적 한 줄 · 상태 · 판 지우기가 한 가지 일이다.**                       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 나눠 보내면 사이에 끊겼을 때 **판은 사라졌는데 행적이 없거나, 행적은 있는데
-- 판이 남는다**(`leave_party`·`open_adventure`와 같은 짜임).
--
-- 결과는 셋이다:
--   * `done`   — 행적에 적고 시나리오를 완료로.
--   * `failed` — 행적에 적는다. 닫혀 있던 것이면 열림으로 — 가 봤으니 열린 것이다.
--                이미 다른 상태면 그대로 둔다.
--   * `null`   — 아무것도 안 남기고 접기만 한다(시험 삼아 연 판 등).
--
-- **날짜는 부르는 쪽이 넘긴다.** 서버의 「오늘」은 UTC라 새벽에 마치면 하루가
-- 어긋난다 — 상에 앉은 사람의 오늘이 맞다.
--
-- **어느 기록지인지는 서버가 정한다** — 파티 하나에 기록지 하나이고, 둘이면
-- 가장 오래된 것이다(`fetchOrCreateFor`와 같은 셈).
--
-- 마칠 수 있는 사람: 판에 앉은 사람이거나 **참가자로 지정된 캐릭터의 주인.**
-- 상에 같이 앉았는데 기기로는 판에 안 든 사람도 끝낼 수 있어야 한다.
--
-- 돌려주는 것은 행적을 적은 기록지 id다(안 적었으면 null) — 화면이 그 기록지를
-- 다시 읽는다.

create or replace function public.finish_adventure(
  p_battle uuid,
  p_outcome text,
  p_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party    uuid;
  v_no       smallint;
  v_campaign uuid;
  v_grid     text;
  v_name     text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  if p_outcome is not null and p_outcome not in ('done', 'failed') then
    raise exception '결과는 done·failed 가운데 하나여야 합니다.' using errcode = 'check_violation';
  end if;

  select b.party_id, b.scenario_no into v_party, v_no
    from public.battles b where b.id = p_battle;
  if v_party is null then
    raise exception '그런 모험이 없습니다.' using errcode = 'no_data_found';
  end if;

  if not (public.is_battle_participant(p_battle) or public.owns_battle_character(p_battle)) then
    raise exception '이 모험의 참가자가 아닙니다.' using errcode = 'insufficient_privilege';
  end if;

  if p_outcome is not null and v_no is not null then
    select g.id into v_campaign
      from public.campaigns g
     where g.party_id = v_party
     order by g.created_at asc
     limit 1;
  end if;

  if v_campaign is not null then
    select coalesce(s.grid, ''), coalesce(s.name, '') into v_grid, v_name
      from public.scenarios s where s.no = v_no;

    /* 새 줄이 맨 위(0)다 — 나머지를 한 칸씩 민다. */
    update public.itinerary set sort = sort + 1 where campaign_id = v_campaign;

    insert into public.itinerary (campaign_id, at, sort, scenario, code, place, scenario_no)
    values (v_campaign, p_at, 0, v_no::text, coalesce(v_grid, ''), coalesce(v_name, ''), v_no);

    if p_outcome = 'done' then
      insert into public.campaign_scenarios (campaign_id, no, state, updated_at)
      values (v_campaign, v_no, 'done', now())
      on conflict (campaign_id, no) do update set state = 'done', updated_at = now();
    else
      insert into public.campaign_scenarios (campaign_id, no, state, updated_at)
      values (v_campaign, v_no, 'open', now())
      on conflict (campaign_id, no) do nothing;
    end if;
  end if;

  delete from public.battles where id = p_battle;

  return v_campaign;
end;
$$;

revoke all on function public.finish_adventure(uuid, text, date) from public;
grant execute on function public.finish_adventure(uuid, text, date) to authenticated;
