import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { LessonOrderButton } from '@/components/fencing/LessonOrderButton';

type ProfileRef = {
  username: string | null;
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

type LessonOrderRow = {
  lesson_id: string;
};

type LessonReviewRow = {
  lesson_id: string;
  rating: number;
};

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

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

export default async function FencingLessonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lessonsResult = await supabase
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
    .limit(120);

  if (lessonsResult.error) {
    console.error('Error fetching fencing lessons:', lessonsResult.error);
  }

  const lessons = (lessonsResult.data || []) as LessonRow[];
  const lessonIds = lessons.map((item) => item.id);

  const myLessonOrdersResult =
    user && lessonIds.length > 0
      ? await supabase
          .from('fencing_lesson_orders')
          .select('lesson_id')
          .eq('buyer_id', user.id)
          .in('lesson_id', lessonIds)
      : { data: [], error: null };

  if (myLessonOrdersResult.error) {
    console.error('Error fetching my lesson orders:', myLessonOrdersResult.error);
  }

  const myLessonOrderIds = new Set(
    ((myLessonOrdersResult.data || []) as LessonOrderRow[]).map((row) => row.lesson_id)
  );

  const [lessonReviewsResult, myLessonReviewsResult] = await Promise.all([
    lessonIds.length > 0
      ? supabase
          .from('fencing_lesson_reviews')
          .select('lesson_id, rating')
          .in('lesson_id', lessonIds)
      : Promise.resolve({ data: [], error: null }),
    user && lessonIds.length > 0
      ? supabase
          .from('fencing_lesson_reviews')
          .select('lesson_id')
          .eq('reviewer_id', user.id)
          .in('lesson_id', lessonIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (lessonReviewsResult.error && lessonReviewsResult.error.code !== '42P01') {
    console.error('Error fetching lesson reviews:', lessonReviewsResult.error);
  }
  if (myLessonReviewsResult.error && myLessonReviewsResult.error.code !== '42P01') {
    console.error('Error fetching my lesson reviews:', myLessonReviewsResult.error);
  }

  const ratingMap = new Map<string, { count: number; sum: number }>();
  for (const review of (lessonReviewsResult.data || []) as LessonReviewRow[]) {
    const current = ratingMap.get(review.lesson_id) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += review.rating;
    ratingMap.set(review.lesson_id, current);
  }

  const myReviewedLessonIds = new Set(
    ((myLessonReviewsResult.data || []) as { lesson_id: string }[]).map((row) => row.lesson_id)
  );

  const schemaMissing = lessonsResult.error?.code === '42P01';

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <Link href="/fencing" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-semibold text-white ml-2">레슨 찾기</h1>
        </div>
        <Button asChild size="sm" className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs">
          <Link href={user ? '/fencing/lessons/write' : '/login?next=%2Ffencing%2Flessons%2Fwrite'}>
            레슨 등록
          </Link>
        </Button>
      </header>

      <main className="px-4 py-4 space-y-2">
        {schemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">레슨 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">DB에 `migration.sql`의 펜싱 섹션을 반영해주세요.</p>
          </section>
        ) : null}

        {lessons.length > 0 ? (
          lessons.map((lesson) => {
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
                    <p className="text-[11px] text-amber-300">
                      {ratingMap.has(lesson.id)
                        ? `평점 ${(
                            ratingMap.get(lesson.id)!.sum / ratingMap.get(lesson.id)!.count
                          ).toFixed(1)} / 5 · 후기 ${ratingMap.get(lesson.id)!.count}개`
                        : '아직 후기가 없습니다.'}
                    </p>
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
                    loginNext="/fencing/lessons"
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
                    loginNext="/fencing/lessons"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  />
                  {user && user.id !== lesson.coach_id && myLessonOrderIds.has(lesson.id) ? (
                    <Button
                      asChild
                      variant="outline"
                      size="default"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    >
                      <Link href={`/fencing/lessons/${lesson.id}/review`}>
                        {myReviewedLessonIds.has(lesson.id) ? '후기 수정' : '후기 작성'}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-14 text-center text-sm text-gray-500 space-y-2">
            <p>등록된 레슨이 없습니다.</p>
            <p className="text-xs text-gray-600">전문 선수가 직접 레슨을 등록해 거래를 시작할 수 있습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
