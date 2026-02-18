import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const revalidate = 120;

const menuItems = [
  {
    title: '대회 정보',
    href: '/fencing/competitions',
    description: '대회 일정, 장소, 결과 등록 상태를 확인합니다.',
  },
  {
    title: '주변 클럽 찾기',
    href: '/fencing/clubs',
    description: '클럽 위치/소개를 보고 내 소속 클럽으로 설정합니다.',
  },
  {
    title: '원데이클래스 · 오픈피스트',
    href: '/fencing/classes',
    description: '예약 가능한 단기 클래스와 오픈피스트를 찾습니다.',
  },
  {
    title: '레슨 찾기',
    href: '/fencing/lessons',
    description: '전문 선수/코치 레슨을 비교하고 문의·신청합니다.',
  },
] as const;

export default async function FencingPage() {
  return (
    <div className="imf-page">
      <header className="imf-topbar">
        <div className="imf-logo">
          <img src="/app-logo.png" alt="ImFencer" className="object-contain w-full h-full object-left" />
        </div>
        <NotificationBell />
      </header>

      <main className="px-4 py-5 space-y-4">
        <section className="flex justify-end">
          <Button asChild size="sm" className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs">
            <Link href="/fencing/lessons/write">레슨 등록</Link>
          </Button>
        </section>

        <section className="imf-panel space-y-2">
          <h2 className="text-base font-semibold text-white tracking-tight">메뉴 선택</h2>
          <p className="text-xs text-slate-400">
            한 화면에 모두 노출하지 않고, 기능별 전용 화면으로 분리했습니다.
          </p>
        </section>

        <section className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="imf-panel block px-4 py-3 transition-colors hover:border-blue-400/35"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
                <Badge className="border-slate-600 bg-slate-900 text-slate-200 shrink-0">바로가기</Badge>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
