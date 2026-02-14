import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { ClassReservationStatusActions } from '@/components/fencing/ClassReservationStatusActions';
import { LessonOrderStatusActions } from '@/components/fencing/LessonOrderStatusActions';

type ActivityPageProps = {
  searchParams: Promise<{
    view?: string;
  }>;
};

type ActivityView = 'mine' | 'manage';

type ClubRef = {
  name: string | null;
};

type ClassRef = {
  title: string;
  start_at: string;
  end_at: string;
  fencing_clubs: ClubRef | ClubRef[] | null;
};

type MyClassReservationRow = {
  id: string;
  class_id: string;
  status: 'requested' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string | null;
  fencing_club_classes: ClassRef | ClassRef[] | null;
};

type CoachRef = {
  username: string | null;
};

type LessonRef = {
  title: string;
  profiles: CoachRef | CoachRef[] | null;
};

type MyLessonOrderRow = {
  id: string;
  lesson_id: string;
  buyer_id: string;
  status: 'requested' | 'accepted' | 'rejected' | 'paid' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string | null;
  fencing_lesson_products: LessonRef | LessonRef[] | null;
};

type ReservationManageRow = {
  id: string;
  class_id: string;
  user_id: string;
  status: 'requested' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string | null;
};

type OrderManageRow = {
  id: string;
  lesson_id: string;
  buyer_id: string;
  status: 'requested' | 'accepted' | 'rejected' | 'paid' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type ClassTitleRow = {
  id: string;
  title: string;
};

type LessonTitleRow = {
  id: string;
  title: string;
};

const viewFilters: { label: string; value: ActivityView }[] = [
  { label: '내 신청/예약', value: 'mine' },
  { label: '운영 관리', value: 'manage' },
];

const reservationStatusLabelMap: Record<string, string> = {
  requested: '요청',
  confirmed: '확정',
  cancelled: '취소',
};

const orderStatusLabelMap: Record<string, string> = {
  requested: '요청',
  accepted: '승인',
  rejected: '거절',
  paid: '결제완료',
  cancelled: '취소',
  completed: '완료',
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const getStatusBadgeClass = (status: string) => {
  if (status === 'confirmed' || status === 'accepted' || status === 'paid' || status === 'completed') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'cancelled' || status === 'rejected') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Factivity');
  }

  const selectedView = viewFilters.some((filter) => filter.value === resolvedSearchParams.view)
    ? (resolvedSearchParams.view as ActivityView)
    : 'mine';

  const [myClassReservationsResult, myLessonOrdersResult, myOwnedClubsResult, myLessonsResult] = await Promise.all([
    supabase
      .from('fencing_class_reservations')
      .select(`
        id,
        class_id,
        status,
        created_at,
        updated_at,
        fencing_club_classes:class_id (
          title,
          start_at,
          end_at,
          fencing_clubs:club_id (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('fencing_lesson_orders')
      .select(`
        id,
        lesson_id,
        buyer_id,
        status,
        created_at,
        updated_at,
        fencing_lesson_products:lesson_id (
          title,
          profiles:coach_id (username)
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase.from('fencing_clubs').select('id').eq('owner_id', user.id),
    supabase.from('fencing_lesson_products').select('id, title').eq('coach_id', user.id),
  ]);

  if (myClassReservationsResult.error) {
    console.error('Error fetching my class reservations:', myClassReservationsResult.error);
  }
  if (myLessonOrdersResult.error) {
    console.error('Error fetching my lesson orders:', myLessonOrdersResult.error);
  }
  if (myOwnedClubsResult.error) {
    console.error('Error fetching my owned clubs:', myOwnedClubsResult.error);
  }
  if (myLessonsResult.error) {
    console.error('Error fetching my lesson products:', myLessonsResult.error);
  }

  const myClassReservations = (myClassReservationsResult.data || []) as MyClassReservationRow[];
  const myLessonOrders = (myLessonOrdersResult.data || []) as MyLessonOrderRow[];
  const ownedClubIds = new Set((myOwnedClubsResult.data || []).map((club) => club.id));
  const myManagedLessons = (myLessonsResult.data || []) as LessonTitleRow[];
  const managedLessonIds = myManagedLessons.map((lesson) => lesson.id);

  const [managedClassesByCoachResult, managedClassesByOwnedClubResult] = await Promise.all([
    supabase.from('fencing_club_classes').select('id, title').eq('coach_id', user.id),
    ownedClubIds.size > 0
      ? supabase.from('fencing_club_classes').select('id, title').in('club_id', Array.from(ownedClubIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (managedClassesByCoachResult.error) {
    console.error('Error fetching managed classes by coach:', managedClassesByCoachResult.error);
  }
  if (managedClassesByOwnedClubResult.error) {
    console.error('Error fetching managed classes by club:', managedClassesByOwnedClubResult.error);
  }

  const classTitleMap = new Map<string, string>();
  for (const item of [...(managedClassesByCoachResult.data || []), ...(managedClassesByOwnedClubResult.data || [])] as ClassTitleRow[]) {
    classTitleMap.set(item.id, item.title);
  }
  const managedClassIds = Array.from(classTitleMap.keys());
  const lessonTitleMap = new Map<string, string>();
  for (const lesson of myManagedLessons) {
    lessonTitleMap.set(lesson.id, lesson.title);
  }

  const [incomingReservationsResult, incomingLessonOrdersResult] = await Promise.all([
    managedClassIds.length > 0
      ? supabase
          .from('fencing_class_reservations')
          .select('id, class_id, user_id, status, created_at, updated_at')
          .in('class_id', managedClassIds)
          .order('created_at', { ascending: false })
          .limit(160)
      : Promise.resolve({ data: [], error: null }),
    managedLessonIds.length > 0
      ? supabase
          .from('fencing_lesson_orders')
          .select('id, lesson_id, buyer_id, status, created_at, updated_at')
          .in('lesson_id', managedLessonIds)
          .order('created_at', { ascending: false })
          .limit(160)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (incomingReservationsResult.error) {
    console.error('Error fetching incoming class reservations:', incomingReservationsResult.error);
  }
  if (incomingLessonOrdersResult.error) {
    console.error('Error fetching incoming lesson orders:', incomingLessonOrdersResult.error);
  }

  const incomingReservations = (incomingReservationsResult.data || []) as ReservationManageRow[];
  const incomingLessonOrders = (incomingLessonOrdersResult.data || []) as OrderManageRow[];

  const buyerUserIds = Array.from(
    new Set([
      ...incomingReservations.map((item) => item.user_id),
      ...incomingLessonOrders.map((item) => item.buyer_id),
    ])
  );
  const buyerProfilesResult =
    buyerUserIds.length > 0
      ? await supabase.from('profiles').select('id, username').in('id', buyerUserIds)
      : { data: [], error: null };

  if (buyerProfilesResult.error) {
    console.error('Error fetching buyer profile names:', buyerProfilesResult.error);
  }

  const buyerMap = new Map<string, string>();
  for (const profile of (buyerProfilesResult.data || []) as ProfileRow[]) {
    buyerMap.set(profile.id, profile.username || '알 수 없음');
  }

  const schemaMissing = [
    myClassReservationsResult.error,
    myLessonOrdersResult.error,
    myOwnedClubsResult.error,
    myLessonsResult.error,
  ].some((error) => error?.code === '42P01');

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">신청 · 예약 관리</h1>
      </header>

      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {viewFilters.map((filter) => (
            <Link
              key={filter.value}
              href={filter.value === 'mine' ? '/activity' : '/activity?view=manage'}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedView === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="px-4 py-4 space-y-6">
        {schemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">운영/거래 확장 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">DB에 `migration.sql` 최신 버전을 반영해주세요.</p>
          </section>
        ) : null}

        {selectedView === 'mine' ? (
          <>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">내 클래스 예약</h2>
                <Badge className="border-white/10 bg-gray-900 text-gray-300">{myClassReservations.length}건</Badge>
              </div>
              {myClassReservations.length > 0 ? (
                myClassReservations.map((item) => {
                  const classInfo = pickOne(item.fencing_club_classes);
                  const clubInfo = pickOne(classInfo?.fencing_clubs || null);
                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{classInfo?.title || '클래스'}</p>
                        <Badge className={getStatusBadgeClass(item.status)}>
                          {reservationStatusLabelMap[item.status] || item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{clubInfo?.name || '클럽 미지정'}</p>
                      <p className="text-xs text-gray-500">
                        {classInfo?.start_at ? `${formatDateTime(classInfo.start_at)} ~ ${formatDateTime(classInfo.end_at)}` : '일정 정보 없음'}
                      </p>
                      <p className="text-[11px] text-gray-600">신청일: {formatDateTime(item.created_at)}</p>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-10 text-center text-sm text-gray-500">
                  신청한 클래스 예약이 없습니다.
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">내 레슨 신청</h2>
                <Badge className="border-white/10 bg-gray-900 text-gray-300">{myLessonOrders.length}건</Badge>
              </div>
              {myLessonOrders.length > 0 ? (
                myLessonOrders.map((item) => {
                  const lessonInfo = pickOne(item.fencing_lesson_products);
                  const coachInfo = pickOne(lessonInfo?.profiles || null);
                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{lessonInfo?.title || '레슨'}</p>
                        <Badge className={getStatusBadgeClass(item.status)}>
                          {orderStatusLabelMap[item.status] || item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">코치: {coachInfo?.username || '알 수 없음'}</p>
                      <p className="text-[11px] text-gray-600">신청일: {formatDateTime(item.created_at)}</p>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-10 text-center text-sm text-gray-500">
                  신청한 레슨이 없습니다.
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">운영 클래스 예약 요청</h2>
                <Badge className="border-white/10 bg-gray-900 text-gray-300">{incomingReservations.length}건</Badge>
              </div>
              {incomingReservations.length > 0 ? (
                incomingReservations.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{classTitleMap.get(item.class_id) || '클래스'}</p>
                      <Badge className={getStatusBadgeClass(item.status)}>
                        {reservationStatusLabelMap[item.status] || item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">신청자: {buyerMap.get(item.user_id) || '알 수 없음'}</p>
                    <p className="text-[11px] text-gray-600">요청일: {formatDateTime(item.created_at)}</p>
                    <ClassReservationStatusActions
                      reservationId={item.id}
                      buyerId={item.user_id}
                      classTitle={classTitleMap.get(item.class_id) || '클래스'}
                      initialStatus={item.status}
                    />
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-10 text-center text-sm text-gray-500">
                  관리할 클래스 예약 요청이 없습니다.
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">내 레슨 신청 요청</h2>
                <Badge className="border-white/10 bg-gray-900 text-gray-300">{incomingLessonOrders.length}건</Badge>
              </div>
              {incomingLessonOrders.length > 0 ? (
                incomingLessonOrders.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{lessonTitleMap.get(item.lesson_id) || '레슨'}</p>
                      <Badge className={getStatusBadgeClass(item.status)}>
                        {orderStatusLabelMap[item.status] || item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">신청자: {buyerMap.get(item.buyer_id) || '알 수 없음'}</p>
                    <p className="text-[11px] text-gray-600">요청일: {formatDateTime(item.created_at)}</p>
                    <LessonOrderStatusActions
                      orderId={item.id}
                      buyerId={item.buyer_id}
                      lessonTitle={lessonTitleMap.get(item.lesson_id) || '레슨'}
                      initialStatus={item.status}
                    />
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-10 text-center text-sm text-gray-500">
                  관리할 레슨 신청 요청이 없습니다.
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
