'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { notifyUser } from '@/lib/notifications-client';

type LessonOrderStatus = 'requested' | 'accepted' | 'rejected' | 'paid' | 'cancelled' | 'completed';

type LessonOrderStatusActionsProps = {
  orderId: string;
  buyerId: string;
  lessonTitle: string;
  initialStatus: LessonOrderStatus;
};

export function LessonOrderStatusActions({
  orderId,
  buyerId,
  lessonTitle,
  initialStatus,
}: LessonOrderStatusActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<LessonOrderStatus>(initialStatus);
  const [pending, setPending] = useState(false);

  const updateStatus = async (nextStatus: LessonOrderStatus) => {
    if (pending || status === nextStatus) return;
    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('fencing_lesson_orders')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating lesson order status:', error);
        alert('신청 상태 변경에 실패했습니다.');
        return;
      }

      setStatus(nextStatus);

      try {
        const statusTextMap: Record<LessonOrderStatus, string> = {
          requested: '접수',
          accepted: '승인',
          rejected: '거절',
          paid: '결제 완료',
          cancelled: '취소',
          completed: '완료',
        };

        await notifyUser(supabase, {
          userId: buyerId,
          actorId: user.id,
          type: 'order',
          title: `레슨 신청이 ${statusTextMap[nextStatus]}되었습니다.`,
          body: lessonTitle,
          link: '/activity',
        });
      } catch (notificationError) {
        console.error('Error creating lesson order status notification:', notificationError);
      }

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
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
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
        className="border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
      >
        {pending && status !== 'completed' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>완료</span>
      </Button>
    </div>
  );
}
