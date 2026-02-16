-- ImFencer performance index patch
-- Safe to run multiple times.

create extension if not exists pg_trgm;

-- Community feed
create index if not exists idx_posts_created_at_desc
  on public.posts (created_at desc);

create index if not exists idx_posts_category_created_at_desc
  on public.posts (category, created_at desc);

create index if not exists idx_posts_author_created_at_desc
  on public.posts (author_id, created_at desc);

-- Market list/filter/search
create index if not exists idx_market_items_created_at_desc
  on public.market_items (created_at desc);

create index if not exists idx_market_items_status_created_at_desc
  on public.market_items (status, created_at desc);

create index if not exists idx_market_items_weapon_created_at_desc
  on public.market_items (weapon_type, created_at desc);

create index if not exists idx_market_items_status_weapon_created_at_desc
  on public.market_items (status, weapon_type, created_at desc);

create index if not exists idx_market_items_title_trgm
  on public.market_items using gin (title gin_trgm_ops);

create index if not exists idx_market_items_brand_trgm
  on public.market_items using gin (brand gin_trgm_ops);

-- Fencing lessons
create index if not exists idx_fencing_lesson_products_active_created_at_desc
  on public.fencing_lesson_products (is_active, created_at desc);

-- Chat unread performance
create index if not exists idx_messages_chat_unread_created_at
  on public.messages (chat_id, created_at desc)
  where read_at is null;
