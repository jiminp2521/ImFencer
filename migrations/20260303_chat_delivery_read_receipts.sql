-- Chat delivery/read optimization patch
-- Safe to run multiple times.

alter table public.messages
  add column if not exists client_id text;

create index if not exists idx_messages_chat_sender_client_id
  on public.messages (chat_id, sender_id, client_id)
  where client_id is not null;

create or replace function public.sync_chat_preview_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chats
  set
    last_message = new.content,
    updated_at = new.created_at
  where id = new.chat_id
    and (updated_at is null or new.created_at >= updated_at);

  return new;
end;
$$;

drop trigger if exists trg_sync_chat_preview_on_message_insert on public.messages;

create trigger trg_sync_chat_preview_on_message_insert
after insert on public.messages
for each row
execute function public.sync_chat_preview_on_message_insert();
