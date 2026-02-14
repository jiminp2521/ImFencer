'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarkAllNotificationsReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleMarkAllRead = async () => {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Error marking all notifications as read:', body);
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
