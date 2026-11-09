-- ============================================================================
-- 세계 지도 — 해금한 시나리오에 스티커를 붙여 본다
-- ----------------------------------------------------------------------------
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ **그림은 공개 레포·배포물에 넣지 않는다. 비공개 저장소에만 둔다.**        │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- 실물 지도는 시나리오를 해금할 때마다 그 자리에 스티커를 붙인다. 기록지의
-- 시나리오 상태를 같은 모양으로 보이게 한다(형님이 정했다).
--
-- 지도와 스티커는 Cephalofair의 그림이다(Creator Pack에는 지형 없는 양피지와
-- 격자뿐이다). 레포와 배포 사이트는 공개라 거기 두는 순간 공개 배포가 된다 —
-- 클래스 수치를 DB에 둔 것과 같은 논리로(절대 원칙 2의 2026-08-11 개정) **승인된
-- 사람만 받는 비공개 버킷**에 둔다. 자료는 시나리오 목록과 같은 GHS에서 왔다
-- (구현 결정 531).
--
-- **올리는 것은 관리자가 앱 안에서 한다**(`MapUploader`). secret 키를 어디에도
-- 두지 않으므로 서버 쪽에서 올릴 길이 없다 — 관리자의 세션이 RLS를 통과한다.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('world-map', 'world-map', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "세계 지도: 승인된 사람이 본다" on storage.objects;
create policy "세계 지도: 승인된 사람이 본다"
  on storage.objects for select to authenticated
  using (bucket_id = 'world-map' and public.is_approved());

drop policy if exists "세계 지도: 관리자가 올린다" on storage.objects;
create policy "세계 지도: 관리자가 올린다"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'world-map' and public.is_admin());

/* 같은 이름으로 다시 올리면(upsert) 덮어쓴다 — UPDATE 정책이 있어야 한다(구현 결정 428). */
drop policy if exists "세계 지도: 관리자가 고친다" on storage.objects;
create policy "세계 지도: 관리자가 고친다"
  on storage.objects for update to authenticated
  using (bucket_id = 'world-map' and public.is_admin())
  with check (bucket_id = 'world-map' and public.is_admin());

drop policy if exists "세계 지도: 관리자가 지운다" on storage.objects;
create policy "세계 지도: 관리자가 지운다"
  on storage.objects for delete to authenticated
  using (bucket_id = 'world-map' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 스티커가 붙는 자리
-- ----------------------------------------------------------------------------
-- 지도 그림의 픽셀 좌표다 — 왼쪽 위가 (0, 0)이고 아래로 갈수록 y가 크다. 폭·높이는
-- 그 시나리오 스티커 그림의 크기와 같다(GHS가 그렇게 적는다). 값은 DB에만 넣는다.
-- 없으면 그 시나리오는 지도에 안 나온다.

alter table public.scenarios
  add column if not exists map_x real,
  add column if not exists map_y real,
  add column if not exists map_w real check (map_w is null or map_w > 0),
  add column if not exists map_h real check (map_h is null or map_h > 0);
