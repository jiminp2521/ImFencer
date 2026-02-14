'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ClassReservationStatus = 'requested' | 'confirmed' | 'cancelled';

type ClassReservationStatusActionsProps = {
  reservationId: string;
  initialStatus: ClassReservationStatus;
};

export function ClassReservationStatusActions({
  reservationId,
  initialStatus,
}: ClassReservationStatusActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ClassReservationStatus>(initialStatus);
  const [pending, setPending] = useState(false);

  const updateStatus = async (nextStatus: ClassReservationStatus) => {
    if (pending || status === nextStatus) return;
    setPending(true);

    try {
      const response = await fetch(`/api/fencing/class-reservations/${reservationId}`, {
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
        console.error('Error updating class reservation status:', body);
        alert('예약 상태 변경에 실패했습니다.');
        return;
      }

      setStatus(nextStatus);
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
