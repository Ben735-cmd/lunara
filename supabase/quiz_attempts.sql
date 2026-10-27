-- Quiz results, used to calculate course progress. Run once in the Supabase SQL editor.
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now(),
  constraint quiz_attempts_range check (total between 1 and 30 and score between 0 and total)
);

create index if not exists quiz_attempts_user_course_idx
  on public.quiz_attempts (user_id, course_id, created_at desc);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select using (auth.uid() = user_id);
create policy "quiz_attempts_insert_own" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);
-- No update or delete policies: results cannot be edited or removed afterwards.

-- Slow down fake submissions: one attempt per course every 60 seconds.
create or replace function public.quiz_attempts_rate_limit() returns trigger as $$
begin
  if exists (
    select 1 from public.quiz_attempts
    where user_id = new.user_id and course_id = new.course_id
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Please wait a minute before submitting another quiz for this course.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists quiz_attempts_rate_limit on public.quiz_attempts;
create trigger quiz_attempts_rate_limit before insert on public.quiz_attempts
  for each row execute function public.quiz_attempts_rate_limit();
