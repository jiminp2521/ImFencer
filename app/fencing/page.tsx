import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Building2, CalendarDays, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const revalidate = 120;

const menuItems = [
  {
    title: '대회 정보',
    href: '/fencing/competitions',
    description: '일정, 장소, 진행 상태를 확인합니다.',
    detail: 'Competition',
    icon: CalendarDays,
  },
  {
    title: '주변 클럽 찾기',
    href: '/fencing/clubs',
    description: '클럽 위치와 소개를 확인하고 소속을 설정합니다.',
    detail: 'Club Network',
    icon: Building2,
  },
  {
    title: '원데이클래스 · 오픈피스트',
    href: '/fencing/classes',
    description: '단기 클래스와 오픈피스트 예약을 진행합니다.',
    detail: 'Class Booking',
    icon: Users,
  },
  {
    title: '레슨 찾기',
    href: '/fencing/lessons',
    description: '코치 레슨을 비교하고 문의 및 신청합니다.',
    detail: '1:1 Lessons',
    icon: GraduationCap,
  },
] as const;

export default async function FencingPage() {
  return (
    <div className="imf-page">
      <header className="imf-topbar">
        <div className="imf-logo">
          <Image
            src="/app-logo.png"
            alt="ImFencer"
            width={128}
            height={32}
            className="object-contain w-full h-full object-left"
            priority
          />
        </div>
        <NotificationBell />
      </header>

      <main className="animate-imfencer-fade-up px-4 py-5 space-y-4">
        <section className="imf-panel relative overflow-hidden px-4 py-4">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="imf-kicker">Fencing Hub</p>
              <h1 className="text-xl font-semibold tracking-tight text-white">펜싱 메뉴</h1>
              <p className="max-w-[340px] text-sm text-slate-300">
                경기 일정부터 클럽 탐색, 클래스 예약, 레슨 신청까지 한 흐름으로 이동할 수 있습니다.
              </p>
            </div>
            <Button asChild size="sm" className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-black hover:bg-slate-200">
              <Link href="/fencing/lessons/write">레슨 등록</Link>
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Flow</p>
              <p className="mt-1 text-sm font-semibold text-white">4 Modules</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Style</p>
              <p className="mt-1 text-sm font-semibold text-white">Matte Mono</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Focus</p>
              <p className="mt-1 text-sm font-semibold text-white">Fast Access</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="imf-link-card group"
            >
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.detail}</p>
                  <p className="text-base font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-300">{item.description}</p>
                </div>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-slate-200 transition-colors group-hover:border-white/40 group-hover:bg-white/10 group-hover:text-white">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
