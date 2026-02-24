'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LessonOrderStatus = 'requested' | 'accepted' | 'rejected' | 'paid' | 'cancelled' | 'completed';

type LessonOrderStatusActionsProps = {
  orderId: string;
  initialStatus: LessonOrderStatus;
};

export function LessonOrderStatusActions({
  orderId,
  initialStatus,
}: LessonOrderStatusActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<LessonOrderStatus>(initialStatus);
  const [pending, setPending] = useState(false);

  const updateStatus = async (nextStatus: LessonOrderStatus) => {
    if (pending || status === nextStatus) return;
    setPending(true);

    try {
      const response = await fetch(`/api/fencing/lesson-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.status === 401) {
        alert('로그인이 필요합니다.');
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Error updating lesson order status:', body);
        alert('신청 상태 변경에 실패했습니다.');
        return;
      }

      setStatus(nextStatus);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => updateStatus('accepted')}
        disabled={pending || status === 'accepted'}
        className="bg-white text-black hover:bg-slate-200"
      >
        {pending && status !== 'accepted' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>승인</span>
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => updateStatus('rejected')}
        disabled={pending || status === 'rejected'}
        variant="outline"
        className="border-white/20 bg-black/45 text-slate-200 hover:bg-white/10"
      >
        {pending && status !== 'rejected' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>거절</span>
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => updateStatus('completed')}
        disabled={pending || status === 'completed'}
        variant="outline"
        className="border-white/25 bg-white/10 text-slate-100 hover:bg-white/15"
      >
        {pending && status !== 'completed' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>완료</span>
      </Button>
    </div>
  );
}
