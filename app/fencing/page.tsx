import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CountResult = {
  count: number | null;
  error: { code?: string } | null;
};

const menuItems = [
  {
    title: '대회 정보',
    href: '/fencing/competitions',
    description: '대회 일정, 장소, 결과 등록 상태를 확인합니다.',
    countKey: 'competitions',
  },
  {
    title: '주변 클럽 찾기',
    href: '/fencing/clubs',
    description: '클럽 위치/소개를 보고 내 소속 클럽으로 설정합니다.',
    countKey: 'clubs',
  },
  {
    title: '원데이클래스 · 오픈피스트',
    href: '/fencing/classes',
    description: '예약 가능한 단기 클래스와 오픈피스트를 찾습니다.',
    countKey: 'classes',
  },
  {
    title: '레슨 찾기',
    href: '/fencing/lessons',
    description: '전문 선수/코치 레슨을 비교하고 문의·신청합니다.',
    countKey: 'lessons',
  },
] as const;

export default async function FencingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [competitions, clubs, classes, lessons] = (await Promise.all([
    supabase.from('competitions').select('*', { count: 'exact', head: true }),
    supabase.from('fencing_clubs').select('*', { count: 'exact', head: true }),
    supabase
      .from('fencing_club_classes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('fencing_lesson_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ])) as [CountResult, CountResult, CountResult, CountResult];

  const countMap: Record<string, number> = {
    competitions: competitions.count || 0,
    clubs: clubs.count || 0,
    classes: classes.count || 0,
    lessons: lessons.count || 0,
  };

  const schemaMissing = [clubs.error, classes.error, lessons.error].some(
    (error) => error?.code === '42P01'
  );

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">펜싱</h1>
        <Button asChild size="sm" className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs">
          <Link href={user ? '/fencing/lessons/write' : '/login?next=%2Ffencing%2Flessons%2Fwrite'}>
            레슨 등록
          </Link>
        </Button>
      </header>

      <main className="px-4 py-5 space-y-4">
        {schemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">펜싱 확장 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">
              `migration.sql`의 펜싱 섹션 SQL을 적용하면 메뉴별 데이터가 활성화됩니다.
            </p>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">메뉴 선택</h2>
          <p className="text-xs text-gray-500">
            한 화면에 모두 노출하지 않고, 기능별 전용 화면으로 분리했습니다.
          </p>
        </section>

        <section className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl border border-white/10 bg-gray-950 px-4 py-3 hover:bg-gray-900/70 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
                <Badge className="border-white/10 bg-gray-900 text-gray-300 shrink-0">
                  {countMap[item.countKey]}개
                </Badge>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
