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
  coach_id: string;
  title: string;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id: lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: lessonRow, error: lessonError } = await supabase
      .from('fencing_lesson_products')
      .select('id, coach_id, title')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lessonRow) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = lessonRow as LessonRow;

    if (lesson.coach_id === user.id) {
      return NextResponse.json({ error: 'Cannot order your own lesson' }, { status: 400 });
    }

    const { error } = await supabase.from('fencing_lesson_orders').insert({
      lesson_id: lessonId,
      buyer_id: user.id,
      status: 'requested',
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, ordered: true, duplicate: true });
      }

      console.error('Error creating lesson order:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: lesson.coach_id,
      actor_id: user.id,
      type: 'order',
      title: '새 레슨 신청이 도착했습니다.',
      body: lesson.title,
      link: '/activity?view=manage',
    });

    if (notificationError) {
      console.error('Error creating lesson order notification:', notificationError);
    }

    return NextResponse.json({ ok: true, ordered: true });
  } catch (error) {
    console.error('POST /api/fencing/lessons/[id]/orders failed:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

