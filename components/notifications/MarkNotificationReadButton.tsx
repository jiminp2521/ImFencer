'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type MarkNotificationReadButtonProps = {
  notificationId: string;
  initialRead: boolean;
};

export function MarkNotificationReadButton({
  notificationId,
  initialRead,
}: MarkNotificationReadButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [read, setRead] = useState(initialRead);

  const handleMarkRead = async () => {
    if (pending || read) return;
    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setRead(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={pending || read}
      onClick={handleMarkRead}
      className={read ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      <span>{read ? '읽음' : '읽기'}</span>
    </Button>
  );
}
