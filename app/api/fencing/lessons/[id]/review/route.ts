import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LessonRow = {
  id: string;
  title: string;
  coach_id: string;
};

type ReviewRow = {
  rating: number | null;
  content: string | null;
};

type UpsertBody = {
  rating?: number;
  content?: string | null;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id: lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [lessonResult, orderResult, reviewResult] = await Promise.all([
    supabase
      .from('fencing_lesson_products')
      .select('id, title, coach_id')
      .eq('id', lessonId)
      .maybeSingle(),
    supabase
      .from('fencing_lesson_orders')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('buyer_id', user.id)
      .maybeSingle(),
    supabase
      .from('fencing_lesson_reviews')
      .select('rating, content')
      .eq('lesson_id', lessonId)
      .eq('reviewer_id', user.id)
      .maybeSingle(),
  ]);

  if (lessonResult.error || !lessonResult.data) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const lesson = lessonResult.data as LessonRow;
  if (lesson.coach_id === user.id) {
    return NextResponse.json(
      { ok: true, canReview: false, reason: 'OWN_LESSON', lesson: { id: lesson.id, title: lesson.title } },
      { status: 200 }
    );
  }

  if (orderResult.error) {
    console.error('Error checking order for review:', orderResult.error);
    return NextResponse.json({ error: 'Failed to check order' }, { status: 500 });
  }

  if (!orderResult.data) {
    return NextResponse.json(
      { ok: true, canReview: false, reason: 'NO_ORDER', lesson: { id: lesson.id, title: lesson.title } },
      { status: 200 }
    );
  }

  const review = (reviewResult.data || null) as ReviewRow | null;

  return NextResponse.json({
    ok: true,
    canReview: true,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      coachId: lesson.coach_id,
    },
    review: review
      ? {
          rating: review.rating ?? 5,
          content: review.content ?? '',
        }
      : null,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id: lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UpsertBody | null;
  const rating = Number(body?.rating);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: lesson, error: lessonError } = await supabase
      .from('fencing_lesson_products')
      .select('id, title, coach_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.coach_id === user.id) {
      return NextResponse.json({ error: 'Cannot review own lesson' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('fencing_lesson_orders')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('buyer_id', user.id)
      .maybeSingle();

    if (orderError) {
      console.error('Error checking order for review:', orderError);
      return NextResponse.json({ error: 'Failed to check order' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order required' }, { status: 400 });
    }

    const { error: upsertError } = await supabase.from('fencing_lesson_reviews').upsert(
      {
        lesson_id: lessonId,
        reviewer_id: user.id,
        rating: Math.round(rating),
        content: content || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'lesson_id,reviewer_id',
      }
    );

    if (upsertError) {
      console.error('Error upserting lesson review:', upsertError);
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
    }

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: lesson.coach_id,
      actor_id: user.id,
      type: 'review',
      title: '레슨 후기가 등록되었습니다.',
      body: `${lesson.title} · ${Math.round(rating)}점`,
      link: '/fencing/lessons',
    });

    if (notificationError) {
      console.error('Error creating review notification:', notificationError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/fencing/lessons/[id]/review failed:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}

