-- 2026-02-16: Mobile release foundation
-- Includes account deletion, push delivery logs, payment logs, and platform fee settings.

create extension if not exists "uuid-ossp";

-- Admin helper function for RLS
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and coalesce(user_type, '') in ('admin', 'master', 'operator')
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

-- Profiles soft-delete columns
alter table public.profiles
  add column if not exists is_deleted boolean not null default false;

alter table public.profiles
  add column if not exists deleted_at timestamp with time zone;

create index if not exists idx_profiles_is_deleted
  on public.profiles(is_deleted);

-- Platform settings (fee management)
create table if not exists public.platform_settings (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique default 'default',
  class_fee_rate numeric(6,5) not null default 0.10000,
  lesson_fee_rate numeric(6,5) not null default 0.10000,
  market_fee_rate numeric(6,5) not null default 0.05000,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone
);

insert into public.platform_settings (code, class_fee_rate, lesson_fee_rate, market_fee_rate, is_active)
values ('default', 0.10000, 0.10000, 0.05000, true)
on conflict (code) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Authenticated users can read platform settings." on public.platform_settings;
create policy "Authenticated users can read platform settings."
  on public.platform_settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins can insert platform settings." on public.platform_settings;
create policy "Admins can insert platform settings."
  on public.platform_settings for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update platform settings." on public.platform_settings;
create policy "Admins can update platform settings."
  on public.platform_settings for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete platform settings." on public.platform_settings;
create policy "Admins can delete platform settings."
  on public.platform_settings for delete
  using (public.is_admin(auth.uid()));

-- Account deletion logs
create table if not exists public.account_deletions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists idx_account_deletions_user_deleted_at
  on public.account_deletions(user_id, deleted_at desc);

alter table public.account_deletions enable row level security;

drop policy if exists "Users can insert own account deletion log." on public.account_deletions;
create policy "Users can insert own account deletion log."
  on public.account_deletions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own account deletion log." on public.account_deletions;
create policy "Users can view own account deletion log."
  on public.account_deletions for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view account deletion logs." on public.account_deletions;
create policy "Admins can view account deletion logs."
  on public.account_deletions for select
  using (public.is_admin(auth.uid()));

-- Class reservation payment extension
alter table public.fencing_class_reservations
  add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending', 'paid', 'failed', 'cancelled'));

alter table public.fencing_class_reservations
  add column if not exists payment_amount integer not null default 0
  check (payment_amount >= 0);

alter table public.fencing_class_reservations
  add column if not exists payment_order_id text;

alter table public.fencing_class_reservations
  add column if not exists payment_confirmed_at timestamp with time zone;

create unique index if not exists idx_class_reservation_payment_order_id
  on public.fencing_class_reservations(payment_order_id)
  where payment_order_id is not null;

create index if not exists idx_class_reservation_payment_status
  on public.fencing_class_reservations(payment_status, created_at desc);

-- Payment logs
create table if not exists public.payment_logs (
  id uuid primary key default uuid_generate_v4(),
  provider text not null default 'toss' check (provider in ('toss')),
  order_id text not null unique,
  payment_key text unique,
  reservation_id uuid references public.fencing_class_reservations(id) on delete set null,
  class_id uuid references public.fencing_club_classes(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete set null,
  status text not null default 'ready'
    check (status in ('ready', 'pending', 'paid', 'failed', 'cancelled', 'webhook_received', 'webhook_verified')),
  amount integer not null check (amount >= 0),
  currency text not null default 'KRW',
  fee_rate numeric(6,5) not null default 0,
  platform_fee integer not null default 0 check (platform_fee >= 0),
  method text,
  failure_code text,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone
);

create index if not exists idx_payment_logs_user_created_at
  on public.payment_logs(user_id, created_at desc);

create index if not exists idx_payment_logs_status_created_at
  on public.payment_logs(status, created_at desc);

create index if not exists idx_payment_logs_reservation_id
  on public.payment_logs(reservation_id);

alter table public.payment_logs enable row level security;

drop policy if exists "Users can view own payment logs." on public.payment_logs;
create policy "Users can view own payment logs."
  on public.payment_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own payment logs." on public.payment_logs;
create policy "Users can create own payment logs."
  on public.payment_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view all payment logs." on public.payment_logs;
create policy "Admins can view all payment logs."
  on public.payment_logs for select
  using (public.is_admin(auth.uid()));

-- Push delivery logs
create table if not exists public.push_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('fcm', 'apns', 'webpush')),
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_token text not null,
  title text not null,
  body text,
  path text,
  dedupe_key text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  sent_at timestamp with time zone
);

create unique index if not exists idx_push_logs_dedupe_key
  on public.push_logs(dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_push_logs_user_created_at
  on public.push_logs(user_id, created_at desc);

alter table public.push_logs enable row level security;

drop policy if exists "Users can view own push logs." on public.push_logs;
create policy "Users can view own push logs."
  on public.push_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all push logs." on public.push_logs;
create policy "Admins can view all push logs."
  on public.push_logs for select
  using (public.is_admin(auth.uid()));

