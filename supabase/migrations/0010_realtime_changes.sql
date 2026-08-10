-- ============================================================================
-- 값을 서버가 직접 밀어주게 한다 — Postgres Changes
-- ----------------------------------------------------------------------------
-- 정본: SPEC 5.4 (2026-08-10 개정)
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **지킬 수 있는 길로 값을 나른다.**                                        │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- Broadcast 채널은 잠글 수 없었다 — `realtime.messages`에 정책을 걸어야 하는데
-- 그 표는 우리 권한 밖이다(`postgres`도 `supabase_privileged_role`도 거절당한다).
-- 그래서 채널에는 "바뀌었다"는 신호만 싣고 값은 받는 쪽이 표에서 읽어 왔다.
--
-- **Postgres Changes는 서버가 직접 민다.** 그리고 밀기 전에 RLS로 자격을 본다 —
-- 볼 수 없는 행은 애초에 가지 않는다. 값이 지나는 길이 이번에도 우리가 지킬 수
-- 있는 쪽이므로, 값을 실어 보내도 된다. 받는 쪽의 읽기 왕복 한 번이 사라진다.
--
-- 켜는 것은 우리 표를 복제 대상에 넣는 일뿐이라 권한 문제가 없다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- battle_state — 판 위의 값을 전투 행에서 떼어낸다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **"판이 열려 있다"와 "판에 무엇이 놓였다"는 볼 자격이 다르다.**           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 값이 `battles.state`에 있었는데, `battles`를 읽는 정책은 **파티원 전체**다.
-- 파티원이면 열린 판이 있다는 것을 알아야 앉을 수 있기 때문이다(`findOpenBattle`).
-- 그 표를 그대로 밀면 **앉지도 않은 파티원에게 판이 통째로 간다.**
--
-- 그래서 값만 떼어 따로 둔다. 이쪽은 **앉은 사람만** 본다. 판이 접히면 전투 행이
-- 지워지고 이것도 함께 간다(`on delete cascade`) — 수명은 그대로다.

create table if not exists public.battle_state (
  battle_id  uuid primary key references public.battles (id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.battle_state enable row level security;

drop policy if exists "판 값: 앉은 사람만 본다" on public.battle_state;
create policy "판 값: 앉은 사람만 본다"
  on public.battle_state for select
  using (public.is_battle_participant(battle_id));

drop policy if exists "판 값: 앉은 사람만 만든다" on public.battle_state;
create policy "판 값: 앉은 사람만 만든다"
  on public.battle_state for insert
  with check (public.is_battle_participant(battle_id));

drop policy if exists "판 값: 앉은 사람만 고친다" on public.battle_state;
create policy "판 값: 앉은 사람만 고친다"
  on public.battle_state for update
  using (public.is_battle_participant(battle_id))
  with check (public.is_battle_participant(battle_id));

create or replace function public.touch_battle_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.battle_id := old.battle_id;
  return new;
end;
$$;

drop trigger if exists battle_state_touch on public.battle_state;
create trigger battle_state_touch
  before update on public.battle_state
  for each row execute function public.touch_battle_state();

-- 값을 옮겨 두었던 자리는 거둔다. **두 곳에 두면 반드시 어긋난다.**
alter table public.battles drop column if exists state;
alter table public.battles drop column if exists state_at;

-- ----------------------------------------------------------------------------
-- 복제 대상에 넣는다
-- ----------------------------------------------------------------------------
-- 여기 든 표만 변경이 밀린다. **정책은 이미 걸려 있고**, Realtime이 그것을 그대로
-- 본다 — 넣는다고 남에게 보이는 것이 아니다.
--
-- `replica identity full`을 함께 준다. 기본값(기본키)이면 밀려오는 옛 행에 기본키만
-- 담기는데, 지우기·고치기에서 자격을 가릴 때 나머지 칸이 필요하다. 행 수가 사람
-- 수만큼뿐이라 비용이 거의 없다.

alter table public.satchel_settings replica identity full;
alter table public.satchel_runtime replica identity full;
alter table public.battle_state replica identity full;

do $$
begin
  -- 이미 들어 있으면 `add table`이 오류를 낸다. 다시 돌릴 수 있어야 하므로 본다.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'satchel_settings'
  ) then
    alter publication supabase_realtime add table public.satchel_settings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'satchel_runtime'
  ) then
    alter publication supabase_realtime add table public.satchel_runtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'battle_state'
  ) then
    alter publication supabase_realtime add table public.battle_state;
  end if;
end
$$;
