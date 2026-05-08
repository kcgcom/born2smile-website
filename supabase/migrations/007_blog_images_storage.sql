-- blog-images 스토리지 버킷 생성 (공개 읽기, 5MB 제한)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- service_role (Admin API) 업로드 허용
create policy "Admin upload blog images"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'blog-images');

-- service_role 삭제 허용
create policy "Admin delete blog images"
  on storage.objects for delete
  to service_role
  using (bucket_id = 'blog-images');

-- 공개 읽기
create policy "Public read blog images"
  on storage.objects for select
  to public
  using (bucket_id = 'blog-images');
