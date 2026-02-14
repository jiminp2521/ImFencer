'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, MapPinned } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type SetMyClubButtonProps = {
  clubId: string;
  clubName: string;
  loginNext?: string;
  className?: string;
  isCurrent?: boolean;
};

export function SetMyClubButton({
  clubId,
  clubName,
  loginNext = '/fencing/clubs',
  className,
  isCurrent = false,
}: SetMyClubButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(isCurrent);

  const handleSetClub = async () => {
    if (pending || selected) return;
    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        club_id: clubId,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error setting my club:', error);
        alert('클럽 설정에 실패했습니다.');
        return;
      }

      setSelected(true);
      alert(`${clubName}으로 소속 클럽이 설정되었습니다.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleSetClub}
      disabled={pending || selected}
      size="sm"
      variant={selected ? 'default' : 'outline'}
      className={
        className ||
        (selected
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
          : 'border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800')
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : selected ? (
        <Check className="h-4 w-4" />
      ) : (
        <MapPinned className="h-4 w-4" />
      )}
      <span>{selected ? '내 클럽' : '소속 클럽 설정'}</span>
    </Button>
  );
}
