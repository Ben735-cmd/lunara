-- Daily AI request limit per user. Run once in the Supabase SQL editor.
-- The day rolls over at midnight Zambia time (Africa/Lusaka).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  used integer not null default 0,
  refunded integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Uses one request. Returns {allowed, used}. Refuses once p_limit is reached.
create or replace function public.consume_ai_request(p_limit integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Africa/Lusaka')::date;
  new_used integer;
begin
  if uid is null then raise exception 'not signed in'; end if;

  insert into public.ai_usage as u (user_id, day, used) values (uid, today, 1)
  on conflict (user_id, day) do update set used = u.used + 1
    where u.used < p_limit
  returning u.used into new_used;

  if new_used is null then
    select used into new_used from public.ai_usage where user_id = uid and day = today;
    return json_build_object('allowed', false, 'used', coalesce(new_used, p_limit));
  end if;
  return json_build_object('allowed', true, 'used', new_used);
end;
$$;

-- Gives a request back when the AI itself failed. Capped at 5 a day so it cannot be used to dodge the limit.
create or replace function public.refund_ai_request()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage set used = greatest(used - 1, 0), refunded = refunded + 1
  where user_id = auth.uid() and day = (now() at time zone 'Africa/Lusaka')::date and refunded < 5;
$$;

create or replace function public.ai_used_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select used from public.ai_usage
    where user_id = auth.uid() and day = (now() at time zone 'Africa/Lusaka')::date), 0);
$$;

revoke all on function public.consume_ai_request(integer), public.refund_ai_request(), public.ai_used_today() from public, anon;
grant execute on function public.consume_ai_request(integer), public.refund_ai_request(), public.ai_used_today() to authenticated;
