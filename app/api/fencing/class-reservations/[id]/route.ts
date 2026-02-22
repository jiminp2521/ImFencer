import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { createNotificationAndPush } from '@/lib/notifications';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchBody = {
  status?: 'requested' | 'confirmed' | 'cancelled';
};

type ClassRef = {
  title: string | null;
} | { title: string | null }[] | null;

type ReservationRow = {
  id: string;
  user_id: string;
  status: string;
  fencing_club_classes: ClassRef;
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

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

  if (!nextStatus || !['requested', 'confirmed', 'cancelled'].includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: reservation, error: reservationError } = await supabase
      .from('fencing_class_reservations')
      .select(
        `
        id,
        user_id,
        status,
        fencing_club_classes:class_id (title)
      `
      )
      .eq('id', id)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const updatePayload: {
      status: PatchBody['status'];
      updated_at: string;
      payment_status?: 'cancelled';
    } = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (nextStatus === 'cancelled') {
      updatePayload.payment_status = 'cancelled';
    }

    const { error } = await supabase
      .from('fencing_class_reservations')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error updating class reservation status:', error);
      return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
    }

    const typedReservation = reservation as unknown as ReservationRow;
    const classRef = pickOne(typedReservation.fencing_club_classes);
    const classTitle = classRef?.title || '클래스';

    const statusText = nextStatus === 'confirmed' ? '확정' : nextStatus === 'cancelled' ? '취소' : '접수';
    await createNotificationAndPush({
      userId: typedReservation.user_id,
      actorId: user.id,
      type: 'reservation',
      title: `클래스 예약이 ${statusText}되었습니다.`,
      body: classTitle,
      link: '/activity',
      dedupeKey: `class-reservation-status:${typedReservation.id}:${nextStatus}`,
    });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error('PATCH /api/fencing/class-reservations/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
  }
}
