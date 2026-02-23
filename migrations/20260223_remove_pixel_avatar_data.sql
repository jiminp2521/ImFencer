-- Remove legacy pixel-avatar token data from profile avatars.
-- Safe to run multiple times.

update public.profiles
set avatar_url = null,
    updated_at = timezone('utc'::text, now())
where avatar_url like 'pixel-avatar:v1:%';
