import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClassReservationButton } from '@/components/fencing/ClassReservationButton';
import { LessonOrderButton } from '@/components/fencing/LessonOrderButton';
import { StartChatButton } from '@/components/chat/StartChatButton';

type FencingPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

type FencingTab = 'all' | 'competitions' | 'clubs' | 'classes' | 'lessons';

type CompetitionRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  bracket_image_url: string | null;
  result_data: Record<string, unknown> | null;
};

type ClubRow = {
  id: string;
  owner_id: string | null;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  description: string | null;
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

type LessonRow = {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  price: number;
  lesson_mode: string;
  location_text: string | null;
  weapon_type: string | null;
  duration_minutes: number;
  max_students: number;
  profiles: ProfileRef | ProfileRef[] | null;
};

type ReservationRow = {
  class_id: string;
};

type LessonOrderRow = {
  lesson_id: string;
};

const tabs: { label: string; value: FencingTab }[] = [
  { label: '전체', value: 'all' },
  { label: '대회', value: 'competitions' },
  { label: '클럽', value: 'clubs' },
  { label: '클래스', value: 'classes' },
  { label: '레슨', value: 'lessons' },
];

const weaponLabelMap: Record<string, string> = {
  Epee: '에페',
  Sabre: '사브르',
  Fleuret: '플뢰레',
};

const lessonModeMap: Record<string, string> = {
  offline: '오프라인',
  online: '온라인',
  hybrid: '온/오프라인',
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

const buildFencingHref = (tab: FencingTab) => {
  if (tab === 'all') return '/fencing';
  return `/fencing?tab=${tab}`;
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default async function FencingPage({ searchParams }: FencingPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const selectedTab = tabs.some((tab) => tab.value === resolvedSearchParams.tab)
    ? (resolvedSearchParams.tab as FencingTab)
    : 'all';

  const [competitionsResult, clubsResult, classesResult, lessonsResult] = await Promise.all([
    supabase
      .from('competitions')
      .select('id, title, date, location, bracket_image_url, result_data')
      .order('date', { ascending: true })
      .limit(20),
    supabase
      .from('fencing_clubs')
      .select('id, owner_id, name, city, address, phone, description')
      .order('created_at', { ascending: false })
      .limit(24),
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
      .limit(24),
    supabase
      .from('fencing_lesson_products')
      .select(`
        id,
        coach_id,
        title,
        description,
        price,
        lesson_mode,
        location_text,
        weapon_type,
        duration_minutes,
        max_students,
        profiles:coach_id (username)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(24),
  ]);

  if (competitionsResult.error) {
    console.error('Error fetching competitions:', competitionsResult.error);
  }
  if (clubsResult.error) {
    console.error('Error fetching fencing clubs:', clubsResult.error);
  }
  if (classesResult.error) {
    console.error('Error fetching fencing classes:', classesResult.error);
  }
  if (lessonsResult.error) {
    console.error('Error fetching fencing lessons:', lessonsResult.error);
  }

  const competitions = (competitionsResult.data || []) as CompetitionRow[];
  const clubs = (clubsResult.data || []) as ClubRow[];
  const classes = (classesResult.data || []) as ClubClassRow[];
  const lessons = (lessonsResult.data || []) as LessonRow[];

  const classIds = classes.map((item) => item.id);
  const lessonIds = lessons.map((item) => item.id);

  const [myReservationsResult, myLessonOrdersResult] = await Promise.all([
    user && classIds.length > 0
      ? supabase
          .from('fencing_class_reservations')
          .select('class_id')
          .eq('user_id', user.id)
          .in('class_id', classIds)
      : Promise.resolve({ data: [], error: null }),
    user && lessonIds.length > 0
      ? supabase
          .from('fencing_lesson_orders')
          .select('lesson_id')
          .eq('buyer_id', user.id)
          .in('lesson_id', lessonIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (myReservationsResult.error) {
    console.error('Error fetching my class reservations:', myReservationsResult.error);
  }
  if (myLessonOrdersResult.error) {
    console.error('Error fetching my lesson orders:', myLessonOrdersResult.error);
  }

  const myReservedClassIds = new Set(
    ((myReservationsResult.data || []) as ReservationRow[]).map((row) => row.class_id)
  );
  const myLessonOrderIds = new Set(
    ((myLessonOrdersResult.data || []) as LessonOrderRow[]).map((row) => row.lesson_id)
  );

  const classCountByClub = new Map<string, number>();
  for (const item of classes) {
    classCountByClub.set(item.club_id, (classCountByClub.get(item.club_id) || 0) + 1);
  }

  const fencingSchemaMissing = [clubsResult.error, classesResult.error, lessonsResult.error].some(
    (error) => error?.code === '42P01'
  );

  const showSection = (section: Exclude<FencingTab, 'all'>) =>
    selectedTab === 'all' || selectedTab === section;

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

      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={buildFencingHref(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedTab === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="px-4 py-4 space-y-6">
        {fencingSchemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">펜싱 확장 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">
              `migration.sql`의 펜싱 섹션 SQL을 적용하면 클럽/클래스/레슨 기능이 활성화됩니다.
            </p>
          </section>
        ) : null}

        {showSection('competitions') ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">대회 정보</h2>
              <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                {competitions.length}건
              </Badge>
            </div>

            {competitions.length > 0 ? (
              <div className="space-y-2">
                {competitions.map((competition) => {
                  const hasResult = Boolean(competition.result_data || competition.bracket_image_url);

                  return (
                    <article
                      key={competition.id}
                      className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{competition.title}</p>
                        <Badge
                          className={
                            hasResult
                              ? 'border-gray-700 bg-gray-800/60 text-gray-300'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          }
                        >
                          {hasResult ? '결과 등록' : '예정'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{competition.location}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(competition.date)}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-8 text-center text-sm text-gray-500">
                등록된 대회가 없습니다.
              </div>
            )}
          </section>
        ) : null}

        {showSection('clubs') ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">클럽 위치 및 정보</h2>
              <Badge className="border-white/10 bg-gray-900 text-gray-300">{clubs.length}개</Badge>
            </div>

            {clubs.length > 0 ? (
              <div className="space-y-2">
                {clubs.map((club) => (
                  <article
                    key={club.id}
                    className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{club.name}</p>
                        <p className="text-xs text-gray-400">{club.city}</p>
                      </div>
                      <Badge className="border-white/10 bg-gray-900 text-gray-300">
                        클래스 {classCountByClub.get(club.id) || 0}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-300">{club.description || '클럽 소개가 아직 등록되지 않았습니다.'}</p>
                    <p className="text-xs text-gray-500">{club.address}</p>
                    {club.phone ? <p className="text-xs text-gray-500">전화: {club.phone}</p> : null}

                    <div className="flex gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                      >
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${club.name} ${club.address}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          지도 보기
                        </a>
                      </Button>

                      {club.owner_id ? (
                        <StartChatButton
                          targetUserId={club.owner_id}
                          contextTitle={club.name}
                          openingMessage={`${club.name} 클럽 문의드립니다.`}
                          loginNext="/fencing?tab=clubs"
                          label="클럽 채팅"
                          size="sm"
                          variant="ghost"
                          className="text-gray-300 hover:text-white"
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-8 text-center text-sm text-gray-500">
                등록된 클럽 정보가 없습니다.
              </div>
            )}
          </section>
        ) : null}

        {showSection('classes') ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">클래스 예약</h2>
              <Badge className="border-white/10 bg-gray-900 text-gray-300">{classes.length}개</Badge>
            </div>

            {classes.length > 0 ? (
              <div className="space-y-2">
                {classes.map((classItem) => {
                  const club = pickOne(classItem.fencing_clubs);
                  const coach = pickOne(classItem.profiles);
                  const contactUserId = classItem.coach_id || club?.owner_id || null;
                  const isClosed = classItem.status !== 'open';

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

                      {classItem.description ? (
                        <p className="text-xs text-gray-300">{classItem.description}</p>
                      ) : null}

                      <div className="flex gap-2">
                        <ClassReservationButton
                          classId={classItem.id}
                          classTitle={classItem.title}
                          initialReserved={myReservedClassIds.has(classItem.id)}
                          loginNext="/fencing?tab=classes"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        />
                        {contactUserId ? (
                          <StartChatButton
                            targetUserId={contactUserId}
                            contextTitle={classItem.title}
                            openingMessage={`${classItem.title} 클래스 문의드립니다.`}
                            loginNext="/fencing?tab=classes"
                            label="문의 채팅"
                            size="default"
                            variant="outline"
                            className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                          />
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-8 text-center text-sm text-gray-500">
                예약 가능한 클래스가 없습니다.
              </div>
            )}
          </section>
        ) : null}

        {showSection('lessons') ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">레슨 마켓</h2>
              <Badge className="border-white/10 bg-gray-900 text-gray-300">{lessons.length}개</Badge>
            </div>

            {lessons.length > 0 ? (
              <div className="space-y-2">
                {lessons.map((lesson) => {
                  const coach = pickOne(lesson.profiles);

                  return (
                    <article
                      key={lesson.id}
                      className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{lesson.title}</p>
                          <p className="text-xs text-gray-400">코치: {coach?.username || '알 수 없음'}</p>
                        </div>
                        <Badge className="border-white/10 bg-gray-900 text-gray-300">
                          {lessonModeMap[lesson.lesson_mode] || lesson.lesson_mode}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                        {lesson.weapon_type ? <span>{weaponLabelMap[lesson.weapon_type] || lesson.weapon_type}</span> : null}
                        <span>• {lesson.duration_minutes}분</span>
                        <span>• 최대 {lesson.max_students}명</span>
                        {lesson.location_text ? <span>• {lesson.location_text}</span> : null}
                      </div>

                      <p className="text-sm font-semibold text-emerald-400">
                        {lesson.price.toLocaleString('ko-KR')}원
                      </p>

                      {lesson.description ? (
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{lesson.description}</p>
                      ) : null}

                      <div className="flex gap-2">
                        <StartChatButton
                          targetUserId={lesson.coach_id}
                          contextTitle={lesson.title}
                          openingMessage={`${lesson.title} 레슨 문의드립니다.`}
                          loginNext="/fencing?tab=lessons"
                          label="레슨 문의"
                          size="default"
                          variant="outline"
                          className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                        />
                        <LessonOrderButton
                          lessonId={lesson.id}
                          lessonTitle={lesson.title}
                          coachId={lesson.coach_id}
                          currentUserId={user?.id || null}
                          initialOrdered={myLessonOrderIds.has(lesson.id)}
                          loginNext="/fencing?tab=lessons"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-8 text-center text-sm text-gray-500 space-y-2">
                <p>등록된 레슨이 없습니다.</p>
                <p className="text-xs text-gray-600">전문 선수가 직접 레슨을 등록해 거래를 시작할 수 있습니다.</p>
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
