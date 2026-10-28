-- Study session planning and push reminders.
-- Replace <CRON_SECRET> with a long random value, and set the same value as the CRON_SECRET
-- environment variable in Vercel. Also set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and
-- VAPID_SUBJECT (create keys with: npx web-push generate-vapid-keys).

-- 1. Policies for study sessions (row security was on with no policies, so nothing could be saved)
create policy "study_sessions_select_own" on public.study_sessions
  for select to authenticated using (user_id = (select auth.uid())::text);
create policy "study_sessions_insert_own" on public.study_sessions
  for insert to authenticated with check (user_id = (select auth.uid())::text);
create policy "study_sessions_update_own" on public.study_sessions
  for update to authenticated
  using (user_id = (select auth.uid())::text) with check (user_id = (select auth.uid())::text);
create policy "study_sessions_delete_own" on public.study_sessions
  for delete to authenticated using (user_id = (select auth.uid())::text);

alter table public.study_sessions
  add column if not exists starts_at timestamptz,
  add column if not exists remind_minutes integer not null default 15,
  add column if not exists notified_at timestamptz;
create index if not exists study_sessions_user_idx on public.study_sessions (user_id);
create index if not exists study_sessions_due_idx on public.study_sessions (starts_at) where notified_at is null;

-- 2. Devices that agreed to notifications
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid())::text);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid())::text);
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid())::text) with check (user_id = (select auth.uid())::text);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid())::text);

-- 3. Server-only secret (no policies, so the app can never read it)
create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
insert into public.app_secrets (name, value) values ('cron_secret', '<CRON_SECRET>')
on conflict (name) do update set value = excluded.value;

-- 4. Finds sessions whose reminder time has arrived and marks them as sent
create or replace function public.claim_due_reminders(p_secret text)
returns table (sid uuid, uid text, stitle text, sstarts timestamptz, mins integer, endpoint text, p256dh text, auth_key text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if p_secret is null or not exists (select 1 from app_secrets a where a.name = 'cron_secret' and a.value = p_secret) then
    raise exception 'forbidden';
  end if;
  return query
  with due as (
    update study_sessions s
       set notified_at = now()
     where s.notified_at is null
       and s.starts_at is not null
       and s.starts_at - make_interval(mins => s.remind_minutes) <= now()
       and s.starts_at > now() - interval '30 minutes'
    returning s.id, s.user_id, s.title, s.starts_at, s.remind_minutes
  )
  select d.id, d.user_id, d.title, d.starts_at, d.remind_minutes, p.endpoint, p.p256dh, p.auth_key
    from due d
    join push_subscriptions p on p.user_id = d.user_id
    left join profiles pr on pr.user_id = d.user_id
   where coalesce(pr.notifications, true);
end;
$$;
revoke all on function public.claim_due_reminders(text) from public;
grant execute on function public.claim_due_reminders(text) to anon, authenticated;

-- 5. Removes a device the push service says is gone
create or replace function public.drop_push_endpoint(p_secret text, p_endpoint text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_secret is null or not exists (select 1 from app_secrets a where a.name = 'cron_secret' and a.value = p_secret) then
    raise exception 'forbidden';
  end if;
  delete from push_subscriptions where endpoint = p_endpoint;
end;
$$;
revoke all on function public.drop_push_endpoint(text, text) from public;
grant execute on function public.drop_push_endpoint(text, text) to anon, authenticated;

-- 6. Runs the reminder check every minute. Enable pg_cron and pg_net under Database > Extensions first,
--    store the VAPID private key next to the cron secret, and deploy supabase/functions/send-reminders
--    (Vercel's bot protection blocks the scheduler, so the sender runs on Supabase instead).
-- insert into public.app_secrets (name, value) values ('vapid_private_key', '<VAPID_PRIVATE_KEY>')
--   on conflict (name) do update set value = excluded.value;
-- select cron.schedule('study-reminders', '* * * * *', $$
--   select net.http_post(
--     url := 'https://<PROJECT-REF>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
--     body := '{}'::jsonb) $$);
