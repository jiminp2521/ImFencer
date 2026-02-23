-- Post detail comment query performance patch
-- Safe to run multiple times.

create index if not exists idx_comments_post_root_created_at_desc
  on public.comments (post_id, created_at desc)
  where parent_id is null;
