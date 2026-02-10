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
  with check ( auth.role() = 'authenticated' );

create policy "Users can update own posts."
  on posts for update
  using ( auth.uid() = author_id );

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
  with check ( auth.role() = 'authenticated' );

create policy "Users can update own market items."
  on market_items for update
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

alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;

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
