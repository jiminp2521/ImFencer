'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let supabase;
      try {
        supabase = createClient();
      } catch (error) {
        console.error('Supabase client init failed in NotificationBell:', error);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!cancelled && !error) {
        setUnreadCount(count || 0);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
