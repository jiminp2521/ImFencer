import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="min-h-screen pb-20 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_rgba(0,0,0,0.97)_40%)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-black via-black/95 to-black/80 backdrop-blur-xl px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">펜싱</h1>
        <Button asChild size="sm" className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs">
          <Link href="/fencing/lessons/write">레슨 등록</Link>
        </Button>
      </header>

      <main className="px-4 py-5 space-y-4">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white tracking-tight">메뉴 선택</h2>
          <p className="text-xs text-gray-500">
            한 화면에 모두 노출하지 않고, 기능별 전용 화면으로 분리했습니다.
          </p>
        </section>

        <section className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-2xl border border-white/10 bg-gradient-to-br from-[#041027] to-[#020713] px-4 py-3 hover:border-blue-500/40 hover:bg-[#06122a] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
                <Badge className="border-white/10 bg-gray-900 text-gray-300 shrink-0">바로가기</Badge>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
