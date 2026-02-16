import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { ClassPaymentButton } from '@/components/fencing/ClassPaymentButton';
import { StartChatButton } from '@/components/chat/StartChatButton';

type ClassesPageProps = {
  searchParams: Promise<{
    kind?: string;
  }>;
};

type ProfileRef = {
  username: string | null;
};

type ClubRef = {
  id: string;
  owner_id: string | null;
  name: string;
  city: string;
  address: string;
};

type ClubClassRow = {
  id: string;
  club_id: string;
  coach_id: string | null;
  title: string;
  description: string | null;
  weapon_type: string | null;
  level: string | null;
  lesson_type: string | null;
  start_at: string;
  end_at: string;
  capacity: number;
  price: number;
  status: string;
  fencing_clubs: ClubRef | ClubRef[] | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

type ReservationRow = {
  class_id: string;
  status: 'requested' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
};

const CLASS_LIST_LIMIT = 60;

const kindFilters = [
  { label: '전체', value: 'all' },
  { label: '원데이클래스', value: 'oneday' },
  { label: '오픈피스트', value: 'openpiste' },
];

const weaponLabelMap: Record<string, string> = {
  Epee: '에페',
  Sabre: '사브르',
  Fleuret: '플뢰레',
};

const levelMap: Record<string, string> = {
  beginner: '입문',
  intermediate: '중급',
  advanced: '상급',
  all: '전체',
};

const classTypeMap: Record<string, string> = {
  group: '그룹',
  private: '개인',
  kids: '키즈',
  adult: '성인',
};

const buildHref = (kind: string) => {
  if (kind === 'all') return '/fencing/classes';
  return `/fencing/classes?kind=${kind}`;
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const detectKind = (item: ClubClassRow) => {
  const source = `${item.title} ${item.description || ''}`.toLowerCase();
  if (source.includes('오픈피스트') || source.includes('open piste') || source.includes('open-piste')) {
    return 'openpiste';
  }
  return 'oneday';
};

export default async function FencingClassesPage({ searchParams }: ClassesPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const selectedKind = kindFilters.some((filter) => filter.value === resolvedSearchParams.kind)
    ? resolvedSearchParams.kind!
    : 'all';

  const [userResult, classesResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('fencing_club_classes')
      .select(`
        id,
        club_id,
        coach_id,
        title,
        description,
        weapon_type,
        level,
        lesson_type,
        start_at,
        end_at,
        capacity,
        price,
        status,
        fencing_clubs:club_id (id, owner_id, name, city, address),
        profiles:coach_id (username)
      `)
      .order('start_at', { ascending: true })
      .limit(CLASS_LIST_LIMIT),
  ]);
  const user = userResult.data.user;

  if (classesResult.error) {
    console.error('Error fetching fencing classes:', classesResult.error);
  }

  const allClasses = (classesResult.data || []) as ClubClassRow[];
  const filteredClasses =
    selectedKind === 'all' ? allClasses : allClasses.filter((item) => detectKind(item) === selectedKind);
  const classIds = filteredClasses.map((item) => item.id);

  const myReservationsResult =
    user && classIds.length > 0
      ? await supabase
          .from('fencing_class_reservations')
          .select('class_id, status, payment_status')
          .eq('user_id', user.id)
          .in('class_id', classIds)
      : { data: [], error: null };

  if (myReservationsResult.error) {
    console.error('Error fetching my class reservations:', myReservationsResult.error);
  }

  const myReservedClassIds = new Set(
    ((myReservationsResult.data || []) as ReservationRow[])
      .filter((row) => row.status !== 'cancelled' && row.payment_status !== 'failed' && row.payment_status !== 'cancelled')
      .map((row) => row.class_id)
  );

  const schemaMissing = classesResult.error?.code === '42P01';

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/fencing" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">원데이클래스 · 오픈피스트</h1>
      </header>

      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {kindFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildHref(filter.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedKind === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="px-4 py-4 space-y-2">
        {schemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">클래스 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">DB에 `migration.sql`의 펜싱 섹션을 반영해주세요.</p>
          </section>
        ) : null}

        {filteredClasses.length > 0 ? (
          filteredClasses.map((classItem) => {
            const club = pickOne(classItem.fencing_clubs);
            const coach = pickOne(classItem.profiles);
            const contactUserId = classItem.coach_id || club?.owner_id || null;
            const isClosed = classItem.status !== 'open';
            const kind = detectKind(classItem);

            return (
              <article
                key={classItem.id}
                className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{classItem.title}</p>
                    <p className="text-xs text-gray-400">
                      {club?.name || '클럽 미지정'} · {coach?.username || '코치 미지정'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      className={
                        kind === 'openpiste'
                          ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                          : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                      }
                    >
                      {kind === 'openpiste' ? '오픈피스트' : '원데이클래스'}
                    </Badge>
                    <Badge
                      className={
                        isClosed
                          ? 'border-gray-700 bg-gray-800/60 text-gray-300'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      }
                    >
                      {isClosed ? '마감' : '예약 가능'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                  {classItem.weapon_type ? (
                    <span>{weaponLabelMap[classItem.weapon_type] || classItem.weapon_type}</span>
                  ) : null}
                  {classItem.level ? <span>• {levelMap[classItem.level] || classItem.level}</span> : null}
                  {classItem.lesson_type ? (
                    <span>• {classTypeMap[classItem.lesson_type] || classItem.lesson_type}</span>
                  ) : null}
                  <span>• {classItem.capacity}명</span>
                </div>

                <p className="text-xs text-gray-400">
                  {formatDateTime(classItem.start_at)} ~ {formatDateTime(classItem.end_at)}
                </p>
                <p className="text-sm font-semibold text-blue-400">
                  {classItem.price.toLocaleString('ko-KR')}원
                </p>

                {classItem.description ? <p className="text-xs text-gray-300">{classItem.description}</p> : null}

                <div className="flex gap-2">
                  <ClassPaymentButton
                    classId={classItem.id}
                    classTitle={classItem.title}
                    initialReserved={myReservedClassIds.has(classItem.id)}
                    loginNext="/fencing/classes"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  />
                  {contactUserId ? (
                    <StartChatButton
                      targetUserId={contactUserId}
                      contextTitle={classItem.title}
                      openingMessage={`${classItem.title} 문의드립니다.`}
                      loginNext="/fencing/classes"
                      label="문의 채팅"
                      size="default"
                      variant="outline"
                      className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                    />
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-14 text-center text-sm text-gray-500">
            등록된 원데이클래스/오픈피스트가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
