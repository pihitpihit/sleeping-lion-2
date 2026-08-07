-- ============================================================================
-- N2 — 계정·파티·전투의 바닥
-- ----------------------------------------------------------------------------
-- 정본: SPEC 6.1 / 6.2, milestone/N2-백엔드-기반.md
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 레포와 번들이 공개다. 클라이언트의 게이트는 "안 보여주기"일 뿐이고         │
-- │ **"안 주기"는 RLS만 할 수 있다.**                                         │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 그래서 이 파일의 핵심은 표가 아니라 **정책**이다. 모든 테이블에 RLS를 켜고,
-- 켜지 않은 테이블이 하나도 없어야 한다 — 안 켠 테이블은 publishable 키만으로
-- 통째로 열린다.
--
-- **`battle_state` 테이블은 없다.** 원소 여섯 값은 Broadcast로 흘려보내고 아무
-- 데도 쓰지 않는다(SPEC 4.2 / 5.4). 방과 참여자는 서버가 알아야 하므로 남지만
-- 값은 남지 않는다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles — auth.users에 딸린 표시 이름
-- ----------------------------------------------------------------------------
-- 이메일은 로그인에만 쓰고 화면에 내보내지 않는다(SPEC 4.2). 파티원 목록에 보일
-- 이름이 따로 있어야 한다.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  displayName text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 가입하면 빈 프로필이 함께 생긴다. 없으면 파티원 목록에 구멍이 난다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, displayName)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- parties — 같이 노는 사람들의 묶음. 지속된다.
-- ----------------------------------------------------------------------------
-- **파티는 평평하다**(SPEC 6.2). 누구나 만들고, 파티원이면 누구나 초대하고,
-- 누구나 전투를 연다. 6장 첫머리의 '파티장'은 축 ①의 편집 권한에 대한 것이며
-- 여기 섞지 않는다.

create table if not exists public.parties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.party_members (
  party_id  uuid not null references public.parties (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create index if not exists party_members_user_idx on public.party_members (user_id);

-- ----------------------------------------------------------------------------
-- invites — 초대 링크
-- ----------------------------------------------------------------------------
-- 링크는 메신저를 타고 흐르고 전달되고 캡처된다(SPEC 6.2). 그래서 추측할 수 없는
-- 토큰 + 만료 + 취소가 함께 있어야 한다.

create table if not exists public.invites (
  token      text primary key,
  party_id   uuid not null references public.parties (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked    boolean not null default false,
  used_count integer not null default 0
);

create index if not exists invites_party_idx on public.invites (party_id);

-- ----------------------------------------------------------------------------
-- battles — 이번 판에 모인 사람들. 끝나면 사라진다.
-- ----------------------------------------------------------------------------

create table if not exists public.battles (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references public.parties (id) on delete cascade,
  opened_by  uuid not null references auth.users (id) on delete cascade,
  opened_at  timestamptz not null default now(),
  closed_at  timestamptz
);

create index if not exists battles_party_idx on public.battles (party_id);

create table if not exists public.battle_participants (
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (battle_id, user_id)
);

-- ============================================================================
-- RLS — 정책을 쓰기 전에 켜는 것이 먼저다
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.parties             enable row level security;
alter table public.party_members       enable row level security;
alter table public.invites             enable row level security;
alter table public.battles             enable row level security;
alter table public.battle_participants enable row level security;

-- ----------------------------------------------------------------------------
-- 내가 그 파티에 속했는가.
-- ----------------------------------------------------------------------------
-- 정책 안에서 party_members를 직접 훑으면 그 테이블의 정책이 다시 불려 무한히
-- 돈다. `security definer` 함수로 한 겹 벗겨 그 고리를 끊는다.

create or replace function public.is_party_member(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.party_members
    where party_id = target and user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles — 같은 파티 사람의 이름만 본다
-- ----------------------------------------------------------------------------

create policy "profiles: 내 것은 본다"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: 같은 파티 사람은 본다"
  on public.profiles for select
  using (exists (
    select 1
    from public.party_members mine
    join public.party_members theirs on theirs.party_id = mine.party_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  ));

create policy "profiles: 내 것만 고친다"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- parties — 속한 사람만 본다
-- ----------------------------------------------------------------------------

create policy "parties: 속한 것만 본다"
  on public.parties for select
  using (public.is_party_member(id));

-- 누구나 만들 수 있다. 다만 **남의 이름으로 만들 수는 없다.**
create policy "parties: 누구나 만든다"
  on public.parties for insert
  with check (created_by = auth.uid());

create policy "parties: 파티원이 고친다"
  on public.parties for update
  using (public.is_party_member(id))
  with check (public.is_party_member(id));

-- ----------------------------------------------------------------------------
-- party_members
-- ----------------------------------------------------------------------------

create policy "구성원: 같은 파티 것만 본다"
  on public.party_members for select
  using (public.is_party_member(party_id));

-- **자기 자신만 넣는다.** 남을 끌어들이는 길은 초대 토큰뿐이다(아래 RPC).
create policy "구성원: 스스로 든다"
  on public.party_members for insert
  with check (user_id = auth.uid() and public.is_party_member(party_id));

create policy "구성원: 스스로 나간다"
  on public.party_members for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- invites
-- ----------------------------------------------------------------------------
-- **목록으로는 못 읽는다.** 파티원이 자기 파티 것만 본다. 토큰을 아는 사람이
-- 들어오는 길은 아래 `accept_invite` 하나뿐이다 — 그러지 않으면 토큰을 하나씩
-- 넣어보며 남의 파티 이름을 캐낼 수 있다.

create policy "초대: 파티원이 본다"
  on public.invites for select
  using (public.is_party_member(party_id));

create policy "초대: 파티원이 만든다"
  on public.invites for insert
  with check (created_by = auth.uid() and public.is_party_member(party_id));

create policy "초대: 파티원이 취소한다"
  on public.invites for update
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

-- ----------------------------------------------------------------------------
-- battles / battle_participants
-- ----------------------------------------------------------------------------

create policy "전투: 파티원이 본다"
  on public.battles for select
  using (public.is_party_member(party_id));

create policy "전투: 파티원이 연다"
  on public.battles for insert
  with check (opened_by = auth.uid() and public.is_party_member(party_id));

create policy "전투: 파티원이 닫는다"
  on public.battles for update
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "참여자: 같은 파티 것만 본다"
  on public.battle_participants for select
  using (exists (
    select 1 from public.battles b
    where b.id = battle_id and public.is_party_member(b.party_id)
  ));

-- **참여는 고르는 것이다**(SPEC 6.2). 남을 끌어들이지 못한다.
create policy "참여자: 스스로 든다"
  on public.battle_participants for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.battles b
    where b.id = battle_id and public.is_party_member(b.party_id)
  ));

create policy "참여자: 스스로 나간다"
  on public.battle_participants for delete
  using (user_id = auth.uid());

-- ============================================================================
-- accept_invite — 토큰으로 파티에 드는 유일한 길
-- ============================================================================
-- 정책만으로는 못 푼다. 아직 파티원이 아닌 사람이 들어와야 하는데, 구성원 정책은
-- "이미 파티원일 것"을 요구하기 때문이다. 토큰을 검사하는 일을 서버 쪽 함수로
-- 옮겨 그 고리를 끊는다.
--
-- **파티 이름을 돌려주지 않는다.** 토큰이 맞아야 비로소 파티가 보인다.

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

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;
