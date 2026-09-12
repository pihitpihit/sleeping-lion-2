-- ============================================================================
-- 은퇴한 캐릭터
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **은퇴한 그때의 값이라야 기록이 된다.**                                   │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 형님이 실물 캠페인 책자를 찍어 보내 주었다 — 칸이 다섯이다(플레이어·캐릭터·
-- 클래스·레벨·특혜).
--
-- 다섯 값은 `characters`에 이미 다 있지만 **거기서 뽑아 보여 주면 기록이 아니다.**
--   · 은퇴한 뒤에 경험치를 고치면 레벨이 따라 바뀐다.
--   · 파티를 나가면(`campaign_id`가 비면) 목록에서 사라진다.
--   · 이틀 유예가 끝나 지워지면(`0022`) 함께 사라진다.
--
-- 실물 표는 **한 번 적으면 남는 종이**다. 그래서 은퇴하는 순간의 값을 베껴 둔다 —
-- 캐릭터 로그를 값으로 담는 것과 같은 결이다(구현 결정 370).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **손으로도 적을 수 있다.**                                                │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 앱을 쓰기 전에 종이에 적어 둔 줄이 있고, 앱 밖에서 놀던 사람의 캐릭터도 있다.
-- 그때는 `character_id`가 비고 다섯 칸을 사람이 적는다.
-- ============================================================================

create table if not exists public.retirements (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  /**
   * 어느 캐릭터였나. **앱 밖에서 은퇴한 줄은 비어 있다.**
   *
   * `on delete set null` — 캐릭터가 지워져도 **기록은 남는다.** 그것이 이 표를
   * 따로 두는 까닭이다.
   */
  character_id uuid references public.characters (id) on delete set null,
  /** 화면에 서는 차례. 실물 표처럼 **위에서 아래로 채운다.** */
  sort         smallint not null default 0,
  /** 플레이어 — 은퇴한 그때의 표시 이름. */
  player       text not null default '' check (length(player) <= 60),
  name         text not null default '' check (length(name) <= 60),
  /** 클래스 이름. **그때의 이름을 베껴 둔다** — 클래스 표를 다시 넣어도 안 흔들린다. */
  class_name   text not null default '' check (length(class_name) <= 60),
  /** 클래스 표식의 쪽 번호. 0이면 그림이 없다. */
  class_icon   smallint not null default 0,
  /** 은퇴한 레벨. **모르면 비운다** — 손으로 적을 때 기억 못 할 수 있다. */
  level        smallint check (level between 1 and 9),
  /** 켜 둔 특혜 상자 수. 모르면 비운다. */
  perks        smallint check (perks >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists retirements_by_campaign_idx
  on public.retirements (campaign_id, sort);

/* 한 캐릭터가 같은 기록지에 두 번 오르지 않는다. 손으로 적은 줄은 여럿이어도 된다. */
create unique index if not exists retirements_one_per_character_idx
  on public.retirements (campaign_id, character_id)
  where character_id is not null;

alter table public.retirements enable row level security;

/* **파티 상태는 함께 쓰는 것이다**(구현 결정 44) — 기록지와 같은 자격이다. */
drop policy if exists "은퇴: 파티원이 본다" on public.retirements;
create policy "은퇴: 파티원이 본다"
  on public.retirements for select to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "은퇴: 파티원이 적는다" on public.retirements;
create policy "은퇴: 파티원이 적는다"
  on public.retirements for insert to authenticated
  with check (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "은퇴: 파티원이 고친다" on public.retirements;
create policy "은퇴: 파티원이 고친다"
  on public.retirements for update to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)))
  with check (public.is_party_member(public.campaign_party(campaign_id)));

drop policy if exists "은퇴: 파티원이 지운다" on public.retirements;
create policy "은퇴: 파티원이 지운다"
  on public.retirements for delete to authenticated
  using (public.is_party_member(public.campaign_party(campaign_id)));

-- ----------------------------------------------------------------------------
-- 은퇴에 표를 하면 서버가 베껴 둔다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **화면이 두 번 보내지 않는다 — 서버가 한 번에 한다.**                     │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 시트에서 은퇴를 켜고 저장하면 그 갱신 하나로 기록까지 남는다. 화면이 두 번
-- 보내게 두면 사이에 끊겼을 때 **은퇴는 됐는데 기록이 없는** 꼴이 남는다
-- (`leave_party`·`open_adventure`와 같은 짜임).
--
-- **레벨은 `new.level`을 쓴다.** 레벨은 경험치에서 나오지만(구현 결정 225) 은퇴를
-- 저장하는 그 갱신이 레벨도 함께 적으므로(`sheetDiff`) 이 순간에는 맞는 값이다 —
-- 눈금표를 SQL에 한 벌 더 적지 않는다.
--
-- **은퇴를 껐다가 다시 켜도 두 줄이 되지 않는다**(유일 인덱스). 잘못 켠 줄은
-- 기록지에서 손으로 지운다 — 껐다고 서버가 지우지는 않는다: 그러면 **기록이
-- 스위치를 따라다니는 값**이 되어 종이가 아니게 된다.

create or replace function public.record_retirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.retired and not coalesce(old.retired, false) and new.campaign_id is not null then
    insert into public.retirements (
      campaign_id, character_id, sort, player, name, class_name, class_icon, level, perks
    )
    select
      new.campaign_id,
      new.id,
      coalesce(
        (select max(r.sort) + 1 from public.retirements r where r.campaign_id = new.campaign_id),
        0
      ),
      coalesce(p.display_name, ''),
      new.name,
      coalesce(cc.name, ''),
      coalesce(new.class_icon, 0),
      new.level,
      coalesce(array_length(new.perks, 1), 0)
    from (select 1) as anchor
    left join public.profiles p on p.id = new.owner_id
    left join public.character_classes cc on cc.id = new.class_id
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists record_retirement_trg on public.characters;
create trigger record_retirement_trg
  after update of retired on public.characters
  for each row execute function public.record_retirement();
