'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type MarketOwnerActionsProps = {
  marketItemId: string;
};

export function MarketOwnerActions({ marketItemId }: MarketOwnerActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;

    const confirmed = confirm('이 판매글을 삭제하시겠습니까?');
    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase.from('market_items').delete().eq('id', marketItemId);

    if (error) {
      console.error('Error deleting market item:', error);
      alert('판매글 삭제에 실패했습니다.');
      setDeleting(false);
      return;
    }

    router.push('/market');
    router.refresh();
  };

  return (
    <div className="flex gap-2">
      <Button asChild type="button" variant="outline" className="flex-1 border-gray-700 text-gray-200 hover:bg-gray-900">
        <Link href={`/market/write?edit=${marketItemId}`}>
          <Pencil className="w-4 h-4" />
          <span>수정하기</span>
        </Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleDelete}
        disabled={deleting}
        className="flex-1 border-red-700/60 text-red-300 hover:bg-red-900/30"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        <span>삭제하기</span>
      </Button>
    </div>
  );
}
