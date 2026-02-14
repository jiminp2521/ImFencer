import type { SupabaseClient } from '@supabase/supabase-js';

export type AppNotificationType = 'chat' | 'comment' | 'reservation' | 'order' | 'review' | 'system';

export type NotificationPayload = {
  userId: string;
  actorId: string;
  type: AppNotificationType;
  title: string;
  body?: string;
  link?: string;
};

export async function notifyUser(supabase: SupabaseClient, payload: NotificationPayload) {
  if (!payload.userId || !payload.actorId) return;
  if (payload.userId === payload.actorId) return;

  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    actor_id: payload.actorId,
    type: payload.type,
    title: payload.title,
    body: payload.body || null,
    link: payload.link || null,
  });

  if (error) {
    throw error;
  }
}

export async function notifyUsers(supabase: SupabaseClient, payloads: NotificationPayload[]) {
  const rows = payloads
    .filter((payload) => payload.userId && payload.actorId && payload.userId !== payload.actorId)
    .map((payload) => ({
      user_id: payload.userId,
      actor_id: payload.actorId,
      type: payload.type,
      title: payload.title,
      body: payload.body || null,
      link: payload.link || null,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    throw error;
  }
}
