import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { calculatePlatformFee, getActivePlatformSettings } from '@/lib/platform-settings';
import { createNotificationAndPush } from '@/lib/notifications';
import { getTossClientKey } from '@/lib/toss';

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
  price: number;
  status: 'open' | 'closed' | 'cancelled';
  coach_id: string | null;
  fencing_clubs: ClubRef;
};

type ReservationRow = {
  id: string;
  class_id: string;
  user_id: string;
  status: 'requested' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
};

type ProfileRow = {
  username: string | null;
};

const pickOne = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const makeOrderId = (classId: string) =>
  `cls_${classId.replace(/-/g, '').slice(0, 12)}_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

export async function POST(request: Request, { params }: RouteContext) {
  const { id: classId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tossClientKey = getTossClientKey();
  if (!tossClientKey) {
    return NextResponse.json({ error: 'TOSS_CLIENT_KEY is not configured' }, { status: 500 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    console.error('Service role client init failed in prepare:', error);
    return NextResponse.json({ error: 'Payment is not configured' }, { status: 500 });
  }
  await ensureProfileRow(supabase, user.id);

  const [{ data: classData, error: classError }, { data: profileData }] = await Promise.all([
    supabaseAdmin
      .from('fencing_club_classes')
      .select(
        `
        id,
        title,
        price,
        status,
        coach_id,
        fencing_clubs:club_id (owner_id)
      `
      )
      .eq('id', classId)
      .single(),
    supabaseAdmin.from('profiles').select('username').eq('id', user.id).maybeSingle(),
  ]);

  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  const classItem = classData as unknown as ClassRow;
  if (classItem.status !== 'open') {
    return NextResponse.json({ error: 'Class is not available' }, { status: 400 });
  }

  const amount = Math.max(0, Number(classItem.price) || 0);
  const nowIso = new Date().toISOString();

  const { data: existingReservation, error: existingReservationError } = await supabaseAdmin
    .from('fencing_class_reservations')
    .select('id, class_id, user_id, status, payment_status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingReservationError) {
    console.error('Failed to read reservation:', existingReservationError);
    return NextResponse.json({ error: 'Failed to prepare reservation' }, { status: 500 });
  }

  const typedExisting = (existingReservation || null) as ReservationRow | null;
  if (typedExisting?.status === 'confirmed' && typedExisting.payment_status === 'paid') {
    return NextResponse.json({
      ok: true,
      alreadyConfirmed: true,
      reservationId: typedExisting.id,
    });
  }

  let reservationId = typedExisting?.id || null;
  if (!reservationId) {
    const { data: insertedReservation, error: insertReservationError } = await supabaseAdmin
      .from('fencing_class_reservations')
      .insert({
        class_id: classId,
        user_id: user.id,
        status: 'requested',
        payment_status: amount > 0 ? 'pending' : 'paid',
        payment_amount: amount,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single();

    if (insertReservationError || !insertedReservation) {
      console.error('Failed to create reservation:', insertReservationError);
      return NextResponse.json({ error: 'Failed to prepare reservation' }, { status: 500 });
    }
    reservationId = insertedReservation.id;
  }

  const club = pickOne(classItem.fencing_clubs);
  const managerUserId = classItem.coach_id || club?.owner_id || null;

  if (amount === 0) {
    const { error: confirmReservationError } = await supabaseAdmin
      .from('fencing_class_reservations')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_amount: 0,
        payment_confirmed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', reservationId);

    if (confirmReservationError) {
      console.error('Failed to confirm free reservation:', confirmReservationError);
      return NextResponse.json({ error: 'Failed to confirm reservation' }, { status: 500 });
    }

    if (managerUserId && managerUserId !== user.id) {
      await createNotificationAndPush({
        userId: managerUserId,
        actorId: user.id,
        type: 'reservation',
        title: '새 클래스 예약이 확정되었습니다.',
        body: classItem.title,
        link: '/activity?view=manage',
        dedupeKey: `free-class-confirmed:${reservationId}`,
      });
    }

    return NextResponse.json({
      ok: true,
      free: true,
      reservationId,
    });
  }

  const platformSettings = await getActivePlatformSettings();
  const platformFee = calculatePlatformFee(amount, platformSettings.classFeeRate);
  const orderId = makeOrderId(classId);

  const { error: reservationUpdateError } = await supabaseAdmin
    .from('fencing_class_reservations')
    .update({
      status: 'requested',
      payment_status: 'pending',
      payment_amount: amount,
      payment_order_id: orderId,
      payment_confirmed_at: null,
      updated_at: nowIso,
    })
    .eq('id', reservationId);

  if (reservationUpdateError) {
    console.error('Failed to update reservation for payment:', reservationUpdateError);
    return NextResponse.json({ error: 'Failed to prepare reservation' }, { status: 500 });
  }

  const { error: paymentLogError } = await supabaseAdmin.from('payment_logs').insert({
    provider: 'toss',
    order_id: orderId,
    reservation_id: reservationId,
    class_id: classItem.id,
    user_id: user.id,
    status: 'ready',
    amount,
    currency: 'KRW',
    fee_rate: platformSettings.classFeeRate,
    platform_fee: platformFee,
    metadata: {
      classTitle: classItem.title,
    },
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (paymentLogError) {
    console.error('Failed to insert payment log:', paymentLogError);
    return NextResponse.json({ error: 'Failed to prepare payment' }, { status: 500 });
  }

  if (!typedExisting && managerUserId && managerUserId !== user.id) {
    await createNotificationAndPush({
      userId: managerUserId,
      actorId: user.id,
      type: 'reservation',
      title: '새 클래스 예약 요청이 도착했습니다.',
      body: classItem.title,
      link: '/activity?view=manage',
      dedupeKey: `class-reservation-request:${reservationId}`,
    });
  }

  const origin = new URL(request.url).origin;
  const profile = (profileData || null) as ProfileRow | null;

  return NextResponse.json({
    ok: true,
    checkout: {
      clientKey: tossClientKey,
      amount,
      orderId,
      orderName: `${classItem.title} 클래스 예약`,
      customerName: profile?.username || 'ImFencer User',
      customerEmail: user.email || undefined,
      successUrl: `${origin}/payments/toss/success`,
      failUrl: `${origin}/payments/toss/fail`,
    },
  });
}
