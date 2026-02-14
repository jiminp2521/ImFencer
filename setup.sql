-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  weapon_type text check (weapon_type in ('Fleuret', 'Epee', 'Sabre')),
  club_id text,
  tier text default 'Bronze',
  is_coach boolean default false,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- AWARDS
create table public.awards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  proof_image_url text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.awards enable row level security;

create policy "Awards are viewable by everyone."
  on awards for select
  using ( true );

create policy "Users can insert their own awards."
  on awards for insert
  with check ( auth.uid() = user_id );

-- POSTS (Community)
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references public.profiles(id) not null,
  category text check (category in ('Free', 'Info', 'Question')),
  title text not null,
  content text,
  image_url text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone."
  on posts for select
  using ( true );

create policy "Authenticated users can create posts."
  on posts for insert
  with check ( auth.uid() = author_id );

create policy "Users can update own posts."
  on posts for update
  using ( auth.uid() = author_id );

-- COMMENTS
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone."
  on comments for select
  using ( true );

create policy "Users can insert their own comments."
  on comments for insert
  with check ( auth.uid() = author_id );

create policy "Users can update own comments."
  on comments for update
  using ( auth.uid() = author_id );

create policy "Users can delete own comments."
  on comments for delete
  using ( auth.uid() = author_id );

-- POST LIKES
create table public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Post likes are viewable by everyone."
  on post_likes for select
  using ( true );

create policy "Users can like posts as themselves."
  on post_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can remove their own likes."
  on post_likes for delete
  using ( auth.uid() = user_id );

-- POST BOOKMARKS
create table public.post_bookmarks (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

alter table public.post_bookmarks enable row level security;

create policy "Post bookmarks are private to owner."
  on post_bookmarks for select
  using ( auth.uid() = user_id );

create policy "Users can bookmark posts as themselves."
  on post_bookmarks for insert
  with check ( auth.uid() = user_id );

create policy "Users can remove their own bookmarks."
  on post_bookmarks for delete
  using ( auth.uid() = user_id );

-- REPORTS
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  target_type text check (target_type in ('post', 'comment', 'user')) not null,
  target_id uuid not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;

create policy "Users can insert reports."
  on reports for insert
  with check ( auth.uid() = reporter_id );

create policy "Users can view own reports."
  on reports for select
  using ( auth.uid() = reporter_id );

-- MARKET ITEMS
create table public.market_items (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  price integer not null,
  status text default 'selling' check (status in ('selling', 'reserved', 'sold')),
  image_url text,
  weapon_type text,
  brand text,
  condition text,
  is_ad boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.market_items enable row level security;

create policy "Market items are viewable by everyone."
  on market_items for select
  using ( true );

create policy "Authenticated users can create market items."
  on market_items for insert
  with check ( auth.uid() = seller_id );

create policy "Users can update own market items."
  on market_items for update
  using ( auth.uid() = seller_id );

create policy "Users can delete own market items."
  on market_items for delete
  using ( auth.uid() = seller_id );

-- COMPETITIONS
create table public.competitions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  date timestamp with time zone not null,
  location text not null,
  bracket_image_url text,
  result_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.competitions enable row level security;

create policy "Competitions are viewable by everyone."
  on competitions for select
  using ( true );
-- Only admins can insert/update (logic handled via service role or admin flag, omitted for simplicity)

-- CHATS
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  last_message text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (chat_id, user_id)
);

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone
);

alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

create policy "Users can view chats they are part of."
  on chats for select
  using ( exists (
    select 1 from chat_participants
    where chat_participants.chat_id = chats.id
    and chat_participants.user_id = auth.uid()
  ));

create policy "Users can view chat participants for their chats."
  on chat_participants for select
  using ( exists (
    select 1 from chat_participants cp
    where cp.chat_id = chat_participants.chat_id
    and cp.user_id = auth.uid()
  ));

create policy "Authenticated users can create chats."
  on chats for insert
  with check ( auth.role() = 'authenticated' );

create policy "Participants can update chats."
  on chats for update
  using ( exists (
    select 1 from chat_participants
    where chat_participants.chat_id = chats.id
    and chat_participants.user_id = auth.uid()
  ));

create policy "Users can insert themselves as chat participants."
  on chat_participants for insert
  with check ( auth.uid() = user_id );

create policy "Participants can add users to their chats."
  on chat_participants for insert
  with check ( exists (
    select 1 from chat_participants cp
    where cp.chat_id = chat_participants.chat_id
    and cp.user_id = auth.uid()
  ));

create policy "Users can view messages for joined chats."
  on messages for select
  using ( exists (
    select 1 from chat_participants cp
    where cp.chat_id = messages.chat_id
    and cp.user_id = auth.uid()
  ));

create policy "Users can insert messages for joined chats."
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from chat_participants cp
      where cp.chat_id = messages.chat_id
      and cp.user_id = auth.uid()
    )
  );

create policy "Users can update messages in joined chats."
  on messages for update
  using ( exists (
    select 1 from chat_participants cp
    where cp.chat_id = messages.chat_id
    and cp.user_id = auth.uid()
  ));

create index idx_comments_post_created_at
  on public.comments(post_id, created_at desc);
create index idx_comments_parent_id
  on public.comments(parent_id);
create index idx_post_likes_user_id
  on public.post_likes(user_id);
create index idx_post_bookmarks_user_id
  on public.post_bookmarks(user_id);
create index idx_messages_chat_created_at
  on public.messages(chat_id, created_at desc);
create index idx_post_likes_post_id
  on public.post_likes(post_id);

create function public.get_feed_posts(
  p_category text default null,
  p_sort text default 'latest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  category text,
  title text,
  content text,
  image_url text,
  tags text[],
  created_at timestamp with time zone,
  author text,
  like_count integer,
  comment_count integer,
  score integer
)
language sql
stable
as $$
  with post_base as (
    select
      p.id,
      p.category,
      p.title,
      p.content,
      p.image_url,
      p.tags,
      p.created_at,
      pr.username as author
    from public.posts p
    left join public.profiles pr on pr.id = p.author_id
    where p_category is null or p.category = p_category
  ),
  like_stats as (
    select post_id, count(*)::integer as like_count
    from public.post_likes
    group by post_id
  ),
  comment_stats as (
    select post_id, count(*)::integer as comment_count
    from public.comments
    where parent_id is null
    group by post_id
  )
  select
    pb.id,
    pb.category,
    pb.title,
    pb.content,
    pb.image_url,
    pb.tags,
    pb.created_at,
    coalesce(pb.author, '알 수 없음') as author,
    coalesce(ls.like_count, 0) as like_count,
    coalesce(cs.comment_count, 0) as comment_count,
    (coalesce(ls.like_count, 0) * 2 + coalesce(cs.comment_count, 0))::integer as score
  from post_base pb
  left join like_stats ls on ls.post_id = pb.id
  left join comment_stats cs on cs.post_id = pb.id
  order by
    case when p_sort = 'popular' then (coalesce(ls.like_count, 0) * 2 + coalesce(cs.comment_count, 0)) end desc,
    pb.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.get_feed_posts(text, text, integer, integer) to anon, authenticated;

-- STORAGE BUCKETS (Optional, for images)
insert into storage.buckets (id, name)
values ('images', 'images')
on conflict do nothing;

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'images' );

create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- FENCING CLUBS
create table public.fencing_clubs (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  city text not null,
  address text not null,
  phone text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.fencing_clubs enable row level security;

create policy "Fencing clubs are viewable by everyone."
  on public.fencing_clubs for select
  using ( true );

create policy "Owners can create fencing clubs."
  on public.fencing_clubs for insert
  with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );

create policy "Owners can update fencing clubs."
  on public.fencing_clubs for update
  using ( auth.uid() = owner_id );

-- FENCING CLUB CLASSES
create table public.fencing_club_classes (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.fencing_clubs(id) on delete cascade not null,
  coach_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  weapon_type text check (weapon_type in ('Fleuret', 'Epee', 'Sabre')),
  level text default 'all' check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  lesson_type text default 'group' check (lesson_type in ('group', 'private', 'kids', 'adult')),
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  capacity integer default 10 not null check (capacity > 0),
  price integer default 0 not null check (price >= 0),
  status text default 'open' not null check (status in ('open', 'closed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.fencing_club_classes enable row level security;

create policy "Fencing classes are viewable by everyone."
  on public.fencing_club_classes for select
  using ( true );

create policy "Owners or coaches can create fencing classes."
  on public.fencing_club_classes for insert
  with check (
    auth.role() = 'authenticated'
    and (
      coach_id = auth.uid()
      or exists (
        select 1 from public.fencing_clubs fc
        where fc.id = club_id
        and fc.owner_id = auth.uid()
      )
    )
  );

create policy "Owners or coaches can update fencing classes."
  on public.fencing_club_classes for update
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from public.fencing_clubs fc
      where fc.id = club_id
      and fc.owner_id = auth.uid()
    )
  );

-- FENCING CLASS RESERVATIONS
create table public.fencing_class_reservations (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.fencing_club_classes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'requested' not null check (status in ('requested', 'confirmed', 'cancelled')),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

create unique index idx_fencing_class_reservation_unique
  on public.fencing_class_reservations(class_id, user_id);

alter table public.fencing_class_reservations enable row level security;

create policy "Users can view own class reservations."
  on public.fencing_class_reservations for select
  using ( auth.uid() = user_id );

create policy "Users can create own class reservations."
  on public.fencing_class_reservations for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own class reservations."
  on public.fencing_class_reservations for update
  using ( auth.uid() = user_id );

-- FENCING LESSON PRODUCTS
create table public.fencing_lesson_products (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  price integer not null check (price >= 0),
  lesson_mode text default 'offline' not null check (lesson_mode in ('offline', 'online', 'hybrid')),
  location_text text,
  weapon_type text check (weapon_type in ('Fleuret', 'Epee', 'Sabre')),
  duration_minutes integer default 60 not null check (duration_minutes > 0),
  max_students integer default 1 not null check (max_students > 0),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.fencing_lesson_products enable row level security;

create policy "Fencing lesson products are viewable by everyone."
  on public.fencing_lesson_products for select
  using ( true );

create policy "Coaches can create their lesson products."
  on public.fencing_lesson_products for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = coach_id
  );

create policy "Coaches can update their lesson products."
  on public.fencing_lesson_products for update
  using ( auth.uid() = coach_id );

create policy "Coaches can delete their lesson products."
  on public.fencing_lesson_products for delete
  using ( auth.uid() = coach_id );

-- FENCING LESSON ORDERS
create table public.fencing_lesson_orders (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.fencing_lesson_products(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'requested' not null check (status in ('requested', 'accepted', 'rejected', 'paid', 'cancelled', 'completed')),
  message text,
  preferred_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

create unique index idx_fencing_lesson_order_unique
  on public.fencing_lesson_orders(lesson_id, buyer_id);

alter table public.fencing_lesson_orders enable row level security;

create policy "Users can view own lesson orders."
  on public.fencing_lesson_orders for select
  using ( auth.uid() = buyer_id );

create policy "Users can create own lesson orders."
  on public.fencing_lesson_orders for insert
  with check ( auth.uid() = buyer_id );

create policy "Users can update own lesson orders."
  on public.fencing_lesson_orders for update
  using ( auth.uid() = buyer_id );

create index idx_fencing_clubs_city
  on public.fencing_clubs(city);
create index idx_fencing_club_classes_start_at
  on public.fencing_club_classes(start_at);
create index idx_fencing_club_classes_status
  on public.fencing_club_classes(status);
create index idx_fencing_class_reservations_user_id
  on public.fencing_class_reservations(user_id);
create index idx_fencing_lesson_products_coach_id
  on public.fencing_lesson_products(coach_id);
create index idx_fencing_lesson_orders_buyer_id
  on public.fencing_lesson_orders(buyer_id);
create index idx_profiles_club_id
  on public.profiles(club_id);

create policy "Class owners/coaches can view managed class reservations."
  on public.fencing_class_reservations for select
  using (
    exists (
      select 1
      from public.fencing_club_classes fcc
      left join public.fencing_clubs fc on fc.id = fcc.club_id
      where fcc.id = fencing_class_reservations.class_id
      and (
        fcc.coach_id = auth.uid()
        or fc.owner_id = auth.uid()
      )
    )
  );

create policy "Class owners/coaches can update managed class reservations."
  on public.fencing_class_reservations for update
  using (
    exists (
      select 1
      from public.fencing_club_classes fcc
      left join public.fencing_clubs fc on fc.id = fcc.club_id
      where fcc.id = fencing_class_reservations.class_id
      and (
        fcc.coach_id = auth.uid()
        or fc.owner_id = auth.uid()
      )
    )
  );

create policy "Coaches can view incoming lesson orders."
  on public.fencing_lesson_orders for select
  using (
    exists (
      select 1 from public.fencing_lesson_products flp
      where flp.id = fencing_lesson_orders.lesson_id
      and flp.coach_id = auth.uid()
    )
  );

create policy "Coaches can update incoming lesson orders."
  on public.fencing_lesson_orders for update
  using (
    exists (
      select 1 from public.fencing_lesson_products flp
      where flp.id = fencing_lesson_orders.lesson_id
      and flp.coach_id = auth.uid()
    )
  );

-- NOTIFICATIONS
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('chat', 'comment', 'reservation', 'order', 'review', 'system')),
  title text not null,
  body text,
  link text,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications."
  on public.notifications for select
  using ( auth.uid() = user_id );

create policy "Authenticated users can create notifications as actor."
  on public.notifications for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = actor_id
  );

create policy "Users can update own notifications."
  on public.notifications for update
  using ( auth.uid() = user_id );

create policy "Users can delete own notifications."
  on public.notifications for delete
  using ( auth.uid() = user_id );

create index idx_notifications_user_unread_created
  on public.notifications(user_id, is_read, created_at desc);
create index idx_notifications_created_at
  on public.notifications(created_at desc);

-- PUSH DEVICES (for future webview/app push integration)
create table public.push_devices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null check (provider in ('fcm', 'apns', 'webpush')),
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_token text not null unique,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.push_devices enable row level security;

create policy "Users can view own push devices."
  on public.push_devices for select
  using ( auth.uid() = user_id );

create policy "Users can insert own push devices."
  on public.push_devices for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own push devices."
  on public.push_devices for update
  using ( auth.uid() = user_id );

create index idx_push_devices_user_active
  on public.push_devices(user_id, is_active);

-- LESSON REVIEWS
create table public.fencing_lesson_reviews (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.fencing_lesson_products(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

create unique index idx_fencing_lesson_reviews_unique
  on public.fencing_lesson_reviews(lesson_id, reviewer_id);

alter table public.fencing_lesson_reviews enable row level security;

create policy "Lesson reviews are viewable by everyone."
  on public.fencing_lesson_reviews for select
  using ( true );

create policy "Users can insert lesson reviews for ordered lessons."
  on public.fencing_lesson_reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.fencing_lesson_orders flo
      where flo.lesson_id = fencing_lesson_reviews.lesson_id
      and flo.buyer_id = auth.uid()
    )
  );

create policy "Users can update own lesson reviews."
  on public.fencing_lesson_reviews for update
  using ( auth.uid() = reviewer_id );

create policy "Users can delete own lesson reviews."
  on public.fencing_lesson_reviews for delete
  using ( auth.uid() = reviewer_id );

create index idx_fencing_lesson_reviews_lesson_id
  on public.fencing_lesson_reviews(lesson_id);
create index idx_fencing_lesson_reviews_reviewer_id
  on public.fencing_lesson_reviews(reviewer_id);
