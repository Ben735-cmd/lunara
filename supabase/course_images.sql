-- Pictures pulled out of uploaded course PDFs. Private bucket: each student can
-- only read, add and remove files inside their own folder (<user id>/<course id>/...).
insert into storage.buckets (id, name, public)
values ('course-images', 'course-images', false)
on conflict (id) do nothing;

create policy "course_images_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "course_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "course_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
