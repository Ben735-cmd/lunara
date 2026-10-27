-- Past papers. Run this once in the Supabase SQL editor.
-- Everyone signed in can read; only admins can add or remove papers.

-- 1. Admins (you). After running this file, add yourself:
--    insert into public.admins (user_id)
--    select id from auth.users where email = 'benlubona735@gmail.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create policy "admins_select_self" on public.admins
  for select using (auth.uid() = user_id);

-- 2. Papers. course_code is stored without spaces, upper case (CS301).
create table if not exists public.past_papers (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  title text not null,
  year integer not null check (year between 1990 and 2100),
  exam_type text not null default 'Final exam',
  file_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists past_papers_course_year_idx
  on public.past_papers (course_code, year desc);

alter table public.past_papers enable row level security;
create policy "past_papers_select_signed_in" on public.past_papers
  for select to authenticated using (true);
create policy "past_papers_insert_admin" on public.past_papers
  for insert to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "past_papers_delete_admin" on public.past_papers
  for delete to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- 3. Private storage bucket for the PDF files.
insert into storage.buckets (id, name, public)
values ('past-papers', 'past-papers', false)
on conflict (id) do nothing;

create policy "past_papers_files_read" on storage.objects
  for select to authenticated using (bucket_id = 'past-papers');
create policy "past_papers_files_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'past-papers'
    and exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy "past_papers_files_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'past-papers'
    and exists (select 1 from public.admins a where a.user_id = auth.uid()));
