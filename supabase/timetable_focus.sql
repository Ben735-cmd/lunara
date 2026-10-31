-- Class timetable with reminders, and the Pomodoro focus timer.
-- Run this once in the Supabase SQL editor. It builds on supabase/study_reminders.sql (push_subscriptions and
-- app_secrets must already exist), then redeploy the send-reminders edge function from supabase/functions.

-- 1. Weekly classes. day_of_week follows JavaScript: 0 = Sunday ... 6 = Saturday. Times are the student's local
--    clock time and tz is their time zone, so a 08:00 class stays at 08:00 on their clock all year.
create table if not exists public.timetable_classes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  title text not null,
  location text,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  remind_minutes integer not null default 10 check (remind_minutes between 0 and 180),
  tz text not null default 'Africa/Lusaka',
  last_notified_on date,
  check (end_time > start_time)
);
create index if not exists timetable_classes_user_idx on public.timetable_classes (user_id);
create index if not exists timetable_classes_day_idx on public.timetable_classes (day_of_week);

-- Rejects a time zone name the database does not know, so one bad row can never break everyone's reminders.
create or replace function public.check_timetable_tz() returns trigger
language plpgsql set search_path = public, pg_catalog
as $$
begin
  if not exists (select 1 from pg_timezone_names z where z.name = new.tz) then
    raise exception 'unknown time zone %', new.tz;
  end if;
  return new;
end;
$$;
drop trigger if exists timetable_tz_check on public.timetable_classes;
create trigger timetable_tz_check before insert or update of tz on public.timetable_classes
  for each row execute function public.check_timetable_tz();

alter table public.timetable_classes enable row level security;
create policy "timetable_select_own" on public.timetable_classes
  for select to authenticated using (user_id = (select auth.uid())::text);
create policy "timetable_insert_own" on public.timetable_classes
  for insert to authenticated with check (user_id = (select auth.uid())::text);
create policy "timetable_update_own" on public.timetable_classes
  for update to authenticated
  using (user_id = (select auth.uid())::text) with check (user_id = (select auth.uid())::text);
create policy "timetable_delete_own" on public.timetable_classes
  for delete to authenticated using (user_id = (select auth.uid())::text);

-- 2. Finds classes whose reminder time has arrived today (in the student's own time zone) and marks them as sent
create or replace function public.claim_due_class_reminders(p_secret text)
returns table (cid uuid, uid text, ctitle text, croom text, mins integer, endpoint text, p256dh text, auth_key text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if p_secret is null or not exists (select 1 from app_secrets a where a.name = 'cron_secret' and a.value = p_secret) then
    raise exception 'forbidden';
  end if;
  return query
  with due as (
    update timetable_classes c
       set last_notified_on = (now() at time zone c.tz)::date
     where extract(dow from (now() at time zone c.tz))::int = c.day_of_week
       and c.last_notified_on is distinct from (now() at time zone c.tz)::date
       and (now() at time zone c.tz)::time >= c.start_time - make_interval(mins => c.remind_minutes)
       and (now() at time zone c.tz)::time < c.start_time + interval '5 minutes'
    returning c.id, c.user_id, c.title, c.location, c.start_time, c.tz
  )
  select d.id, d.user_id, d.title, d.location,
         greatest(0, ceil(extract(epoch from (d.start_time - (now() at time zone d.tz)::time)) / 60))::int,
         p.endpoint, p.p256dh, p.auth_key
    from due d
    join push_subscriptions p on p.user_id = d.user_id
    left join profiles pr on pr.user_id = d.user_id
   where coalesce(pr.notifications, true);
end;
$$;
revoke all on function public.claim_due_class_reminders(text) from public;
grant execute on function public.claim_due_class_reminders(text) to anon, authenticated;

-- 3. Focus sessions finished with the Pomodoro timer
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  minutes integer not null check (minutes between 1 and 240),
  label text
);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id, created_at desc);
alter table public.focus_sessions enable row level security;
create policy "focus_select_own" on public.focus_sessions
  for select to authenticated using (user_id = (select auth.uid())::text);
create policy "focus_insert_own" on public.focus_sessions
  for insert to authenticated with check (user_id = (select auth.uid())::text);
create policy "focus_delete_own" on public.focus_sessions
  for delete to authenticated using (user_id = (select auth.uid())::text);

-- 4. One-off alerts so the timer can still ring when the app is closed or the phone is locked
create table if not exists public.timer_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  sent boolean not null default false
);
create index if not exists timer_alerts_due_idx on public.timer_alerts (fire_at) where not sent;
create index if not exists timer_alerts_user_idx on public.timer_alerts (user_id);
alter table public.timer_alerts enable row level security;
create policy "timer_alerts_select_own" on public.timer_alerts
  for select to authenticated using (user_id = (select auth.uid())::text);
create policy "timer_alerts_insert_own" on public.timer_alerts
  for insert to authenticated with check (user_id = (select auth.uid())::text);
create policy "timer_alerts_delete_own" on public.timer_alerts
  for delete to authenticated using (user_id = (select auth.uid())::text);

create or replace function public.claim_due_timer_alerts(p_secret text)
returns table (aid uuid, uid text, atitle text, abody text, endpoint text, p256dh text, auth_key text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if p_secret is null or not exists (select 1 from app_secrets a where a.name = 'cron_secret' and a.value = p_secret) then
    raise exception 'forbidden';
  end if;
  delete from timer_alerts where fire_at < now() - interval '1 day';
  return query
  with due as (
    update timer_alerts t
       set sent = true
     where not t.sent
       and t.fire_at <= now()
       and t.fire_at > now() - interval '15 minutes'
    returning t.id, t.user_id, t.title, t.body
  )
  select d.id, d.user_id, d.title, d.body, p.endpoint, p.p256dh, p.auth_key
    from due d
    join push_subscriptions p on p.user_id = d.user_id
    left join profiles pr on pr.user_id = d.user_id
   where coalesce(pr.notifications, true);
end;
$$;
revoke all on function public.claim_due_timer_alerts(text) from public;
grant execute on function public.claim_due_timer_alerts(text) to anon, authenticated;
