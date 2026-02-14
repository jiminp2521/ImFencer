'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

const statusOptions = [
  { label: '판매중', value: 'selling' },
  { label: '예약중', value: 'reserved' },
  { label: '판매완료', value: 'sold' },
];

type MarketStatusActionsProps = {
  marketItemId: string;
  initialStatus: string;
};

export function MarketStatusActions({ marketItemId, initialStatus }: MarketStatusActionsProps) {
  const supabase = createClient();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);

  const updateStatus = async (nextStatus: string) => {
    if (pending || nextStatus === status) return;
    setPending(true);

    const { error } = await supabase
      .from('market_items')
      .update({ status: nextStatus })
      .eq('id', marketItemId);

    if (error) {
      console.error('Error updating market status:', error);
      alert('상태 변경에 실패했습니다.');
      setPending(false);
      return;
    }

    setStatus(nextStatus);
    setPending(false);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {statusOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={status === option.value ? 'default' : 'outline'}
          onClick={() => updateStatus(option.value)}
          className={
            status === option.value
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'border-gray-700 text-gray-300 hover:bg-gray-900'
          }
          disabled={pending}
        >
          {pending && status === option.value ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            option.label
          )}
        </Button>
      ))}
    </div>
  );
}
