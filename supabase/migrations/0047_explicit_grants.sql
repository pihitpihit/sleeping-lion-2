-- ============================================================================
-- 표마다 Data API 권한을 직접 준다
-- ----------------------------------------------------------------------------
-- Supabase가 2026-10-30부터 `public`에 새로 만든 표에 Data API 권한을 저절로 주지
-- 않는다. 지금 있는 표는 그대로지만, **스키마를 처음부터 다시 세우는 자리**
-- (새 프로젝트에 `db push`로 되살리기, 로컬 `db reset`)에서는 0001~0046이 만드는
-- 표가 전부 「새 표」가 되어 권한 없이 선다 — 그러면 앱이 통째로
-- `permission denied`를 받는다. 백업을 되살리는 길(`tools/backup.sh`)이 바로 그것이다.
--
-- 그래서 마지막에 한 번, `public`의 표 전부에 권한을 준다. 이미 있는 프로젝트에서는
-- 아무것도 안 바뀐다(옛 기본값이 이보다 넓게 이미 주고 있다).
--
-- **`anon`에는 읽기만 준다.** 익명이 쓰는 길은 하나도 없다 — 막는 것은 처음부터
-- RLS지만(구현 결정 16·44) 안 쓰는 권한까지 줄 까닭은 없다. 읽기까지 걷으면
-- keepalive가 익명으로 찌르는 길이 `permission denied`로 바뀌어 워크플로가 실패한다.
--
-- 앞으로 표를 만드는 마이그레이션은 **그 파일 안에서** 같은 `grant`를 적는다.
-- ============================================================================

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('grant select on public.%I to anon', t.relname);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated, service_role',
      t.relname
    );
  end loop;
end
$$;
