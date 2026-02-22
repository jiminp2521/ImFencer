import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

type FailBody = {
  orderId?: string;
  code?: string;
  message?: string;
};

type PaymentLogRow = {
  id: string;
  reservation_id: string | null;
  user_id: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FailBody | null;
  const orderId = body?.orderId?.trim() || '';
  const code = body?.code?.trim().slice(0, 120) || 'PAYMENT_FAILED';
  const message = body?.message?.trim().slice(0, 500) || 'Payment failed';

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
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
    console.error('Service role client init failed in toss fail:', error);
    return NextResponse.json({ error: 'Payment is not configured' }, { status: 500 });
  }
  const { data: paymentLogData, error: paymentLogError } = await supabaseAdmin
    .from('payment_logs')
    .select('id, reservation_id, user_id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (paymentLogError || !paymentLogData) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const paymentLog = paymentLogData as PaymentLogRow;
  if (paymentLog.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { error: logUpdateError } = await supabaseAdmin
    .from('payment_logs')
    .update({
      status: 'failed',
      failure_code: code,
      failure_message: message,
      updated_at: nowIso,
    })
    .eq('id', paymentLog.id);

  if (logUpdateError) {
    console.error('Failed to update payment fail state:', logUpdateError);
    return NextResponse.json({ error: 'Failed to update payment log' }, { status: 500 });
  }

  if (paymentLog.reservation_id) {
    const { error: reservationError } = await supabaseAdmin
      .from('fencing_class_reservations')
      .update({
        payment_status: 'failed',
        updated_at: nowIso,
      })
      .eq('id', paymentLog.reservation_id);

    if (reservationError) {
      console.error('Failed to update reservation fail state:', reservationError);
    }
  }

  return NextResponse.json({ ok: true });
}
