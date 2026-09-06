-- ============================================================================
-- 보물 색인
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **책자에 인쇄된 표다 — 글은 DB에만 둔다.**                                │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 형님이 실물 책자(119~121쪽)를 찍어 보내 주었다. 「'대형 방패'(032번 아이템)
-- 획득」처럼 번호마다 한 줄이 붙는다. 특혜·개봉 조건과 같은 등급이라(구현 결정
-- 135) 레포와 배포물에는 표와 정책뿐이고 값은 앱 안의 관리자 화면에서 들어간다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **번호가 곧 열쇠다 — uuid를 두지 않는다.**                                │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 개봉 조건은 줄마다 uuid를 주었다(`0027`). 시트에 번호가 없어서 줄이 밀리면 켠
-- 것이 딴 줄을 가리키기 때문이다. **보물은 다르다** — 타일에 번호가 박혀 있고
-- 그 번호가 곧 책자의 줄이다. 번호를 열쇠로 쓰면 **표를 다시 넣어도 찾은 것이
-- 안 흔들린다.**
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **글은 찾은 사람에게만 보인다.**                                          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 책자가 그 쪽 머리에 「이 정보를 알지 마십시오」라고 적어 두었다 — 타일을 찾아
-- 확인할 때 말고는 읽으면 안 되는 글이다. **가리는 것은 화면이 한다**: 서버는
-- 승인된 사람에게 표를 통째로 내준다(레포와 번들이 공개라 화면으로 가리는 것은
-- 아무것도 못 막지만, 여기서 막으려는 것은 공격이 아니라 **실수로 읽는 것**이다).
-- ============================================================================

create table if not exists public.treasures (
  /** 타일에 박힌 번호. **이것이 열쇠다.** */
  no         smallint primary key check (no between 1 and 999),
  /** 책자에 적힌 줄 그대로. */
  text       text not null check (length(trim(text)) between 1 and 400),
  created_at timestamptz not null default now()
);

alter table public.treasures enable row level security;

/* 읽는 것은 승인된 사람, 쓰는 것은 관리자 — 클래스 수치·특혜·개봉 조건과 같다. */
drop policy if exists "보물: 승인된 사람이 본다" on public.treasures;
create policy "보물: 승인된 사람이 본다"
  on public.treasures for select
  to authenticated
  using (public.is_approved());

drop policy if exists "보물: 관리자가 넣는다" on public.treasures;
create policy "보물: 관리자가 넣는다"
  on public.treasures for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "보물: 관리자가 고친다" on public.treasures;
create policy "보물: 관리자가 고친다"
  on public.treasures for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "보물: 관리자가 지운다" on public.treasures;
create policy "보물: 관리자가 지운다"
  on public.treasures for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 파티가 무엇을 찾았는가
-- ----------------------------------------------------------------------------
-- **번호의 목록**이다. 개봉 조건이 `{ id: 켠 칸 수 }`인 것과 달리 여기는 켰다/
-- 껐다뿐이라 셈할 것이 없다 — 파티 업적이 이름의 목록인 것과 같은 모양이다.
--
-- 고치는 것은 파티원 누구나이며(구현 결정 44) 정책은 `campaigns`의 것을 그대로
-- 탄다.

alter table public.campaigns
  add column if not exists treasures smallint[] not null default '{}'::smallint[];
