-- ============================================================================
-- 캐릭터의 이름도 생성할 때 정하고 그 뒤로는 못 바꾼다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **이름은 그 캐릭터가 누구인지다. 클래스와 같은 자리다.**                  │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 파티원은 이름으로 서로를 부른다 — 축 ②의 이름표도 그것이고(`satchel/roster.ts`),
-- 전투에서 누구의 체력·덱인지 가리는 것도 그것이다. **판 도중에 이름이 바뀌면
-- 옆 사람이 보던 것이 딴 사람이 된다.**
--
-- `0014`가 클래스를 잠근 것과 같은 짜임이며, 잠그는 대상이 둘이 되었으므로
-- 함수 이름을 바꾼다 — `lock_character_class`는 이제 하는 일과 이름이 어긋난다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **정해진 적 없는 것은 한 번 정할 수 있다.**                               │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 이름 없이 만들어진 줄이 있으면 무조건 잠글 때 **영영 이름 없이 갇힌다**.
-- 클래스에 둔 것과 같은 선이다(구현 결정 183).
-- ============================================================================

create or replace function public.lock_character_identity()
returns trigger
language plpgsql
as $$
begin
  -- 클래스. `class_id`가 정본이고, 클래스 표가 없던 시절에 만들어진 캐릭터는
  -- 아이콘 번호만 들고 있다(`0012`) — 둘 다 본다.
  if (old.class_id is not null or old.class_icon <> 0) then
    if new.class_id is distinct from old.class_id or new.class_icon <> old.class_icon then
      raise exception '캐릭터의 클래스는 바꿀 수 없습니다. 거두고 새로 만드십시오.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- 이름.
  if coalesce(trim(old.name), '') <> '' and new.name is distinct from old.name then
    raise exception '캐릭터의 이름은 바꿀 수 없습니다. 거두고 새로 만드십시오.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists characters_lock_class on public.characters;
drop trigger if exists characters_lock_identity on public.characters;
create trigger characters_lock_identity
  before update on public.characters
  for each row execute function public.lock_character_identity();

-- 이름만 잠그던 옛 함수는 남겨 둘 이유가 없다. 붙어 있는 트리거가 없다.
drop function if exists public.lock_character_class();
