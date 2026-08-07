-- ============================================================================
-- 기록지를 파티에 묶는다 + 0001의 고리 둘을 푼다
-- ----------------------------------------------------------------------------
-- 정본: SPEC 6.2 / 7장
--
-- **기록지는 파티에 묶인다.** 파티원이면 같은 기록지를 본다 — SPEC 6장의
-- "여러 사용자가 같은 캠페인을 본다"가 그 뜻이다. 계정에 묶으면 폰과 PC는
-- 맞춰지지만 파티원끼리는 여전히 못 나눈다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 고리 ① — 파티를 만든 사람이 스스로 못 들어간다
-- ----------------------------------------------------------------------------
-- 0001의 `구성원: 스스로 든다`는 "이미 파티원일 것"을 요구한다. 그러면 방금 만든
-- 파티에는 만든 사람도 못 들어간다 — 파티원이 되려면 파티원이어야 한다.
--
-- **파티 만들기를 함수 하나로 묶어 푼다.** 표를 만들고 만든 사람을 넣는 두 가지가
-- 한 트랜잭션에서 일어나므로, 절반만 된 파티(주인 없는 파티)가 남지 않는다.

drop policy if exists "구성원: 스스로 든다" on public.party_members;

-- 이제 직접 넣는 길은 **자기가 만든 파티에 자기를 넣는 것**뿐이다. 남이 들어오는
-- 길은 `accept_invite` 하나로 남는다(0001).
create policy "구성원: 만든 사람이 스스로 든다"
  on public.party_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.parties p
      where p.id = party_id and p.created_by = auth.uid()
    )
  );

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

revoke all on function public.create_party(text) from public;
grant execute on function public.create_party(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 고리 ② — 초대받은 사람이 초대장을 못 읽는다
-- ----------------------------------------------------------------------------
-- 0001은 초대장을 파티원에게만 보인다. 옳지만, **아직 파티원이 아닌 사람**이
-- 링크를 열었을 때 "낡았다"와 "거두어졌다"와 "그런 것 없다"를 가릴 수 없게 된다.
-- `invite.ts`가 그 셋을 갈라 말하려고 만든 화면이 전부 '없다'로 떨어진다.
--
-- **상태만 돌려주는 함수를 둔다.** 파티 이름도 id도 주지 않으므로, 토큰을 넣어보며
-- 남의 파티를 캐낼 수는 없다. 알 수 있는 것은 "이 토큰이 지금 쓸 만한가"뿐이다.

create or replace function public.peek_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.invites%rowtype;
begin
  select * into row from public.invites where token = invite_token;
  if not found then return 'unknown'; end if;
  if row.revoked then return 'revoked'; end if;
  if row.expires_at <= now() then return 'expired'; end if;
  return 'ok';
end;
$$;

revoke all on function public.peek_invite(text) from public;
grant execute on function public.peek_invite(text) to authenticated;

-- ============================================================================
-- campaigns — 파티 기록지
-- ============================================================================
-- 축 ①이다. 축 ②(행낭)는 여기 오지 않는다 — 위젯 배치는 각자 localStorage,
-- 도구 런타임은 메모리다(SPEC 5.2).
--
-- 업적은 **사용자가 친 글자**다. 업적 이름은 시나리오·카드에 인쇄된 게임
-- 콘텐츠이므로 우리가 목록을 담지 않는다(SPEC 3장).

create table if not exists public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references public.parties (id) on delete cascade,
  name         text not null default '',
  location     text not null default '',
  notes        text not null default '',
  achievements text[] not null default '{}',
  -- 눈금 밖으로 나간 값이 서버에 남지 않게 한다. 화면도 막지만 서버가 마지막 문이다.
  reputation   integer not null default 0 check (reputation between -20 and 20),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- 낙관적 잠금 자리(SPEC 5.3). 지금은 세기만 하고, 충돌 처리는 나중에 얹는다.
  version      integer not null default 1
);

create index if not exists campaigns_party_idx on public.campaigns (party_id, updated_at desc);

alter table public.campaigns enable row level security;

create policy "기록지: 파티원이 본다"
  on public.campaigns for select
  using (public.is_party_member(party_id));

create policy "기록지: 파티원이 만든다"
  on public.campaigns for insert
  with check (public.is_party_member(party_id));

create policy "기록지: 파티원이 고친다"
  on public.campaigns for update
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "기록지: 파티원이 지운다"
  on public.campaigns for delete
  using (public.is_party_member(party_id));

-- ----------------------------------------------------------------------------
-- updated_at·version은 서버가 찍는다
-- ----------------------------------------------------------------------------
-- 화면이 보내는 값을 믿지 않는다. 클라이언트마다 시계가 다르고, 무엇보다 version은
-- **고친 횟수**라 보내는 쪽이 정할 것이 아니다 — 오래된 화면이 낮은 version을
-- 보내면 낙관적 잠금이 그 순간 무의미해진다.

create or replace function public.touch_campaign()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  -- 소속과 만든 때는 옮기지 못한다. 남의 파티로 기록지를 밀어 넣을 수 없다.
  new.party_id := old.party_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists campaigns_touch on public.campaigns;
create trigger campaigns_touch
  before update on public.campaigns
  for each row execute function public.touch_campaign();
