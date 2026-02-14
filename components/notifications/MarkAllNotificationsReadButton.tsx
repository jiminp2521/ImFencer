'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function MarkAllNotificationsReadButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);

  const handleMarkAllRead = async () => {
    if (pending) return;
    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleMarkAllRead}
      disabled={pending}
      variant="outline"
      size="sm"
      className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
      <span>전체 읽음</span>
    </Button>
  );
}
