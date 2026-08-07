-- ============================================================================
-- profiles.displayName → display_name
-- ----------------------------------------------------------------------------
-- 0001에서 `displayName text`로 적었는데 **Postgres는 따옴표 없는 식별자를
-- 소문자로 접는다.** 실제로 만들어진 칼럼은 `displayname`이었다.
--
-- 돌아가기는 하지만 두 가지가 걸린다.
--
--  1. SQL에 적힌 이름과 실제 이름이 다르다. 읽는 사람이 `displayName`으로 코드를
--     짜면 런타임에 "칼럼을 못 찾는다"로 터진다.
--  2. `created_at`·`updated_at`은 snake_case인데 이것만 붙여쓰기라 결이 어긋난다.
--
-- snake_case로 맞춘다. 이제 SQL에 적힌 그대로가 실제 이름이다.
-- ============================================================================

alter table public.profiles rename column displayname to display_name;

-- 트리거도 새 이름을 보게 고친다. 안 고치면 가입할 때 터진다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
