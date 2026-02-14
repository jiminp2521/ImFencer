import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { MarkAllNotificationsReadButton } from '@/components/notifications/MarkAllNotificationsReadButton';
import { MarkNotificationReadButton } from '@/components/notifications/MarkNotificationReadButton';

type NotificationRow = {
  id: string;
  type: 'chat' | 'comment' | 'reservation' | 'order' | 'review' | 'system';
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

const typeLabelMap: Record<string, string> = {
  chat: '채팅',
  comment: '댓글',
  reservation: '예약',
  order: '신청',
  review: '후기',
  system: '시스템',
};

const pickProfile = (profiles: NotificationRow['profiles']) => {
  if (Array.isArray(profiles)) return profiles[0] || null;
  return profiles;
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fnotifications');
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      title,
      body,
      link,
      is_read,
      created_at,
      profiles:actor_id (username)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching notifications:', error);
  }

  const notifications = (data || []) as NotificationRow[];
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const schemaMissing = error?.code === '42P01';

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-semibold text-white ml-2">알림</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-white/10 bg-gray-900 text-gray-300">미읽음 {unreadCount}</Badge>
          <MarkAllNotificationsReadButton />
        </div>
      </header>

      <main className="px-4 py-4 space-y-2">
        {schemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">알림 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">DB에 `migration.sql` 최신 버전을 적용해주세요.</p>
          </section>
        ) : null}

        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const actor = pickProfile(notification.profiles);
            const content = (
              <article
                className={`rounded-xl border px-4 py-3 space-y-2 ${
                  notification.is_read
                    ? 'border-white/10 bg-gray-950/70'
                    : 'border-blue-500/30 bg-blue-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="border-white/10 bg-gray-900 text-gray-300">
                        {typeLabelMap[notification.type] || notification.type}
                      </Badge>
                      {!notification.is_read ? (
                        <span className="text-[10px] font-semibold text-blue-300">NEW</span>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    {notification.body ? (
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{notification.body}</p>
                    ) : null}
                    <p className="text-[11px] text-gray-500">
                      {actor?.username ? `${actor.username} • ` : ''}
                      {new Date(notification.created_at).toLocaleString('ko-KR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <MarkNotificationReadButton
                    notificationId={notification.id}
                    initialRead={notification.is_read}
                  />
                </div>
              </article>
            );

            if (notification.link) {
              return (
                <Link key={notification.id} href={notification.link} className="block">
                  {content}
                </Link>
              );
            }

            return <div key={notification.id}>{content}</div>;
          })
        ) : (
          <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-14 text-center text-sm text-gray-500">
            아직 알림이 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
