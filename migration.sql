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
