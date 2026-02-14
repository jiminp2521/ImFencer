'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { notifyUser } from '@/lib/notifications-client';

type ClassReservationStatus = 'requested' | 'confirmed' | 'cancelled';

type ClassReservationStatusActionsProps = {
  reservationId: string;
  buyerId: string;
  classTitle: string;
  initialStatus: ClassReservationStatus;
};

export function ClassReservationStatusActions({
  reservationId,
  buyerId,
  classTitle,
  initialStatus,
}: ClassReservationStatusActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<ClassReservationStatus>(initialStatus);
  const [pending, setPending] = useState(false);

  const updateStatus = async (nextStatus: ClassReservationStatus) => {
    if (pending || status === nextStatus) return;
    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('fencing_class_reservations')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (error) {
        console.error('Error updating class reservation status:', error);
        alert('예약 상태 변경에 실패했습니다.');
        return;
      }

      setStatus(nextStatus);

      try {
        const statusText =
          nextStatus === 'confirmed'
            ? '확정'
            : nextStatus === 'cancelled'
            ? '취소'
            : '접수';

        await notifyUser(supabase, {
          userId: buyerId,
          actorId: user.id,
          type: 'reservation',
          title: `클래스 예약이 ${statusText}되었습니다.`,
          body: classTitle,
          link: '/activity',
        });
      } catch (notificationError) {
        console.error('Error creating class reservation status notification:', notificationError);
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => updateStatus('confirmed')}
        disabled={pending || status === 'confirmed'}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {pending && status !== 'confirmed' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>확정</span>
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => updateStatus('cancelled')}
        disabled={pending || status === 'cancelled'}
        variant="outline"
        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
      >
        {pending && status !== 'cancelled' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>취소</span>
      </Button>
    </div>
  );
}
