-- Chat + fencing list runtime performance patch
-- Safe to run multiple times.

create index if not exists idx_chat_participants_user_chat
  on public.chat_participants (user_id, chat_id);

create index if not exists idx_chat_participants_chat_user
  on public.chat_participants (chat_id, user_id);

create index if not exists idx_messages_chat_sender_unread
  on public.messages (chat_id, sender_id)
  where read_at is null;

create index if not exists idx_fencing_club_classes_club_status_start
  on public.fencing_club_classes (club_id, status, start_at);

create or replace function public.get_chat_unread_counts(
  p_user_id uuid,
  p_chat_ids uuid[]
)
returns table(chat_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.chat_id,
    count(*)::bigint as unread_count
  from public.messages m
  where m.chat_id = any(p_chat_ids)
    and m.sender_id <> p_user_id
    and m.read_at is null
  group by m.chat_id
$$;

grant execute on function public.get_chat_unread_counts(uuid, uuid[]) to authenticated;
