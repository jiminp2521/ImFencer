import 'server-only';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPush } from '@/lib/push';

type NotificationType = 'chat' | 'comment' | 'reservation' | 'order' | 'review' | 'system';

type NotificationInput = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  dedupeKey?: string;
  notifySelf?: boolean;
};

export async function createNotificationAndPush({
  userId,
  actorId = null,
  type,
  title,
  body = null,
  link = null,
  dedupeKey,
  notifySelf = false,
}: NotificationInput) {
  if (!notifySelf && actorId && actorId === userId) {
    return { ok: true, skipped: true };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    console.error('Failed to init admin client in notification:', error);
    return { ok: false, error: 'admin-client-not-configured' };
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      actor_id: actorId,
      type,
      title,
      body,
      link,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return { ok: false, error: error.message };
  }

  const path = link || '/notifications';
  await sendPush(userId, title, body || '', path, {
    dedupeKey,
    notificationId: inserted.id,
    type,
  }).catch((pushError) => {
    console.error('Failed to send push for notification:', pushError);
  });

  return {
    ok: true,
    notificationId: inserted.id,
  };
}
