-- Chat RLS stabilization patch
-- Safe to run multiple times.

create or replace function public.is_chat_member(
  p_chat_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_participants cp
    where cp.chat_id = p_chat_id
      and cp.user_id = p_user_id
  );
$$;

revoke all on function public.is_chat_member(uuid, uuid) from public;
grant execute on function public.is_chat_member(uuid, uuid) to authenticated;

alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

grant select, insert, update on public.chats to authenticated;
grant select, insert on public.chat_participants to authenticated;
grant select, insert, update on public.messages to authenticated;

drop policy if exists "Users can view chats they are part of." on public.chats;
drop policy if exists "Authenticated users can create chats." on public.chats;
drop policy if exists "Participants can update chats." on public.chats;

create policy "Users can view chats they are part of."
  on public.chats for select
  using (public.is_chat_member(id, auth.uid()));

create policy "Authenticated users can create chats."
  on public.chats for insert
  with check (auth.role() = 'authenticated');

create policy "Participants can update chats."
  on public.chats for update
  using (public.is_chat_member(id, auth.uid()));

drop policy if exists "Users can view chat participants for their chats." on public.chat_participants;
drop policy if exists "Users can insert themselves as chat participants." on public.chat_participants;
drop policy if exists "Participants can add users to their chats." on public.chat_participants;

create policy "Users can view chat participants for their chats."
  on public.chat_participants for select
  using (public.is_chat_member(chat_id, auth.uid()));

create policy "Users can insert themselves as chat participants."
  on public.chat_participants for insert
  with check (auth.uid() = user_id);

create policy "Participants can add users to their chats."
  on public.chat_participants for insert
  with check (
    auth.uid() = user_id
    or public.is_chat_member(chat_id, auth.uid())
  );

drop policy if exists "Users can view messages for joined chats." on public.messages;
drop policy if exists "Users can insert messages for joined chats." on public.messages;
drop policy if exists "Users can update messages in joined chats." on public.messages;

create policy "Users can view messages for joined chats."
  on public.messages for select
  using (public.is_chat_member(chat_id, auth.uid()));

create policy "Users can insert messages for joined chats."
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_chat_member(chat_id, auth.uid())
  );

create policy "Users can update messages in joined chats."
  on public.messages for update
  using (public.is_chat_member(chat_id, auth.uid()));

