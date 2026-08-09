-- ============================================================================
-- 실시간 통로를 잠근다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **행낭 통로는 제 계정만, 전투 통로는 그 판에 앉은 사람만.**               │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- Supabase의 Broadcast는 **기본이 공개 채널**이다. 채널 이름만 알면 누구나 듣고
-- 보낼 수 있었다. 이름에 계정 id가 들어가는데 파티원은 서로의 `profiles.id`를
-- 읽을 수 있으므로, **파티원끼리는 서로의 행낭을 엿들을 수 있었다.**
--
-- 표(`satchel_settings`·`satchel_runtime`·`battles`)에는 진작 RLS가 걸려 있었다.
-- 통로만 열려 있었던 것이다 — 같은 값이 두 길로 다니는데 한쪽만 잠근 꼴이었다.
--
-- 이제 클라이언트가 `private: true`로 붙고, 여기 정책이 그 자격을 본다.
--
-- **정책이 없으면 아무도 못 붙는다.** 통로를 하나 늘릴 때마다 여기에 정책을
-- 함께 적어야 한다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 통로 이름에서 전투 id를 꺼낸다
-- ----------------------------------------------------------------------------
-- `battle:<uuid>` 모양일 때만 꺼내고 아니면 `null`이다. 모양을 먼저 보지 않고
-- 바로 형변환하면 엉뚱한 이름으로 붙는 순간 정책이 오류로 터진다 — 그러면
-- 거절이 아니라 고장이다.

create or replace function public.topic_battle_id(topic text)
returns uuid
language sql
immutable
as $$
  select case
    when topic ~ '^battle:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then substring(topic from 8)::uuid
    else null
  end;
$$;

-- ----------------------------------------------------------------------------
-- 정책
-- ----------------------------------------------------------------------------
-- `realtime.messages`가 통로를 지키는 자리다. `select`는 듣기, `insert`는 보내기다.
--
-- 두 갈래를 따로 적는다. **행낭은 제 계정 하나**이고, **전투는 그 판에 앉은
-- 사람들**이다 — 자격을 정하는 근거가 다르므로 한 줄에 섞지 않는다.

alter table realtime.messages enable row level security;

-- 행낭 — 계정 하나에 통로 하나. 배치도 판도 여기로 다닌다.
drop policy if exists "행낭 통로: 제 것만 듣는다" on realtime.messages;
create policy "행낭 통로: 제 것만 듣는다"
  on realtime.messages for select
  to authenticated
  using (realtime.topic() = 'satchel:' || auth.uid()::text);

drop policy if exists "행낭 통로: 제 것에만 보낸다" on realtime.messages;
create policy "행낭 통로: 제 것에만 보낸다"
  on realtime.messages for insert
  to authenticated
  with check (realtime.topic() = 'satchel:' || auth.uid()::text);

-- 전투 — 그 판에 **앉은 사람만**이다. 파티원이라도 앉지 않았으면 못 듣는다.
-- 표 쪽 정책(`0007`)과 같은 기준을 쓴다.
drop policy if exists "전투 통로: 앉은 사람만 듣는다" on realtime.messages;
create policy "전투 통로: 앉은 사람만 듣는다"
  on realtime.messages for select
  to authenticated
  using (public.is_battle_participant(public.topic_battle_id(realtime.topic())));

drop policy if exists "전투 통로: 앉은 사람만 보낸다" on realtime.messages;
create policy "전투 통로: 앉은 사람만 보낸다"
  on realtime.messages for insert
  to authenticated
  with check (public.is_battle_participant(public.topic_battle_id(realtime.topic())));
