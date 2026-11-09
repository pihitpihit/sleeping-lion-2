-- ============================================================================
-- 팩에 없는 클래스 표식 — 비공개 버킷
-- ----------------------------------------------------------------------------
-- 사자의 턱 넷은 Creator Pack에 표식이 없다(구현 결정 119) — 지금까지는 첫 글자로
-- 대신 섰다. 형님이 실물을 찍어 보내 주었고 윤곽을 따 벡터로 옮겼다.
--
-- **실물에서 딴 그림이라 공개 레포·배포물에 넣지 않는다**(절대 원칙 1-1은 팩
-- 에셋을 허용하는 것이지 실물 그림을 허용하는 것이 아니다). 세계 지도와 같은
-- 짜임으로 **승인된 사람만 받는 버킷**에 두고(`0051`), 클래스가 제 그림 파일 이름을
-- 든다(`character_classes.art`). 파일 이름은 레포에 적지 않는다.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('class-art', 'class-art', false, 1048576, array['image/svg+xml', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "클래스 표식: 승인된 사람이 본다" on storage.objects;
create policy "클래스 표식: 승인된 사람이 본다"
  on storage.objects for select to authenticated
  using (bucket_id = 'class-art' and public.is_approved());

drop policy if exists "클래스 표식: 관리자가 올린다" on storage.objects;
create policy "클래스 표식: 관리자가 올린다"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'class-art' and public.is_admin());

/* 같은 이름으로 다시 올리면 덮어쓴다 — UPDATE 정책이 있어야 한다(구현 결정 428). */
drop policy if exists "클래스 표식: 관리자가 고친다" on storage.objects;
create policy "클래스 표식: 관리자가 고친다"
  on storage.objects for update to authenticated
  using (bucket_id = 'class-art' and public.is_admin())
  with check (bucket_id = 'class-art' and public.is_admin());

drop policy if exists "클래스 표식: 관리자가 지운다" on storage.objects;
create policy "클래스 표식: 관리자가 지운다"
  on storage.objects for delete to authenticated
  using (bucket_id = 'class-art' and public.is_admin());

/* 그림 파일 이름. 없으면 팩 표식(`icon`)이나 첫 글자로 선다. */
alter table public.character_classes
  add column if not exists art text check (art is null or art ~ '^[a-z0-9-]+\.(svg|png|webp)$');
