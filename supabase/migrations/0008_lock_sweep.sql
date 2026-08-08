-- ============================================================================
-- sweep_stale_battles를 잠근다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **`grant`를 적었다고 남이 못 부르는 것이 아니다.**                        │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- `0007`에 `grant execute ... to authenticated`를 적어 두고 그것으로 잠갔다고
-- 여겼다. **Postgres는 함수 실행 권한을 만들 때 이미 `PUBLIC`에 준다.** 그래서
-- 적은 `grant`는 있으나 마나였고, `security definer`가 걸린 DELETE 함수를 로그인
-- 하지 않은 쪽에서도 부를 수 있었다. 배포된 것에 익명으로 찔러 보고 알았다 —
-- 200에 0을 돌려주었다.
--
-- 지금 지우는 것이 하루 지난 버려진 판뿐이라 피해는 없었다. 그러나 이 자리는
-- **함수 내용이 한 번 바뀌면 곧바로 위험해지는 모양**이다. 잠가 둔다.
--
-- 두 겹으로 막는다. 권한을 거두는 것과, 함수 안에서 한 번 더 보는 것.
-- 권한은 나중에 누가 `grant`를 다시 적으면 풀리지만 안쪽 검사는 남는다.
-- ============================================================================

create or replace function public.sweep_stale_battles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  -- 로그인한 사람만. `security definer`는 함수를 만든 이의 권한으로 돌므로
  -- 부르는 쪽이 누구인지 안에서 봐야 한다.
  if auth.uid() is null then
    raise exception '로그인이 필요하다';
  end if;

  delete from public.battles where opened_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- `create` 때 딸려 온 PUBLIC 권한을 거둔다. `anon`은 그 아래 있으므로 함께 빠진다.
revoke execute on function public.sweep_stale_battles() from public;
revoke execute on function public.sweep_stale_battles() from anon;
grant execute on function public.sweep_stale_battles() to authenticated;
