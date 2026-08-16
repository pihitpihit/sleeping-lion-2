-- ============================================================================
-- 위대한 떡갈나무 — 파티원이 금화를 모아 기부한다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **남의 골드를 깎아야 하는 일이라 서버가 한 번에 한다.**                   │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 캐릭터는 **제 것만 고친다**(`0005`) — 그래서 화면에서 파티원 넷의 골드를 각각
-- 깎을 수가 없다. 기부는 한 번에 벌어지는 한 가지 일이므로 함수 하나가 맡는다:
--   · 부르는 사람이 그 파티의 파티원인지 보고
--   · 각자 가진 것보다 많이 내지 않는지 보고
--   · **합산이 열 단위인지** 보고(판의 칸이 열씩이다)
--   · 골드를 깎아 판에 얹는다.
--
-- 하나라도 어긋나면 통째로 거절한다 — **반만 깎이는 것이 가장 나쁘다.**
--
-- 담기는 것은 「얼마가 쌓였나」 하나뿐이고 나머지(번영도·다음 표식)는 화면이
-- 셈한다(`rules/greatOak.ts`).
-- ============================================================================

alter table public.campaigns
  add column if not exists oak integer not null default 0 check (oak >= 0);

create or replace function public.donate_to_oak(p_campaign uuid, p_gifts jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_row   record;
  v_after integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_party_member(public.campaign_party(p_campaign)) then
    raise exception '이 파티의 기록지가 아닙니다.' using errcode = 'insufficient_privilege';
  end if;

  /*
    낸 것을 하나씩 본다. **그 기록지의 캐릭터여야 하고** 가진 것보다 많이 낼 수
    없다. `for update`로 잡아 두어 같은 순간에 두 번 내는 것을 막는다.
  */
  for v_row in
    select (key)::uuid as character_id, (value)::integer as amount
    from jsonb_each_text(p_gifts)
  loop
    if v_row.amount is null or v_row.amount < 0 then
      raise exception '낼 수 없는 값입니다.' using errcode = 'check_violation';
    end if;
    if v_row.amount = 0 then
      continue;
    end if;

    perform 1
      from public.characters c
     where c.id = v_row.character_id
       and c.campaign_id = p_campaign
       and c.gold >= v_row.amount
     for update;

    if not found then
      raise exception '가진 골드보다 많이 낼 수 없습니다.' using errcode = 'check_violation';
    end if;

    update public.characters
       set gold = gold - v_row.amount
     where id = v_row.character_id;

    v_total := v_total + v_row.amount;
  end loop;

  if v_total <= 0 then
    raise exception '낼 것이 없습니다.' using errcode = 'check_violation';
  end if;

  -- 판의 칸이 열씩이라 그 사이에 멈출 자리가 없다.
  if v_total % 10 <> 0 then
    raise exception '합산이 10 단위여야 합니다.' using errcode = 'check_violation';
  end if;

  update public.campaigns
     set oak = oak + v_total
   where id = p_campaign
  returning oak into v_after;

  return v_after;
end;
$$;

/* **`revoke ... from public`을 함께 적어야 잠긴다**(구현 결정 80). */
revoke all on function public.donate_to_oak(uuid, jsonb) from public;
grant execute on function public.donate_to_oak(uuid, jsonb) to authenticated;
