-- ============================================================================
-- 캐릭터 기록 — 무엇을 언제 고쳤는가
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **정산이 맞았는지는 나중에야 묻는다.**                                    │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 시나리오가 끝나면 골드·경험·체크마크가 한꺼번에 움직인다. 다음 판에서 "이거
-- 지난번에 올린 거 맞나"를 묻게 되는데, 지금은 물어볼 데가 없다 — 캐릭터 필드는
-- **현재값만** 들고 있다(구현 결정 1).
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **이력이지 정본이 아니다.**                                               │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 이 표를 폴드해 현재값을 얻지 않는다. 정본은 여전히 `characters`의 필드이고
-- 여기 있는 것은 **읽어 보는 기록**일 뿐이다 — 구현 결정 1이 이벤트 소싱을
-- 물린 까닭이 그대로 살아 있다.
--
-- 그래서 **고칠 길을 두지 않는다.** 남기고 읽을 뿐이며, 캐릭터가 사라지면
-- 함께 사라진다.
-- ============================================================================

create table if not exists public.character_log (
  id           uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  -- 누가 고쳤는가. 지금은 주인뿐이지만(구현 결정 44) 적어 둔다.
  actor_id     uuid not null references public.profiles (id) on delete cascade,
  at           timestamptz not null default now(),
  /*
    무엇이 어떻게 바뀌었는가.

    **글이 아니라 값으로 담는다** — 화면이 우리말로 옮긴다(`describeEdits`).
    글로 담으면 나중에 문구를 고칠 때 옛 기록만 옛말로 남는다.

    `[{ "field": "gold", "from": 120, "to": 160 }, …]` 꼴이다.
  */
  changes      jsonb not null default '[]'::jsonb
);

create index if not exists character_log_by_char_idx
  on public.character_log (character_id, at desc);

alter table public.character_log enable row level security;

/*
  **캐릭터를 볼 수 있으면 그 기록도 볼 수 있다.** 파티원은 서로의 시트를 보므로
  (SPEC 6장) 정산이 맞는지도 함께 볼 수 있어야 한다 — 기록을 주인만 본다면
  "지난번에 올린 거 맞나"를 물을 수가 없다.
*/
drop policy if exists "기록: 캐릭터를 보는 사람이 본다" on public.character_log;
create policy "기록: 캐릭터를 보는 사람이 본다"
  on public.character_log for select
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id
        and (
          (c.campaign_id is null and c.owner_id = auth.uid())
          or public.is_party_member(public.campaign_party(c.campaign_id))
        )
    )
  );

/* **제 캐릭터의 기록만 남긴다.** 고치는 것이 주인뿐이므로 남기는 것도 주인이다. */
drop policy if exists "기록: 제 캐릭터에만 남긴다" on public.character_log;
create policy "기록: 제 캐릭터에만 남긴다"
  on public.character_log for insert
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.characters c
      where c.id = character_id and c.owner_id = auth.uid()
    )
  );

/*
  **고치거나 지우는 길은 두지 않는다.** 기록이 고쳐지면 기록이 아니다 —
  정책을 안 만들면 RLS가 통째로 막는다(`update`·`delete` 모두).
*/
