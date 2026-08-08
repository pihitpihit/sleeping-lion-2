-- ============================================================================
-- satchel_runtime — 혼자 쓸 때의 판
-- ----------------------------------------------------------------------------
-- 정본: SPEC 5.2 (2026-08-08 재개정)
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **판 하나 = 방 하나. 혼자면 내 계정이 방이다.**                           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 앞서 위젯 배치는 계정에 묶었는데 판(원소·라운드·HP/XP·덱)은 브라우저마다
-- 따로 두었다. 그래서 **같은 계정으로 두 곳에서 열면 화면이 갈라졌다.**
--
-- 전투는 **다른 사람과** 나누라고 만든 것이다. 같은 사람의 기기 둘 사이에는
-- 협상할 것이 없는데도 전투를 열어야 맞춰지는 꼴이었다. 형님이 짚었다.
--
-- 그래서 방을 둘로 정리한다.
--
-- | 언제 | 방 |
-- |---|---|
-- | 혼자 | **내 계정**(이 표) |
-- | 전투에 앉음 | 그 전투(`battles.state`) |
--
-- 오가는 방식은 두 방이 같다 — Broadcast로 즉시, 표에 뒤따라.
--
-- **"판이 끝나면 남지 않는다"는 하루 규칙으로 지킨다.** 서버에는 "탭을 닫았다"는
-- 신호가 오지 않으므로 탭 단위로 지울 수가 없다. 전투 방과 같은 규칙을 쓴다 —
-- 한 판이 하루를 넘길 일은 없다.
-- ============================================================================

create table if not exists public.satchel_runtime (
  -- 사람 하나에 한 줄. 파티도 기록지도 끼지 않는다.
  user_id    uuid primary key references public.profiles (id) on delete cascade,

  -- 판 위의 사실 한 뭉치. 모양은 `runtime/snapshot.ts`가 정하고 서버는 모른다.
  state      jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

create index if not exists satchel_runtime_updated_idx
  on public.satchel_runtime (updated_at);

alter table public.satchel_runtime enable row level security;

-- **제 것만이다.** 남의 판을 들여다볼 일도 없고 보여줄 일도 없다 — 남과 나누는
-- 것은 전투 쪽이 한다.
drop policy if exists "판: 제 것만 본다" on public.satchel_runtime;
create policy "판: 제 것만 본다"
  on public.satchel_runtime for select
  using (user_id = auth.uid());

drop policy if exists "판: 제 것만 만든다" on public.satchel_runtime;
create policy "판: 제 것만 만든다"
  on public.satchel_runtime for insert
  with check (user_id = auth.uid());

drop policy if exists "판: 제 것만 고친다" on public.satchel_runtime;
create policy "판: 제 것만 고친다"
  on public.satchel_runtime for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "판: 제 것만 지운다" on public.satchel_runtime;
create policy "판: 제 것만 지운다"
  on public.satchel_runtime for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- updated_at은 서버가 찍는다
-- ----------------------------------------------------------------------------
-- 하루 규칙의 기준이 이 값이다. 화면이 보내게 두면 시계가 어긋난 기기 하나가
-- 제 판을 영영 안 지워지게 만들 수 있다.

create or replace function public.touch_satchel_runtime()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists satchel_runtime_touch on public.satchel_runtime;
create trigger satchel_runtime_touch
  before update on public.satchel_runtime
  for each row execute function public.touch_satchel_runtime();

-- ----------------------------------------------------------------------------
-- 낡은 판 거두기
-- ----------------------------------------------------------------------------
-- `sweep_stale_battles`와 한 몸으로 둔다. 부르는 자리가 하나여야 한쪽만 청소되는
-- 일이 없다. 이름은 그대로 두어 화면 쪽을 고치지 않는다.
--
-- **권한은 처음부터 잠가서 만든다.** `create`가 실행 권한을 `PUBLIC`에 주므로
-- `grant`만 적으면 익명도 부를 수 있다 — `0008`에서 그것을 겪었다.

create or replace function public.sweep_stale_battles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
  dropped integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요하다';
  end if;

  delete from public.battles where opened_at < now() - interval '1 day';
  get diagnostics removed = row_count;

  delete from public.satchel_runtime where updated_at < now() - interval '1 day';
  get diagnostics dropped = row_count;

  return removed + dropped;
end;
$$;

revoke execute on function public.sweep_stale_battles() from public;
revoke execute on function public.sweep_stale_battles() from anon;
grant execute on function public.sweep_stale_battles() to authenticated;
