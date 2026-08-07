-- ============================================================================
-- 가입은 열되, 쓰는 것은 승인받은 사람만
-- ----------------------------------------------------------------------------
-- 누구나 가입할 수 있다. 다만 승인 전에는 로그아웃과 비밀번호 바꾸기 외에
-- 아무것도 못 한다. 승인은 **관리자만** 한다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **승인과 파티 가입은 다른 것이다.**                                       │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 승인은 "앱을 쓸 수 있다"이고, 남의 기록지가 보이는 것은 **파티에 들었을 때**다.
-- 우리 보안 모델이 파티 기준이므로(0001·0003) 승인이 뚫려도 남의 기록은 새지
-- 않는다. 벽이 두 겹인 셈이다.
-- ============================================================================

-- 관리자. 바꾸려면 이 함수 하나만 고치면 된다.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and lower(email) = 'pihitpihit@gmail.com'
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles.approved
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists approved boolean not null default false,
  add column if not exists approved_at timestamptz;

-- **이미 있는 계정은 전부 승인한다.** 지금 있는 것은 형님이 콘솔에서 손수 만든
-- 것뿐이다. 기본값(false)만 넣고 끝내면 형님이 제 앱에서 잠긴다.
update public.profiles set approved = true, approved_at = now() where approved = false;

-- ----------------------------------------------------------------------------
-- 스스로 승인하지 못하게 막는다
-- ----------------------------------------------------------------------------
-- RLS 정책은 **행**을 가리지 칸을 가리지 못한다. `내 것만 고친다`가 살아 있는 한
-- 사용자는 자기 행의 `approved`도 참으로 바꿀 수 있다. 칼럼 단위 권한으로 막는다.

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 가입하면 프로필이 함께 생긴다 — 관리자는 자동 승인
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean := lower(coalesce(new.email, '')) = 'pihitpihit@gmail.com';
begin
  insert into public.profiles (id, display_name, approved, approved_at)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), ''),
    is_owner,
    case when is_owner then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 내 처지 — 화면이 게이트를 세우는 데 쓴다
-- ----------------------------------------------------------------------------
-- 한 번에 둘을 돌려준다. 나눠 물으면 왕복이 둘이 되고, 로그인 직후는 화면이
-- 멈춰 보이는 자리라 왕복 하나가 아깝다.
--
-- **프로필이 없으면 승인되지 않은 것으로 본다.** 트리거가 실패했거나 아직
-- 안 도는 순간이 있다 — 그때 열어주는 것보다 잠그는 편이 낫다.

create or replace function public.my_status()
returns table (approved boolean, is_admin boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce((select p.approved from public.profiles p where p.id = auth.uid()), false),
    public.is_admin();
$$;

revoke all on function public.my_status() from public;
grant execute on function public.my_status() to authenticated;

-- ----------------------------------------------------------------------------
-- 대기자 목록과 승인 — 관리자만
-- ----------------------------------------------------------------------------
-- 이메일은 `auth.users`에 있고 그 표는 아무에게도 열려 있지 않다. `security
-- definer` 함수가 관리자인지 보고 나서 꺼내 준다.

create or replace function public.list_pending_users()
returns table (id uuid, email text, created_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있다';
  end if;

  return query
    select u.id, u.email::text, u.created_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where p.approved = false
    order by u.created_at asc;
end;
$$;

revoke all on function public.list_pending_users() from public;
grant execute on function public.list_pending_users() to authenticated;

create or replace function public.approve_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 승인할 수 있다';
  end if;

  update public.profiles
  set approved = true, approved_at = now(), updated_at = now()
  where id = target;

  if not found then
    raise exception '그런 사람이 없다';
  end if;
end;
$$;

revoke all on function public.approve_user(uuid) from public;
grant execute on function public.approve_user(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 승인 전에는 아무것도 만지지 못한다
-- ----------------------------------------------------------------------------
-- 화면이 막는 것은 UX일 뿐이다. 번들이 공개이므로 승인 안 된 사람이 API를 직접
-- 두드릴 수 있다 — **여기서 막아야 진짜로 막힌다.**
--
-- 파티를 세우는 것과 초대를 받는 것 둘만 잠그면 된다. 나머지(기록지·전투)는
-- 파티에 속해야 닿는데, 이 둘을 막으면 파티에 들 길이 없다.

create or replace function public.is_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.create_party(party_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요하다';
  end if;
  if not public.is_approved() then
    raise exception '아직 승인되지 않은 계정이다';
  end if;
  if coalesce(trim(party_name), '') = '' then
    raise exception '파티 이름이 필요하다';
  end if;

  insert into public.parties (name, created_by)
  values (trim(party_name), auth.uid())
  returning id into new_id;

  insert into public.party_members (party_id, user_id)
  values (new_id, auth.uid());

  return new_id;
end;
$$;

create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요하다';
  end if;
  if not public.is_approved() then
    raise exception '아직 승인되지 않은 계정이다';
  end if;

  select party_id into target
  from public.invites
  where token = invite_token
    and revoked = false
    and expires_at > now();

  if target is null then
    -- 없는 것과 만료된 것을 가르지 않는다. 가르면 토큰을 넣어보며 캐낼 수 있다.
    raise exception '쓸 수 없는 초대다';
  end if;

  insert into public.party_members (party_id, user_id)
  values (target, auth.uid())
  on conflict do nothing;

  update public.invites
  set used_count = used_count + 1
  where token = invite_token;

  return target;
end;
$$;
