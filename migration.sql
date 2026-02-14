-- Add user_type column to profiles
alter table public.profiles add column if not exists user_type text;

-- COMMENTS
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.comments enable row level security;

drop policy if exists "Comments are viewable by everyone." on public.comments;
create policy "Comments are viewable by everyone."
  on public.comments for select
  using ( true );

drop policy if exists "Users can insert their own comments." on public.comments;
create policy "Users can insert their own comments."
  on public.comments for insert
  with check ( auth.uid() = author_id );

drop policy if exists "Users can update own comments." on public.comments;
create policy "Users can update own comments."
  on public.comments for update
  using ( auth.uid() = author_id );

drop policy if exists "Users can delete own comments." on public.comments;
create policy "Users can delete own comments."
  on public.comments for delete
  using ( auth.uid() = author_id );

-- POST LIKES
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Post likes are viewable by everyone." on public.post_likes;
create policy "Post likes are viewable by everyone."
  on public.post_likes for select
  using ( true );

drop policy if exists "Users can like posts as themselves." on public.post_likes;
create policy "Users can like posts as themselves."
  on public.post_likes for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can remove their own likes." on public.post_likes;
create policy "Users can remove their own likes."
  on public.post_likes for delete
  using ( auth.uid() = user_id );

-- POST BOOKMARKS
create table if not exists public.post_bookmarks (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

alter table public.post_bookmarks enable row level security;

drop policy if exists "Post bookmarks are private to owner." on public.post_bookmarks;
create policy "Post bookmarks are private to owner."
  on public.post_bookmarks for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can bookmark posts as themselves." on public.post_bookmarks;
create policy "Users can bookmark posts as themselves."
  on public.post_bookmarks for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can remove their own bookmarks." on public.post_bookmarks;
create policy "Users can remove their own bookmarks."
  on public.post_bookmarks for delete
  using ( auth.uid() = user_id );

-- REPORTS
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  target_type text check (target_type in ('post', 'comment', 'user')) not null,
  target_id uuid not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reports enable row level security;

drop policy if exists "Users can insert reports." on public.reports;
create policy "Users can insert reports."
  on public.reports for insert
  with check ( auth.uid() = reporter_id );

drop policy if exists "Users can view own reports." on public.reports;
create policy "Users can view own reports."
  on public.reports for select
  using ( auth.uid() = reporter_id );

drop policy if exists "Users can delete own market items." on public.market_items;
create policy "Users can delete own market items."
  on public.market_items for delete
  using ( auth.uid() = seller_id );

-- MESSAGES
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone
);

alter table public.messages enable row level security;

drop policy if exists "Users can view messages for joined chats." on public.messages;
create policy "Users can view messages for joined chats."
  on public.messages for select
  using (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id
      and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert messages for joined chats." on public.messages;
create policy "Users can insert messages for joined chats."
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id
      and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update messages in joined chats." on public.messages;
create policy "Users can update messages in joined chats."
  on public.messages for update
  using (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id
      and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can create chats." on public.chats;
create policy "Authenticated users can create chats."
  on public.chats for insert
  with check ( auth.role() = 'authenticated' );

drop policy if exists "Users can insert themselves as chat participants." on public.chat_participants;
create policy "Users can insert themselves as chat participants."
  on public.chat_participants for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Participants can add users to their chats." on public.chat_participants;
create policy "Participants can add users to their chats."
  on public.chat_participants for insert
  with check (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = chat_participants.chat_id
      and cp.user_id = auth.uid()
    )
  );

create index if not exists idx_comments_post_created_at
  on public.comments(post_id, created_at desc);
create index if not exists idx_comments_parent_id
  on public.comments(parent_id);
create index if not exists idx_post_likes_user_id
  on public.post_likes(user_id);
create index if not exists idx_post_bookmarks_user_id
  on public.post_bookmarks(user_id);
create index if not exists idx_messages_chat_created_at
  on public.messages(chat_id, created_at desc);

-- FENCING CLUBS
create table if not exists public.fencing_clubs (
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

drop policy if exists "Fencing clubs are viewable by everyone." on public.fencing_clubs;
create policy "Fencing clubs are viewable by everyone."
  on public.fencing_clubs for select
  using ( true );

drop policy if exists "Owners can create fencing clubs." on public.fencing_clubs;
create policy "Owners can create fencing clubs."
  on public.fencing_clubs for insert
  with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );

drop policy if exists "Owners can update fencing clubs." on public.fencing_clubs;
create policy "Owners can update fencing clubs."
  on public.fencing_clubs for update
  using ( auth.uid() = owner_id );

-- FENCING CLUB CLASSES
create table if not exists public.fencing_club_classes (
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

drop policy if exists "Fencing classes are viewable by everyone." on public.fencing_club_classes;
create policy "Fencing classes are viewable by everyone."
  on public.fencing_club_classes for select
  using ( true );

drop policy if exists "Owners or coaches can create fencing classes." on public.fencing_club_classes;
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

drop policy if exists "Owners or coaches can update fencing classes." on public.fencing_club_classes;
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
create table if not exists public.fencing_class_reservations (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.fencing_club_classes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'requested' not null check (status in ('requested', 'confirmed', 'cancelled')),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

create unique index if not exists idx_fencing_class_reservation_unique
  on public.fencing_class_reservations(class_id, user_id);

alter table public.fencing_class_reservations enable row level security;

drop policy if exists "Users can view own class reservations." on public.fencing_class_reservations;
create policy "Users can view own class reservations."
  on public.fencing_class_reservations for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can create own class reservations." on public.fencing_class_reservations;
create policy "Users can create own class reservations."
  on public.fencing_class_reservations for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update own class reservations." on public.fencing_class_reservations;
create policy "Users can update own class reservations."
  on public.fencing_class_reservations for update
  using ( auth.uid() = user_id );

-- FENCING LESSON PRODUCTS
create table if not exists public.fencing_lesson_products (
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

drop policy if exists "Fencing lesson products are viewable by everyone." on public.fencing_lesson_products;
create policy "Fencing lesson products are viewable by everyone."
  on public.fencing_lesson_products for select
  using ( true );

drop policy if exists "Coaches can create their lesson products." on public.fencing_lesson_products;
create policy "Coaches can create their lesson products."
  on public.fencing_lesson_products for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = coach_id
  );

drop policy if exists "Coaches can update their lesson products." on public.fencing_lesson_products;
create policy "Coaches can update their lesson products."
  on public.fencing_lesson_products for update
  using ( auth.uid() = coach_id );

drop policy if exists "Coaches can delete their lesson products." on public.fencing_lesson_products;
create policy "Coaches can delete their lesson products."
  on public.fencing_lesson_products for delete
  using ( auth.uid() = coach_id );

-- FENCING LESSON ORDERS
create table if not exists public.fencing_lesson_orders (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.fencing_lesson_products(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'requested' not null check (status in ('requested', 'accepted', 'rejected', 'paid', 'cancelled', 'completed')),
  message text,
  preferred_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

create unique index if not exists idx_fencing_lesson_order_unique
  on public.fencing_lesson_orders(lesson_id, buyer_id);

alter table public.fencing_lesson_orders enable row level security;

drop policy if exists "Users can view own lesson orders." on public.fencing_lesson_orders;
create policy "Users can view own lesson orders."
  on public.fencing_lesson_orders for select
  using ( auth.uid() = buyer_id );

drop policy if exists "Users can create own lesson orders." on public.fencing_lesson_orders;
create policy "Users can create own lesson orders."
  on public.fencing_lesson_orders for insert
  with check ( auth.uid() = buyer_id );

drop policy if exists "Users can update own lesson orders." on public.fencing_lesson_orders;
create policy "Users can update own lesson orders."
  on public.fencing_lesson_orders for update
  using ( auth.uid() = buyer_id );

create index if not exists idx_fencing_clubs_city
  on public.fencing_clubs(city);
create index if not exists idx_fencing_club_classes_start_at
  on public.fencing_club_classes(start_at);
create index if not exists idx_fencing_club_classes_status
  on public.fencing_club_classes(status);
create index if not exists idx_fencing_class_reservations_user_id
  on public.fencing_class_reservations(user_id);
create index if not exists idx_fencing_lesson_products_coach_id
  on public.fencing_lesson_products(coach_id);
create index if not exists idx_fencing_lesson_orders_buyer_id
  on public.fencing_lesson_orders(buyer_id);
