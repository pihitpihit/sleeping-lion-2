-- ============================================================================
-- 상점 — 우리가 적어 두는 아이템 목록
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **남의 데이터베이스를 들이지 않는다. 우리가 적는다.**                     │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 아이템 데이터를 모아 둔 저장소가 몇 있지만(2026-08-14에 훑었다) 하나는 재사용을
-- 명시적으로 막고 나머지도 라이선스가 없다. **형님이 보류했고**, 대신 쓰는 사람이
-- 직접 적는 길로 간다 — 실물을 손에 들고 노는 자리라 이름과 값을 옮겨 적는 것이
-- 어렵지 않다.
--
-- 지금 다루는 것은 **이름과 가격 둘뿐이다.** 슬롯·소모·해금은 적을 자리를 두지
-- 않는다 — 필요해지면 칸을 늘리면 되고, 그때까지 비어 있는 칸은 무엇이 확인된
-- 것인지만 흐린다(구현 결정 `MARKS`의 선과 같다).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **아이템 이름은 게임 콘텐츠다 — DB에만 둔다.**                            │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 클래스 이름·특혜 글과 같은 등급이다(구현 결정 111·135). 레포와 배포물에는 표와
-- 정책만 담기며 값은 앱 안에서 들어간다. **마이그레이션 SQL에 적는 것도 같다.**
--
-- 읽는 것도 쓰는 것도 **승인된 사람**이다. 클래스 수치가 관리자만 쓰는 것과
-- 갈린다 — 상점은 놀다가 그 자리에서 한 줄 더하는 곳이라 관리자를 부르면 판이
-- 멎는다.
-- ============================================================================

create table if not exists public.shop_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 60),
  /* 금화. 공짜(0)도 있고 값이 안 정해진 것도 있으므로 음수만 막는다. */
  cost       integer not null default 0 check (cost >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

/* 같은 이름을 두 번 적지 않는다 — 목록이 흐려지고 어느 쪽을 산 것인지 모른다. */
create unique index if not exists shop_items_name_idx
  on public.shop_items (lower(trim(name)));

alter table public.shop_items enable row level security;

drop policy if exists "상점: 승인된 사람이 본다" on public.shop_items;
create policy "상점: 승인된 사람이 본다"
  on public.shop_items for select
  to authenticated
  using (public.is_approved());

drop policy if exists "상점: 승인된 사람이 적는다" on public.shop_items;
create policy "상점: 승인된 사람이 적는다"
  on public.shop_items for insert
  to authenticated
  with check (public.is_approved() and created_by = auth.uid());

drop policy if exists "상점: 승인된 사람이 고친다" on public.shop_items;
create policy "상점: 승인된 사람이 고친다"
  on public.shop_items for update
  to authenticated
  using (public.is_approved())
  with check (public.is_approved());

/*
  지우는 것은 적은 사람과 관리자다.

  **남이 적어 둔 것을 아무나 지우면** 옆 사람이 사려던 것이 사라진다. 오타를
  치운다든지 하는 일은 적은 사람이 하고, 그 사람이 없으면 관리자가 한다.
*/
drop policy if exists "상점: 적은 사람이 지운다" on public.shop_items;
create policy "상점: 적은 사람이 지운다"
  on public.shop_items for delete
  to authenticated
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));
