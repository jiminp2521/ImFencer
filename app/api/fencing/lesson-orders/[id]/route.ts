import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LessonOrderStatus = 'requested' | 'accepted' | 'rejected' | 'paid' | 'cancelled' | 'completed';

type PatchBody = {
  status?: LessonOrderStatus;
};

type LessonRef = {
  title: string | null;
} | { title: string | null }[] | null;

type OrderRow = {
  id: string;
  buyer_id: string;
  status: string;
  fencing_lesson_products: LessonRef;
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const allowedStatus: LessonOrderStatus[] = ['requested', 'accepted', 'rejected', 'paid', 'cancelled', 'completed'];

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  const nextStatus = body?.status;

  if (!nextStatus || !allowedStatus.includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: order, error: orderError } = await supabase
      .from('fencing_lesson_orders')
      .select(
        `
        id,
        buyer_id,
        status,
        fencing_lesson_products:lesson_id (title)
      `
      )
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('fencing_lesson_orders')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating lesson order status:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    const typedOrder = order as unknown as OrderRow;
    const lessonRef = pickOne(typedOrder.fencing_lesson_products);
    const lessonTitle = lessonRef?.title || '레슨';

    const statusTextMap: Record<LessonOrderStatus, string> = {
      requested: '접수',
      accepted: '승인',
      rejected: '거절',
      paid: '결제 완료',
      cancelled: '취소',
      completed: '완료',
    };

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: typedOrder.buyer_id,
      actor_id: user.id,
      type: 'order',
      title: `레슨 신청이 ${statusTextMap[nextStatus]}되었습니다.`,
      body: lessonTitle,
      link: '/activity',
    });

    if (notificationError) {
      console.error('Error creating lesson order status notification:', notificationError);
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error('PATCH /api/fencing/lesson-orders/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

