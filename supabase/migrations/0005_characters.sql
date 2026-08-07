-- ============================================================================
-- characters — 캐릭터 시트
-- ----------------------------------------------------------------------------
-- 정본: SPEC 6장(권한) / 7장(데이터 모델)
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **파티원은 다 보고, 고치는 것은 제 것만.**                                │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- SPEC 6장이 "각 사용자는 본인 캐릭터만 편집 가능. 타인 캐릭터는 읽기 전용"이라고
-- 못박았다. 기록지(campaigns)가 파티원 누구나 고치는 것과 다른 자리다 — 파티
-- 상태는 함께 쓰는 것이고 캐릭터는 제 것이다.
--
-- **클래스는 아이콘 번호로만 둔다.** 이름을 담지 않는다(SPEC 3장). 아이콘은
-- Creator Pack의 `Class Icons and Augments.pdf` 쪽 번호이며, 사람은 그림을 보고
-- 고른다. SPEC 12장 1을 여기서 닫는다.
--
-- **퍽과 아이템도 텍스트를 담지 않는다.** 퍽은 켜진 슬롯 번호의 배열이고,
-- 아이템은 **사용자가 친 글자**다(구현 결정 2).
-- ============================================================================

create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  -- **누구의 것인가.** 고치는 권한이 여기서 나온다.
  --
  -- `auth.users`가 아니라 `profiles`를 가리킨다. 둘 다 같은 id이지만
  -- (`profiles.id`가 `auth.users.id`를 참조한다) **PostgREST는 자기가 보는
  -- 스키마 안의 외래키만 따라간다.** `auth`는 그 바깥이라 이름을 함께 읽지
  -- 못하고, 캐릭터마다 주인 이름을 따로 물어야 한다.
  owner_id    uuid not null references public.profiles (id) on delete cascade,

  name        text not null default '',
  -- Creator Pack 클래스 아이콘의 쪽 번호(1~21). 0은 아직 안 고른 것이다.
  class_icon  smallint not null default 0 check (class_icon between 0 and 21),

  -- 실물 시트의 눈금이 9까지다.
  level       smallint not null default 1 check (level between 1 and 9),
  xp          integer not null default 0 check (xp >= 0),
  gold        integer not null default 0 check (gold >= 0),
  -- 전투 목표 체크마크. 셋이 모이면 퍽 하나를 얻는다 — 세는 것만 하고 규칙을
  -- 판정하지는 않는다.
  checkmarks  smallint not null default 0 check (checkmarks >= 0),

  -- 켜진 퍽 슬롯의 번호들. 어느 번호가 무엇인지는 우리가 알지 못한다.
  perks       integer[] not null default '{}',
  -- 사용자가 친 아이템 이름들. 우리가 목록을 담지 않는다.
  items       text[] not null default '{}',
  notes       text not null default '',

  retired     boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  version     integer not null default 1
);

create index if not exists characters_campaign_idx
  on public.characters (campaign_id, created_at);

alter table public.characters enable row level security;

-- 어느 파티의 기록지에 딸린 캐릭터인가. 정책이 두 번 쓰므로 함수로 뺀다.
create or replace function public.campaign_party(target uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select party_id from public.campaigns where id = target;
$$;

-- **파티원은 다 본다.** 남이 무엇을 들고 몇 레벨인지 보이지 않으면 같이 놀 수 없다.
drop policy if exists "캐릭터: 파티원이 본다" on public.characters;
create policy "캐릭터: 파티원이 본다"
  on public.characters for select
  using (public.is_party_member(public.campaign_party(campaign_id)));

-- **만드는 것은 제 것만.** 남의 이름으로 캐릭터를 세울 수 없다.
drop policy if exists "캐릭터: 제 것을 만든다" on public.characters;
create policy "캐릭터: 제 것을 만든다"
  on public.characters for insert
  with check (
    owner_id = auth.uid()
    and public.is_party_member(public.campaign_party(campaign_id))
  );

-- **고치는 것도 제 것만**(SPEC 6장). 남의 것은 읽기 전용이다.
drop policy if exists "캐릭터: 제 것만 고친다" on public.characters;
create policy "캐릭터: 제 것만 고친다"
  on public.characters for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "캐릭터: 제 것만 지운다" on public.characters;
create policy "캐릭터: 제 것만 지운다"
  on public.characters for delete
  using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- updated_at·version은 서버가 찍는다
-- ----------------------------------------------------------------------------
-- 기록지와 같은 이유다. 화면이 보내는 값을 믿지 않는다 — 시계가 기기마다 다르고,
-- version은 고친 횟수라 보내는 쪽이 정할 것이 아니다.
--
-- 소속과 주인도 되돌린다. **남의 파티로 옮기거나 주인을 바꿔치기할 수 없다.**

create or replace function public.touch_character()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  new.campaign_id := old.campaign_id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists characters_touch on public.characters;
create trigger characters_touch
  before update on public.characters
  for each row execute function public.touch_character();
