'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type LessonInfo = {
  id: string;
  title: string;
  coach_id: string;
};

export default function LessonReviewWritePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonInfo | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [content, setContent] = useState('');
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/fencing/lessons/${lessonId}/review`, { method: 'GET' });

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/fencing/lessons/${lessonId}/review`)}`);
        return;
      }

      if (!response.ok) {
        setError('레슨 정보를 불러올 수 없습니다.');
        setLoading(false);
        return;
      }

      const body = (await response.json()) as {
        canReview: boolean;
        reason?: string;
        lesson?: { id: string; title: string; coachId?: string };
        review?: { rating: number; content: string } | null;
      };

      if (!body.lesson) {
        setError('레슨 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      setLesson({
        id: body.lesson.id,
        title: body.lesson.title,
        coach_id: body.lesson.coachId || '',
      });

      if (!body.canReview) {
        if (body.reason === 'OWN_LESSON') {
          setError('본인 레슨에는 후기를 작성할 수 없습니다.');
        } else if (body.reason === 'NO_ORDER') {
          setError('신청한 레슨에만 후기를 작성할 수 있습니다.');
        } else {
          setError('후기 작성이 불가능합니다.');
        }
        setLoading(false);
        return;
      }

      setCanReview(true);
      if (body.review) {
        setRating(body.review.rating || 5);
        setContent(body.review.content || '');
      }

      setLoading(false);
    };

    load();
  }, [lessonId, router]);

  const submitReview = async () => {
    if (saving || !lesson || !canReview) return;
    setSaving(true);

    try {
      const trimmedContent = content.trim();
      const response = await fetch(`/api/fencing/lessons/${lesson.id}/review`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          content: trimmedContent || null,
        }),
      });

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/fencing/lessons/${lesson.id}/review`)}`);
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Error submitting lesson review:', body);
        alert('후기 저장에 실패했습니다.');
        return;
      }

      alert('후기가 저장되었습니다.');
      router.push('/fencing/lessons');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/fencing/lessons" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">레슨 후기 작성</h1>
      </header>

      <main className="px-4 py-5 space-y-4">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-16 text-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
            <p>후기 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-8 text-center space-y-3">
            <p className="text-sm font-semibold text-red-300">{error}</p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/fencing/lessons">레슨 목록으로</Link>
            </Button>
          </div>
        ) : (
          <section className="rounded-xl border border-white/10 bg-gray-950 px-4 py-4 space-y-4">
            <div>
              <p className="text-sm text-gray-400">대상 레슨</p>
              <p className="text-lg font-semibold text-white">{lesson?.title || '레슨'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-300">평점</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                      rating >= value
                        ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                        : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                    }`}
                    aria-label={`${value}점`}
                  >
                    <Star className={`h-4 w-4 ${rating >= value ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className="text-sm text-amber-300">{rating}점</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-300">후기 내용</p>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="수업 만족도, 코치 피드백, 추천 포인트를 남겨주세요."
                className="min-h-[160px] border-gray-800 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                maxLength={1000}
              />
              <p className="text-[11px] text-gray-600">{content.length}/1000</p>
            </div>

            <Button
              type="button"
              onClick={submitReview}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>후기 저장</span>
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
