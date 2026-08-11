-- ============================================================================
-- 아이콘 없는 클래스도 담는다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **클래스가 제 id를 갖는다. 아이콘은 있으면 붙는다.**                      │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- `0011`은 Creator Pack 아이콘 번호(1~21)를 열쇠로 삼았다. 그러니 **팩에 그림이
-- 없는 클래스는 아예 담을 수 없었다** — 사자의 턱 넷(폭탄·도끼·홀·갈고리)이 그렇다.
-- 팩의 21쪽은 글룸헤이븐 17종과 그중 넷의 색 있는 사본이고, 사자의 턱 그림은 거기
-- 없다.
--
-- 그림이 있고 없고는 **보여주는 방식**의 문제인데 그것이 담을 수 있는지까지
-- 정하고 있었다. 열쇠를 클래스 자신에게 옮긴다.
--
-- **이름이 겹치지 않는 열쇠 노릇을 한다.** 붙여넣기로 넣고 고치는 흐름이라
-- (`ClassDataEditor`) 같은 이름이 두 번 오면 덮어써야지 새로 생기면 안 된다.
-- ============================================================================

-- 이름이 빈 줄은 열쇠가 될 수 없다. 화면은 빈 이름을 넣지 못하게 막으므로
-- 손으로 넣다 남은 것뿐이다.
delete from public.character_classes where coalesce(trim(name), '') = '';

alter table public.character_classes
  add column if not exists id uuid not null default gen_random_uuid(),
  -- 몇 번째로 보여줄지. 같으면 이름 순이다.
  add column if not exists sort smallint not null default 0;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **기본키를 먼저 뗀다.** 붙어 있는 동안에는 `not null`을 풀 수 없다.       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 순서를 뒤집으면 `42P16: column "icon" is in a primary key`로 거절된다.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'character_classes_pkey' and conrelid = 'public.character_classes'::regclass
  ) then
    alter table public.character_classes drop constraint character_classes_pkey;
  end if;
end
$$;

-- 다시 돌릴 수 있어야 하므로 이미 있으면 그냥 둔다.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'character_classes_pkey' and conrelid = 'public.character_classes'::regclass
  ) then
    alter table public.character_classes add primary key (id);
  end if;
end
$$;

-- 아이콘은 이제 **있으면 붙는 것**이다. 없으면 이름만으로 고른다.
alter table public.character_classes alter column icon drop not null;

-- 이름이 열쇠 노릇을 한다. 붙여넣기로 넣고 고치는 흐름이라(`ClassDataEditor`)
-- 같은 이름이 두 번 오면 덮어써야지 새로 생기면 안 된다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'character_classes_name_key'
  ) then
    alter table public.character_classes add constraint character_classes_name_key unique (name);
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 캐릭터가 클래스를 가리킨다
-- ----------------------------------------------------------------------------
-- **`class_icon`은 그대로 둔다.** 클래스를 하나도 안 넣었을 때는 종전대로 그림에서
-- 고르고, 축 ②의 이름표도 그 번호로 그림을 찾는다(`satchel/roster.ts`). 클래스를
-- 골랐을 때는 그 클래스의 아이콘을 여기에 함께 적어 두므로 두 길이 어긋나지 않는다.
--
-- 클래스가 지워지면 가리키던 것만 풀린다 — **캐릭터는 남는다.** 수치가 사라졌다고
-- 사람이 사라질 이유가 없다.

alter table public.characters
  add column if not exists class_id uuid references public.character_classes (id) on delete set null;

create index if not exists characters_class_idx on public.characters (class_id);
