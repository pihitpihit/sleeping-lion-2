-- ============================================================================
-- 기록에 '어떤 경로로 고쳤는가'를 함께 남긴다 + 기록은 제 것만 본다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **무엇이 바뀌었는가만으로는 부족하다 — 왜 바뀌었는지가 갈린다.**          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 「골드 120 → 160」이 전투에서 노획한 것인지 손으로 맞춘 것인지 나중에 알 수
-- 없다. 정산이 맞았는지 되짚는 것이 기록을 두는 까닭이므로 **그 둘이 갈려야
-- 한다.** 세 갈래로 둔다 — 시나리오 정산 · 직접 수정 · 기타.
--
-- 이미 쌓인 줄에는 `manual`이 들어간다. 그때는 손으로 고치는 길밖에 없었다.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **기록은 제 캐릭터의 것만 본다.**                                         │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- `0018`에서는 "캐릭터를 볼 수 있으면 기록도 본다"로 두었다 — 파티원이 정산을
-- 함께 되짚을 수 있게 한 것이다. 형님이 좁혔다: **남의 기록은 안 보인다.**
-- 시트의 현재값은 여전히 파티원이 다 본다(SPEC 6장) — 갈리는 것은 이력뿐이다.
-- ============================================================================

alter table public.character_log
  add column if not exists reason text not null default 'manual';

alter table public.character_log
  drop constraint if exists character_log_reason_check;
alter table public.character_log
  add constraint character_log_reason_check
  check (reason in ('scenario', 'manual', 'other'));

drop policy if exists "기록: 캐릭터를 보는 사람이 본다" on public.character_log;
drop policy if exists "기록: 제 캐릭터의 것만 본다" on public.character_log;
create policy "기록: 제 캐릭터의 것만 본다"
  on public.character_log for select
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.owner_id = auth.uid()
    )
  );
