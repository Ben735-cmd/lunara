-- Run this once in the Supabase SQL editor.
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  front text not null,
  back text not null,
  ease real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_user_course_due_idx
  on public.flashcards (user_id, course_id, due_at);

alter table public.flashcards enable row level security;

create policy "flashcards_select_own" on public.flashcards
  for select using (auth.uid() = user_id);
create policy "flashcards_insert_own" on public.flashcards
  for insert with check (auth.uid() = user_id);
create policy "flashcards_update_own" on public.flashcards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flashcards_delete_own" on public.flashcards
  for delete using (auth.uid() = user_id);
