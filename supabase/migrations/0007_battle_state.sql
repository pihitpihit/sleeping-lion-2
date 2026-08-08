-- ============================================================================
-- 전투 상태 — 판이 도는 동안만 있는 자리
-- ----------------------------------------------------------------------------
-- 정본: SPEC 5.4 (2026-08-08 개정)
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **판이 끝나면 지워진다. 그것이 이 표가 원칙을 지키는 방식이다.**          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 이전 문서는 원소 값을 **Broadcast로만** 흘려보내고 아무 데도 저장하지 않기로
-- 했다. 그것으로는 두 가지가 안 된다.
--
-- 1. **새로고침하면 빈 화면이다.** 다음에 누가 만질 때까지 아무것도 모른다.
-- 2. **넷이 다 같이 새로고침하면 판이 통째로 날아간다.** 아무도 안 들고 있다.
--
-- 그래서 값을 여기 둔다. 대신 **수명을 전투와 같게** 묶는다 — 전투를 닫으면
-- 행이 지워지고, 지워지면 값도 함께 간다. `on delete cascade`가 아니라 같은
-- 행에 두는 까닭이 그것이다.
--
-- **즉시 반영은 여전히 Broadcast다.** 여기 쓰는 것은 뒤따라가며, 새로 들어오거나
-- 새로고침한 사람이 따라잡는 데 쓴다. 왕복을 기다려 그리면 손가락이 미끄러진다
-- (구현 결정 22).
-- ============================================================================

alter table public.battles
  -- 판 위의 사실 한 뭉치. 모양은 `runtime/snapshot.ts`가 정하고 서버는 모른다.
  --
  -- 위젯이 늘 때마다 모양이 바뀌므로 칸으로 쪼개지 않는다. 읽고 쓰는 것은
  -- 언제나 통째이며 조각으로 질의할 일이 없다.
  add column if not exists state jsonb not null default '{}'::jsonb,
  -- 마지막으로 값을 얹은 시각. **누가 최신인지 가리는 데 쓰지 않는다** —
  -- 전투 중에는 늦게 온 것이 이긴다(아래 참조). 사람이 들여다볼 때 쓴다.
  add column if not exists state_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 누가 얹을 수 있는가
-- ----------------------------------------------------------------------------
-- **참여자만이다.** 파티원이라도 이 판에 앉지 않았으면 얹지 못한다 — 옆에서
-- 구경하다 남의 판을 굴리는 일이 없어야 한다.
--
-- 기존 "전투: 파티원이 닫는다"는 파티원 누구나 고칠 수 있어 이보다 넓다.
-- 좁은 쪽으로 바꾼다. 닫는 것도 참여자가 한다.

drop policy if exists "전투: 파티원이 닫는다" on public.battles;

create or replace function public.is_battle_participant(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.battle_participants p
    where p.battle_id = target and p.user_id = auth.uid()
  );
$$;

drop policy if exists "전투: 참여자가 고친다" on public.battles;
create policy "전투: 참여자가 고친다"
  on public.battles for update
  using (public.is_battle_participant(id))
  with check (public.is_battle_participant(id));

-- **판을 접는 것은 지우는 것이다.** `closed_at`을 찍고 남겨 두면 "어디에도
-- 남지 않는다"가 아니게 된다. 참여자면 누구나 접을 수 있다 — 파티는 평평하다
-- (구현 결정 20).
drop policy if exists "전투: 참여자가 접는다" on public.battles;
create policy "전투: 참여자가 접는다"
  on public.battles for delete
  using (public.is_battle_participant(id));

-- ----------------------------------------------------------------------------
-- 잊힌 전투 거두기
-- ----------------------------------------------------------------------------
-- 사람은 판을 접지 않고 그냥 앱을 닫는다. 그러면 행이 남고, 다음에 열 때 어제
-- 판이 이어져 있다.
--
-- **하루 지난 것은 거둔다.** 한 판이 하루를 넘길 일은 없다. `security definer`로
-- 두어 누가 불러도 제 것만이 아니라 낡은 것 전부를 거둔다 — 낡은 판은 누구의
-- 것도 아니다.

create or replace function public.sweep_stale_battles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.battles where opened_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 로그인한 사람이면 부를 수 있다. 하는 일이 '낡은 것 지우기'뿐이라 해를 못 끼친다.
grant execute on function public.sweep_stale_battles() to authenticated;
