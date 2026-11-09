-- ============================================================================
-- 함수 실행 권한을 익명에게서 걷는다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **`revoke ... from public`만으로는 안 잠겼다.**                           │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- Supabase는 `public` 스키마에 새 함수가 생기면 `anon`·`authenticated`·
-- `service_role`에 실행 권한을 **따로** 준다(`pg_default_acl`). 그래서 우리가
-- 적어 온 `revoke ... from public`은 `PUBLIC`만 걷고 `anon`은 남겼다 — 구현 결정
-- 80이 틀렸다(구현 결정 662). 익명으로 찔러 보니 스물여덟 개가 열려 있었다. 함수
-- 안쪽의 `auth.uid() is null` 검사가 막아 새지는 않았지만(구현 결정 81) 그것은
-- 두 번째 울타리다.
--
-- 갈래는 셋이다:
--   * **익명에게 남긴다** — 익명에게도 걸리는 정책(역할이 `public`)이 부르는 판정
--     함수 다섯. 걷으면 익명 조회가 빈 결과 대신 `permission denied`가 된다. 참/
--     거짓만 돌려주고 `auth.uid()`가 비면 거짓이라 새는 것이 없다.
--   * **지운다** — 초대 함수 둘. `invites` 표를 `0036`에서 지웠는데 함수가 남아
--     있었다 — 부르면 터지는 죽은 코드다(구현 결정 421).
--   * **익명에게서 걷는다** — 나머지 전부. 트리거 함수는 실행 권한을 걸 때만 보고
--     불릴 때는 안 보므로 걷어도 트리거는 그대로 돈다.
--
-- 그리고 **앞으로 만들 함수도** 익명·PUBLIC에 안 가게 기본 권한을 고친다 — 안
-- 그러면 다음 함수가 또 열린 채로 태어난다. `authenticated`·`service_role`은 기본
-- 권한에 그대로 남는다.
-- ============================================================================

drop function if exists public.accept_invite(text);
drop function if exists public.peek_invite(text);

do $$
declare
  f record;
  keep text[] := array[
    'is_party_member', 'campaign_party', 'battle_party',
    'is_battle_participant', 'owns_battle_character'
  ];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
  loop
    if f.proname = any (keep) then
      continue;
    end if;
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;

/*
  두 줄이어야 한다. **PUBLIC의 함수 실행 권한은 스키마 단위로는 못 걷는다** — 스키마
  단위 기본 권한은 더하기만 하고, PUBLIC에 주는 것은 전역 기본값이라 전역으로 걷어야
  한다. 스키마 단위로만 적었더니 새 함수가 여전히 익명에게 열렸다(시험해 보고 알았다).
*/
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
