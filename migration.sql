-- Add user_type column to profiles
alter table public.profiles add column if not exists user_type text;
