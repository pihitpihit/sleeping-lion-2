-- ============================================================================
-- satchel_settings — 행낭 배치와 화면 설정
-- ----------------------------------------------------------------------------
-- 정본: SPEC 5.2 (2026-08-08 개정)
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **배치는 사람의 것이다. 기기를 갈아도 따라간다.**                         │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 그동안 `localStorage`에만 두었다. 계정 id로 열쇠를 갈랐으므로 한 기기에서
-- 계정을 바꾸면 각자 것이 나왔지만, **저장소 자체가 지워지면 다 같이 날아갔다.**
-- iOS 홈화면 아이콘을 지웠을 때 실제로 그렇게 났다 — 기록지를 서버로 옮긴 것과
-- 같은 원인이다.
--
-- **여전히 `localStorage`가 먼저 열린다.** 여기 있는 것은 백업이자 기기 사이를
-- 잇는 다리이며, 서버에 못 닿아도 행낭은 그대로 열린다(절대 원칙 3).
--
-- **도구 런타임 상태는 오지 않는다.** 뽑은 카드·원소·라운드는 메모리 전용이다
-- (SPEC 5.2). 여기 담기는 것은 배치와 화면 설정뿐이다.
--
-- **축 ①과 섞이지 않는다.** 표를 따로 두고 캠페인·캐릭터를 참조하지 않는다.
-- 사람 하나에 한 줄이며 파티도 기록지도 모른다.
-- ============================================================================

create table if not exists public.satchel_settings (
  -- 사람 하나에 한 줄. 파티도 기록지도 끼지 않는다.
  user_id    uuid primary key references public.profiles (id) on delete cascade,

  -- 통짜 JSON으로 둔다. **모양을 서버가 알 필요가 없다.**
  --
  -- 열 수별 레이아웃, 위젯별 설정·회전이 들어 있고 위젯이 늘 때마다 모양이
  -- 바뀐다. 칸으로 쪼개면 위젯 하나 들일 때마다 마이그레이션이 딸려 온다.
  -- 읽고 쓰는 것은 언제나 통째이며 조각으로 질의할 일이 없다.
  --
  -- 화면이 보내는 것을 그대로 담되, **화면은 받은 것을 믿지 않는다** —
  -- `storage.ts`의 salvage가 알아볼 수 있는 부분만 건져낸다.
  settings   jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

alter table public.satchel_settings enable row level security;

-- **제 것만 본다.** 남의 행낭 배치는 볼 일도 없고 보여줄 일도 없다.
drop policy if exists "행낭: 제 것만 본다" on public.satchel_settings;
create policy "행낭: 제 것만 본다"
  on public.satchel_settings for select
  using (user_id = auth.uid());

drop policy if exists "행낭: 제 것만 만든다" on public.satchel_settings;
create policy "행낭: 제 것만 만든다"
  on public.satchel_settings for insert
  with check (user_id = auth.uid());

drop policy if exists "행낭: 제 것만 고친다" on public.satchel_settings;
create policy "행낭: 제 것만 고친다"
  on public.satchel_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- updated_at은 서버가 찍는다
-- ----------------------------------------------------------------------------
-- **이것은 도착 시각이지 고친 시각이 아니다.** 늦게 고친 쪽이 이기는 판정
-- (SPEC 5.3)은 `settings` 안에 기기가 찍어 둔 `updatedAt`으로 한다 — 그래야
-- 같은 종류끼리 견주는 것이 된다. 이 칸은 뭉치에 시각이 없을 때의 갈음이고,
-- 언제 올라온 것인지 사람이 들여다볼 때 쓴다.
--
-- 그래도 화면이 보내게 두지는 않는다. 시계가 어긋난 기기가 미래를 찍어 두면
-- 갈음할 때 그것이 영영 이긴다.
--
-- `user_id`도 되돌린다. 남의 줄로 옮겨 쓸 수 없다.

create or replace function public.touch_satchel()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists satchel_touch on public.satchel_settings;
create trigger satchel_touch
  before update on public.satchel_settings
  for each row execute function public.touch_satchel();
