-- ============================================================================
-- 캐릭터 삭제에 이틀의 유예를 둔다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **되돌릴 수 없는 일은 곧바로 벌어지지 않게 한다.**                        │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 여태 캐릭터를 거두면 그 자리에서 사라졌다. 몇 시간짜리 판을 여럿 거친 기록이
-- 손가락 두 번에 날아가는 자리라, 팝업의 5초 뜸(구현 결정 36)만으로는 얇다 —
-- **잘못 눌렀다는 것은 대개 한참 뒤에 안다.**
--
-- 그래서 지우는 표시만 해 두고 **이틀 뒤에 진짜로 지운다.** 그동안은
--   · 목록에 그대로 보이고
--   · 안을 들여다볼 수 있고
--   · 고칠 수는 없고
--   · 언제든 되돌릴 수 있다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **고치지 못하게 막는 것은 서버다.**                                       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 화면에서 칸을 잠그는 것은 헛손질을 줄이는 것뿐이다(구현 결정 44). 지우기로 표시된
-- 캐릭터는 **`deleted_at` 말고는 아무것도 안 바뀌어야** 한다 — 되돌리는 길만 열어
-- 둔다.
-- ============================================================================

alter table public.characters
  add column if not exists deleted_at timestamptz;

/* 거두는 함수가 훑을 자리. 표시된 것만 모이므로 부분 인덱스면 족하다. */
create index if not exists characters_deleted_idx
  on public.characters (deleted_at)
  where deleted_at is not null;

-- ----------------------------------------------------------------------------
-- 표시된 동안에는 값이 안 바뀐다
-- ----------------------------------------------------------------------------

create or replace function public.lock_character_identity()
returns trigger
language plpgsql
as $$
begin
  /*
    **지우기로 표시된 줄은 `deleted_at` 말고 아무것도 안 바뀐다.**

    되돌리는 것(=`deleted_at`을 비우는 것)만 통과시킨다. 다른 칸을 함께 보내면
    거절한다 — 조용히 무시하면 화면은 저장했다 하고 서버는 안 바꾼 꼴이 되어
    사람이 알 길이 없다(구현 결정 242).
  */
  if old.deleted_at is not null then
    if new.name is distinct from old.name
       or new.class_id is distinct from old.class_id
       or new.class_icon is distinct from old.class_icon
       or new.campaign_id is distinct from old.campaign_id
       or new.level is distinct from old.level
       or new.xp is distinct from old.xp
       or new.gold is distinct from old.gold
       or new.checkmarks is distinct from old.checkmarks
       or new.perks is distinct from old.perks
       or new.items is distinct from old.items
       or new.notes is distinct from old.notes
       or new.retired is distinct from old.retired
    then
      raise exception '삭제 예정인 캐릭터는 고칠 수 없습니다. 먼저 삭제를 취소하십시오.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- 클래스. `class_id`가 정본이고, 클래스 표가 없던 시절에 만들어진 캐릭터는
  -- 아이콘 번호만 들고 있다(`0012`) — 둘 다 본다.
  if (old.class_id is not null or old.class_icon <> 0) then
    if new.class_id is distinct from old.class_id or new.class_icon <> old.class_icon then
      raise exception '캐릭터의 클래스는 바꿀 수 없습니다. 지우고 새로 만드십시오.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- 이름.
  if coalesce(trim(old.name), '') <> '' and new.name is distinct from old.name then
    raise exception '캐릭터의 이름은 바꿀 수 없습니다. 지우고 새로 만드십시오.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 이틀 지난 것을 거둔다
-- ----------------------------------------------------------------------------
-- 잊힌 판을 서버가 거두는 것과 같은 짜임이다(`sweep_stale_battles`, 구현 결정 72).
-- 사람은 유예가 끝나기를 지켜보지 않는다 — 앱을 열 때 지나가며 치운다.
--
-- **`revoke ... from public`을 함께 적어야 잠긴다**(구현 결정 80). `grant`만 적고
-- 잠갔다고 여긴 적이 있다. 안에서 한 번 더 보는 줄도 함께 둔다(구현 결정 81).

create or replace function public.sweep_deleted_characters()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = 'insufficient_privilege';
  end if;

  delete from public.characters
   where deleted_at is not null
     and deleted_at < now() - interval '2 days';
end;
$$;

revoke all on function public.sweep_deleted_characters() from public;
grant execute on function public.sweep_deleted_characters() to authenticated;
