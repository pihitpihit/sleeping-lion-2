-- ============================================================================
-- class_perks — 클래스별 특혜 표
-- ----------------------------------------------------------------------------
-- 정본: SPEC 3장 (2026-08-11 개정), CLAUDE.md 절대 원칙 1
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **레포에는 넣지 않는다. 여기에만 둔다.**                                  │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 특혜 한 줄에 적힌 글("−1 카드 2장 제거")은 실물 시트에 인쇄된 게임 콘텐츠다.
-- 클래스 이름·체력을 DB에만 두기로 한 것과 **같은 선**이며, 지금까지 담은 것 중
-- 가장 또렷하게 저작물성이 있는 것이다. 레포와 배포 사이트가 공개이므로 거기
-- 커밋하면 그 순간 우리가 공개 배포하는 것이 된다 — **마이그레이션 SQL도 레포다.**
--
-- 그래서 **값은 이 파일에 없다.** 표와 정책만 세우고 실제 내용은 앱 안의 관리자
-- 화면에서 넣는다(`ClassPerkEditor`).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **한 줄이 곧 상자 여러 개다.**                                            │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 실물 시트는 줄마다 체크상자가 하나에서 셋까지 붙어 있고, 클래스마다 상자를 다
-- 세면 정확히 열다섯이다. 캐릭터가 켜 둔 것(`characters.perks`)은 **상자 번호**
-- 이므로, 줄을 `sort` 차례로 펴서 `count`만큼 번호를 매기면 그대로 맞물린다.
-- 캐릭터 쪽 표를 고칠 일이 없다.
-- ============================================================================

create table if not exists public.class_perks (
  id       uuid primary key default gen_random_uuid(),

  class_id uuid not null references public.character_classes (id) on delete cascade,

  /** 시트에 적힌 차례. 상자 번호가 여기서 나오므로 **틈 없이 0부터** 매긴다. */
  sort     smallint not null default 0,

  /** 이 줄에 붙은 체크상자 수. 실물에서 셋을 넘는 줄은 없다. */
  count    smallint not null default 1 check (count between 1 and 5),

  /** 사람이 읽는 줄. 게임 콘텐츠이므로 **레포에는 없고 여기에만 있다.** */
  text     text not null default '',

  /**
   * 상자 하나를 켤 때 덱에 가하는 변경.
   *
   * `{"m1": -2, "p1": 1}` 꼴이다 — 열쇠는 `cardSpec.ts`의 명세 낱말이고
   * (`p1`·`p1.wound`·`r.p0.fire`) 값은 장수의 증감이다. **교체는 두 줄로 쪼갠다**
   * ("−1 한 장을 +1 한 장으로" → `{"m1": -1, "p1": 1}`).
   *
   * **모양을 서버가 알 필요가 없다.** 읽고 쓰는 것은 언제나 통째이며 조각으로
   * 질의할 일이 없다(`satchel_settings`와 같은 이유, 구현 결정 56).
   */
  changes  jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now(),

  -- 같은 줄이 두 번 들어가지 않게. 붙여넣기로 넣고 고치는 흐름이라 `sort`가
  -- 열쇠 노릇을 한다 — 다시 올리면 새로 생기는 것이 아니라 고쳐져야 한다.
  unique (class_id, sort)
);

create index if not exists class_perks_class_idx on public.class_perks (class_id, sort);

alter table public.class_perks enable row level security;

-- **승인된 사람만 읽는다.** 로그인만으로는 안 된다 — 가입은 열려 있고 들이는
-- 것은 관리자다(`0004`). 익명에게는 한 줄도 가지 않는다.
drop policy if exists "특혜: 승인된 사람이 본다" on public.class_perks;
create policy "특혜: 승인된 사람이 본다"
  on public.class_perks for select
  to authenticated
  using (public.is_approved());

-- **쓰는 것은 관리자뿐이다.** 파티원 아무나 고치면 상 위의 사실이 사람마다
-- 달라지고, 그것이 덱 구성으로 곧장 이어진다.
drop policy if exists "특혜: 관리자가 넣는다" on public.class_perks;
create policy "특혜: 관리자가 넣는다"
  on public.class_perks for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "특혜: 관리자가 고친다" on public.class_perks;
create policy "특혜: 관리자가 고친다"
  on public.class_perks for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "특혜: 관리자가 지운다" on public.class_perks;
create policy "특혜: 관리자가 지운다"
  on public.class_perks for delete
  to authenticated
  using (public.is_admin());

create or replace function public.touch_class_perk()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists class_perks_touch on public.class_perks;
create trigger class_perks_touch
  before update on public.class_perks
  for each row execute function public.touch_class_perk();
