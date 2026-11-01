-- Crash log and anonymous usage counts. Run once in the Supabase SQL editor.
-- Anyone can add rows (the app writes them), only admins can read them.

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text default auth.uid()::text,
  source text not null check (char_length(source) <= 40),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  url text check (char_length(url) <= 300),
  user_agent text check (char_length(user_agent) <= 300)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_id text not null check (char_length(device_id) <= 64),
  name text not null check (char_length(name) <= 60)
);

create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
create index if not exists usage_events_created_idx on public.usage_events (created_at desc);

alter table public.client_errors enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "anyone can log errors" on public.client_errors;
create policy "anyone can log errors" on public.client_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid()::text);

drop policy if exists "admins read errors" on public.client_errors;
create policy "admins read errors" on public.client_errors
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id::text = auth.uid()::text));

drop policy if exists "anyone can log usage" on public.usage_events;
create policy "anyone can log usage" on public.usage_events
  for insert to anon, authenticated with check (true);

drop policy if exists "admins read usage" on public.usage_events;
create policy "admins read usage" on public.usage_events
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id::text = auth.uid()::text));
