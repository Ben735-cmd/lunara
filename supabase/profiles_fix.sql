-- Profiles: fix the misspelt column, let each student read and write only their own row,
-- and allow profile pictures to be uploaded to their own folder in the avatars bucket.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'avartar_url') then
    alter table public.profiles rename column avartar_url to avatar_url;
  end if;
end $$;

create unique index if not exists profiles_user_id_key on public.profiles (user_id);

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid())::text);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid())::text);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);

-- Files live at avatars/<user id>/avatar.jpg. The bucket is public, so the link works without signing.
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
