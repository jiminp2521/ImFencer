'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Bookmark, CalendarClock, Copy, FileText, Loader2, Settings, LogOut, UserX, Shield } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProfileMenuButtonProps = {
  userId: string;
  username: string;
};

const safeOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin || '';
};

export function ProfileMenuButton({ userId, username }: ProfileMenuButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const publicProfileHref = useMemo(() => `/users/${userId}`, [userId]);

  const copyProfileLink = async () => {
    try {
      const url = `${safeOrigin()}${publicProfileHref}`;
      await navigator.clipboard.writeText(url);
      alert('프로필 링크를 복사했습니다.');
    } catch (error) {
      console.error('Failed to copy profile link:', error);
      alert('링크 복사에 실패했습니다.');
    }
  };

  const close = () => setOpen(false);

  const deleteAccount = async () => {
    if (deletePending) return;
    const confirmed = confirm('계정을 탈퇴하면 되돌릴 수 없습니다. 정말 탈퇴하시겠습니까?');
    if (!confirmed) return;

    const reason = prompt('탈퇴 사유를 남기시겠습니까? (선택)');

    setDeletePending(true);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason?.trim() || null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        alert(body?.error || '계정 삭제에 실패했습니다.');
        return;
      }

      alert('계정이 삭제되었습니다.');
      close();
      router.replace('/login?deleted=1');
      router.refresh();
    } catch (error) {
      console.error('Delete account failed:', error);
      alert('계정 삭제에 실패했습니다.');
    } finally {
      setDeletePending(false);
    }
  };

  const itemClass =
    'flex items-center justify-between rounded-lg border border-white/10 bg-gray-950 px-3 py-3 text-sm text-gray-200 hover:bg-gray-900/70 transition-colors';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="text-gray-200 hover:bg-white/5">
          <Settings className="h-5 w-5" />
          <span className="sr-only">설정</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="border-white/10 bg-black px-0">
        <SheetHeader className="border-b border-white/10">
          <SheetTitle className="text-white">내 메뉴</SheetTitle>
          <p className="text-xs text-gray-500">{username}</p>
        </SheetHeader>

        <div className="px-4 pt-2 space-y-2">
          <Link href="/activity" onClick={close} className={itemClass}>
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-300" />
              신청/예약 관리
            </span>
            <span className="text-xs text-gray-500">보기</span>
          </Link>

          <Link href="/notifications" onClick={close} className={itemClass}>
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-300" />
              알림함
            </span>
            <span className="text-xs text-gray-500">보기</span>
          </Link>

          <Link href="/profile/posts" onClick={close} className={itemClass}>
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-300" />
              내가 쓴 글
            </span>
            <span className="text-xs text-gray-500">보기</span>
          </Link>

          <Link href="/profile/bookmarks" onClick={close} className={itemClass}>
            <span className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-purple-300" />
              북마크
            </span>
            <span className="text-xs text-gray-500">보기</span>
          </Link>

          <Link href="/admin/platform-settings" onClick={close} className={itemClass}>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-300" />
              플랫폼 수수료
            </span>
            <span className="text-xs text-gray-500">관리</span>
          </Link>

          <button type="button" onClick={copyProfileLink} className={cn(itemClass, 'w-full')}>
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-gray-300" />
              내 프로필 링크 복사
            </span>
            <span className="text-xs text-gray-500">복사</span>
          </button>
        </div>

        <div className="mt-auto px-4 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={deleteAccount}
            disabled={deletePending}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-3 text-sm font-medium text-red-200 hover:bg-red-500/15 transition-colors disabled:opacity-50"
          >
            {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            계정 삭제
          </button>
          <Link
            href="/api/auth/logout"
            onClick={close}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm font-medium text-red-200 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
