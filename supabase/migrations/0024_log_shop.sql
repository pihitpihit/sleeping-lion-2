-- ============================================================================
-- 상점 거래를 로그의 한 갈래로 둔다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **시트에서 고친 것이지만 「직접 수정」과는 다른 일이다.**                  │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 상점에서 사면 골드가 빠지고 아이템이 는다. 손으로 골드를 고친 것과 값만 보면
-- 똑같지만 **왜 그렇게 됐는지가 다르다** — 로그를 두는 까닭이 그 「왜」이므로
-- 갈래를 하나 더 둔다(형님이 정했다).
--
-- 고르는 자리는 여전히 없다. **경로가 정한다**(구현 결정 380) — 상점을 거쳐 온
-- 것만 이 갈래가 된다.
-- ============================================================================

alter table public.character_log
  drop constraint if exists character_log_reason_check;
alter table public.character_log
  add constraint character_log_reason_check
  check (reason in ('created', 'scenario', 'manual', 'shop', 'other'));

/* 파티 쪽은 아직 상점을 거칠 일이 없지만 갈래를 맞춰 둔다 — 두 표가 다른 말을
   쓰면 나중에 한쪽만 고치게 된다. */
alter table public.campaign_log
  drop constraint if exists campaign_log_reason_check;
alter table public.campaign_log
  add constraint campaign_log_reason_check
  check (reason in ('created', 'scenario', 'manual', 'shop', 'other'));
