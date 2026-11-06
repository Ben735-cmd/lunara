-- Paid plans and payment records. Run once in the Supabase SQL editor.
--
-- Students can only READ their own rows. Every write comes from the server
-- (the billing API routes) using the service-role key, which bypasses these
-- rules. That way nobody can give themselves a paid plan from the browser.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',          -- 'active' or 'inactive'
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  tx_ref text primary key,                           -- our own reference, sent to Flutterwave
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  status text not null default 'pending',            -- 'pending' | 'successful' | 'failed'
  flw_transaction_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);
-- No insert, update or delete policies on purpose: only the server writes here.
