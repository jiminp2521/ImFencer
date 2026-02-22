import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { confirmTossPayment } from '@/lib/toss';
import { createNotificationAndPush } from '@/lib/notifications';

type ConfirmBody = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
};

type PaymentLogRow = {
  id: string;
  order_id: string;
  payment_key: string | null;
  user_id: string;
  class_id: string | null;
  reservation_id: string | null;
  status: string;
  amount: number;
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ConfirmBody | null;
  const paymentKey = body?.paymentKey?.trim() || '';
  const orderId = body?.orderId?.trim() || '';
  const amount = Number(body?.amount);

  if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    console.error('Service role client init failed in toss confirm:', error);
    return NextResponse.json({ error: 'Payment is not configured' }, { status: 500 });
  }
  const { data: paymentLogData, error: paymentLogError } = await supabaseAdmin
    .from('payment_logs')
    .select('id, order_id, payment_key, user_id, class_id, reservation_id, status, amount')
    .eq('order_id', orderId)
    .maybeSingle();

  if (paymentLogError || !paymentLogData) {
    console.error('Payment log not found for confirm:', paymentLogError);
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const paymentLog = paymentLogData as PaymentLogRow;

  if (paymentLog.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (paymentLog.status === 'paid' && paymentLog.payment_key) {
    return NextResponse.json({
      ok: true,
      alreadyConfirmed: true,
      orderId,
      redirectPath: '/activity',
    });
  }

  if (paymentLog.amount !== amount) {
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from('payment_logs')
      .update({
        status: 'failed',
        failure_code: 'AMOUNT_MISMATCH',
        failure_message: `Expected ${paymentLog.amount}, got ${amount}`,
        updated_at: nowIso,
      })
      .eq('id', paymentLog.id);

    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const confirmResult = await confirmTossPayment({ paymentKey, orderId, amount });
  const nowIso = new Date().toISOString();

  if (!confirmResult.ok) {
    await supabaseAdmin
      .from('payment_logs')
      .update({
        status: 'failed',
        failure_code: confirmResult.error.code || 'TOSS_CONFIRM_FAILED',
        failure_message: confirmResult.error.message || 'Failed to confirm payment',
        metadata: confirmResult.error,
        updated_at: nowIso,
      })
      .eq('id', paymentLog.id);

    if (paymentLog.reservation_id) {
      await supabaseAdmin
        .from('fencing_class_reservations')
        .update({
          payment_status: 'failed',
          updated_at: nowIso,
        })
        .eq('id', paymentLog.reservation_id);
    }

    return NextResponse.json(
      { error: confirmResult.error.message || 'Payment confirmation failed' },
      { status: 400 }
    );
  }

  const confirmed = confirmResult.data;

  await supabaseAdmin
    .from('payment_logs')
    .update({
      status: 'paid',
      payment_key: confirmed.paymentKey,
      method: confirmed.method || null,
      paid_at: confirmed.approvedAt || nowIso,
      metadata: confirmed,
      failure_code: null,
      failure_message: null,
      updated_at: nowIso,
    })
    .eq('id', paymentLog.id);

  if (paymentLog.reservation_id) {
    await supabaseAdmin
      .from('fencing_class_reservations')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_confirmed_at: confirmed.approvedAt || nowIso,
        updated_at: nowIso,
      })
      .eq('id', paymentLog.reservation_id);
  }

  if (paymentLog.class_id) {
    const { data: classData } = await supabaseAdmin
      .from('fencing_club_classes')
      .select(
        `
        id,
        title,
        coach_id,
        fencing_clubs:club_id (owner_id)
      `
      )
      .eq('id', paymentLog.class_id)
      .maybeSingle();

    const classItem = (classData || null) as ClassRow | null;
    const club = classItem ? pickOne(classItem.fencing_clubs) : null;
    const managerUserId = classItem?.coach_id || club?.owner_id || null;

    if (managerUserId && managerUserId !== user.id) {
      await createNotificationAndPush({
        userId: managerUserId,
        actorId: user.id,
        type: 'reservation',
        title: '클래스 결제가 완료되어 예약이 확정되었습니다.',
        body: classItem?.title || '클래스',
        link: '/activity?view=manage',
        dedupeKey: `class-payment-confirmed:${orderId}:${managerUserId}`,
      });
    }

    await createNotificationAndPush({
      userId: user.id,
      actorId: managerUserId || null,
      type: 'reservation',
      title: '결제가 완료되어 예약이 확정되었습니다.',
      body: classItem?.title || '클래스',
      link: '/activity',
      dedupeKey: `class-payment-user-confirmed:${orderId}:${user.id}`,
      notifySelf: true,
    });
  }

  return NextResponse.json({
    ok: true,
    orderId,
    redirectPath: '/activity',
  });
}
