-- History of questions solved in the Question solver. Run once in the Supabase SQL editor.
create table if not exists public.solved_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  source_name text,
  source_type text not null default 'image',   -- image, pdf or docx
  question_text text,                           -- text read from a PDF or Word file
  thumbnail text,                               -- small preview of a photo, as a data URL
  solution text not null,
  created_at timestamptz not null default now(),
  constraint solved_questions_size check (
    char_length(solution) <= 60000
    and (question_text is null or char_length(question_text) <= 60000)
    and (thumbnail is null or char_length(thumbnail) <= 150000)
  )
);

create index if not exists solved_questions_user_created_idx
  on public.solved_questions (user_id, created_at desc);

alter table public.solved_questions enable row level security;

create policy "solved_questions_select_own" on public.solved_questions
  for select using (auth.uid() = user_id);
create policy "solved_questions_insert_own" on public.solved_questions
  for insert with check (auth.uid() = user_id);
create policy "solved_questions_delete_own" on public.solved_questions
  for delete using (auth.uid() = user_id);
