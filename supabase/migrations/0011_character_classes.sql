-- ============================================================================
-- character_classes — 클래스별 게임 수치
-- ----------------------------------------------------------------------------
-- 정본: SPEC 3장 (2026-08-11 개정)
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **레포에는 넣지 않는다. 여기에만 둔다.**                                  │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 클래스 이름·핸드 사이즈·레벨별 체력은 실물 카드에 인쇄된 게임 콘텐츠다.
-- **레포와 배포 사이트가 공개**이므로 거기 커밋하면 그 순간 우리가 공개 배포하는
-- 것이 된다(절대 원칙 1). SQL 파일에 적어 넣는 것도 같다 — 그것도 레포다.
--
-- 그래서 **값은 이 파일에 없다.** 표와 정책만 세우고, 실제 수치는 앱 안의 관리자
-- 화면에서 형님이 넣는다.
--
-- **읽는 것은 승인된 사람뿐이다.** 로그인하고 관리자에게 들여보내진 사람만 본다 —
-- 자기가 산 게임의 수치를 자기 파티가 보는 것이라 공개 배포와 성격이 다르다.
-- 익명에게는 한 줄도 가지 않는다.
--
-- **쓰는 것은 관리자뿐이다.** 파티원 아무나 고치면 상 위의 사실이 사람마다
-- 달라진다.
-- ============================================================================

create table if not exists public.character_classes (
  /**
   * Creator Pack `Class Icons and Augments.pdf`의 쪽 번호(1~21).
   *
   * 이것이 열쇠다 — 캐릭터가 이미 이 번호로 클래스를 가리키고 있으므로
   * (`characters.class_icon`) 따로 이어 줄 것이 없다.
   */
  icon       smallint primary key check (icon between 1 and 21),

  name       text not null default '',
  /** 손에 드는 능력 카드 수. 카드 좌상단 표시의 숫자다. */
  hand_size  smallint not null default 0 check (hand_size between 0 and 20),

  /**
   * 레벨 1~9의 최대 체력. 아홉 칸 고정이다.
   *
   * 실물 시트의 눈금이 9까지이므로(구현 결정 42) 길이가 정해져 있다. 길이를
   * 강제해 두면 화면이 `hp[level - 1]`을 믿고 읽을 수 있다.
   */
  hp         smallint[] not null default '{}' check (
    array_length(hp, 1) is null or array_length(hp, 1) = 9
  ),

  updated_at timestamptz not null default now()
);

alter table public.character_classes enable row level security;

-- **승인된 사람만 읽는다.** 로그인만으로는 안 된다 — 가입은 열려 있고 들이는
-- 것은 관리자다(`0004`).
drop policy if exists "클래스: 승인된 사람이 본다" on public.character_classes;
create policy "클래스: 승인된 사람이 본다"
  on public.character_classes for select
  to authenticated
  using (public.is_approved());

-- **쓰는 것은 관리자뿐이다.**
drop policy if exists "클래스: 관리자가 넣는다" on public.character_classes;
create policy "클래스: 관리자가 넣는다"
  on public.character_classes for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "클래스: 관리자가 고친다" on public.character_classes;
create policy "클래스: 관리자가 고친다"
  on public.character_classes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "클래스: 관리자가 지운다" on public.character_classes;
create policy "클래스: 관리자가 지운다"
  on public.character_classes for delete
  to authenticated
  using (public.is_admin());

create or replace function public.touch_character_class()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists character_classes_touch on public.character_classes;
create trigger character_classes_touch
  before update on public.character_classes
  for each row execute function public.touch_character_class();
