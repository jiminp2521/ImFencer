import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { createNotificationAndPush } from '@/lib/notifications';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ClubRef = {
  owner_id: string | null;
} | { owner_id: string | null }[] | null;

type ClassRow = {
  id: string;
  title: string;
  coach_id: string | null;
  fencing_clubs: ClubRef;
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id: classId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: classRow, error: classError } = await supabase
      .from('fencing_club_classes')
      .select(
        `
        id,
        title,
        coach_id,
        fencing_clubs:club_id (owner_id)
      `
      )
      .eq('id', classId)
      .single();

    if (classError || !classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const typedClass = classRow as unknown as ClassRow;
    const club = pickOne(typedClass.fencing_clubs);
    const managerUserId = typedClass.coach_id || club?.owner_id || null;

    const { error } = await supabase.from('fencing_class_reservations').insert({
      class_id: classId,
      user_id: user.id,
      status: 'requested',
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, reserved: true, duplicate: true });
      }

      console.error('Error creating class reservation:', error);
      return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
    }

    if (managerUserId && managerUserId !== user.id) {
      await createNotificationAndPush({
        userId: managerUserId,
        actorId: user.id,
        type: 'reservation',
        title: '새 클래스 예약 요청이 도착했습니다.',
        body: typedClass.title,
        link: '/activity?view=manage',
        dedupeKey: `class-reservation-request:${classId}:${user.id}`,
      });
    }

    return NextResponse.json({ ok: true, reserved: true });
  } catch (error) {
    console.error('POST /api/fencing/classes/[id]/reservations failed:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
