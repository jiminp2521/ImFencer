import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getTossWebhookSecret, verifyTossWebhookRequest } from '@/lib/toss';

type TossWebhookPayload = {
  eventType?: string;
  type?: string;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type PaymentLogRow = {
  id: string;
  reservation_id: string | null;
  status: string;
};

const extractPayloadData = (payload: TossWebhookPayload) => {
  const eventType = String(payload.eventType || payload.type || '').trim();
  const data = ((payload.data && typeof payload.data === 'object') ? payload.data : payload) as Record<
    string,
    unknown
  >;

  const orderId = typeof data.orderId === 'string' ? data.orderId : '';
  const paymentKey = typeof data.paymentKey === 'string' ? data.paymentKey : null;
  const rawStatus = typeof data.status === 'string' ? data.status.toUpperCase() : '';
  const totalAmount = Number(data.totalAmount ?? data.amount ?? 0);
  const method = typeof data.method === 'string' ? data.method : null;
  const approvedAt = typeof data.approvedAt === 'string' ? data.approvedAt : null;

  return {
    eventType,
    data,
    orderId,
    paymentKey,
    rawStatus,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
    method,
    approvedAt,
  };
};

const mapWebhookStatus = (eventType: string, rawStatus: string) => {
  const normalizedEvent = eventType.toUpperCase();
  if (rawStatus === 'DONE' || rawStatus === 'PAID' || normalizedEvent.includes('DONE')) {
    return 'paid' as const;
  }
  if (rawStatus === 'CANCELED' || rawStatus === 'CANCELLED' || normalizedEvent.includes('CANCELED')) {
    return 'cancelled' as const;
  }
  if (rawStatus === 'ABORTED' || rawStatus === 'FAILED' || normalizedEvent.includes('FAIL')) {
    return 'failed' as const;
  }
  return 'webhook_received' as const;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get('x-toss-signature') ||
    request.headers.get('tosspayments-webhook-signature') ||
    request.headers.get('tosspayments-signature');

  let payload: TossWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TossWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const webhookSecret = getTossWebhookSecret();
  const secretHeader = request.headers.get('x-imfencer-webhook-secret');
  const payloadSecret = typeof payload.secret === 'string' ? payload.secret : null;

  const isCustomSecretValid = Boolean(webhookSecret && secretHeader && webhookSecret === secretHeader);
  const isPayloadSecretValid = Boolean(webhookSecret && payloadSecret && webhookSecret === payloadSecret);
  const signatureVerification = verifyTossWebhookRequest(rawBody, signatureHeader);

  if (!isCustomSecretValid && !isPayloadSecretValid && !signatureVerification.ok) {
    return NextResponse.json(
      {
        error: 'Invalid webhook signature',
        reason: signatureVerification.reason,
      },
      { status: 401 }
    );
  }

  const parsed = extractPayloadData(payload);
  if (!parsed.orderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    console.error('Service role client init failed in toss webhook:', error);
    return NextResponse.json({ error: 'Payment is not configured' }, { status: 500 });
  }
  const { data: paymentLogData, error: paymentLogError } = await supabaseAdmin
    .from('payment_logs')
    .select('id, reservation_id, status')
    .eq('order_id', parsed.orderId)
    .maybeSingle();

  if (paymentLogError || !paymentLogData) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'payment-log-not-found' });
  }

  const paymentLog = paymentLogData as PaymentLogRow;
  const nowIso = new Date().toISOString();
  const mappedStatus = mapWebhookStatus(parsed.eventType, parsed.rawStatus);

  const updatePayload: Record<string, unknown> = {
    status: mappedStatus,
    updated_at: nowIso,
    metadata: payload,
  };

  if (parsed.paymentKey) updatePayload.payment_key = parsed.paymentKey;
  if (parsed.method) updatePayload.method = parsed.method;
  if (mappedStatus === 'paid') {
    updatePayload.paid_at = parsed.approvedAt || nowIso;
    updatePayload.failure_code = null;
    updatePayload.failure_message = null;
  } else if (mappedStatus === 'failed' || mappedStatus === 'cancelled') {
    updatePayload.failure_code = 'WEBHOOK_STATUS';
    updatePayload.failure_message = `${parsed.eventType || 'UNKNOWN_EVENT'}:${parsed.rawStatus || 'UNKNOWN_STATUS'}`;
  }

  const { error: paymentUpdateError } = await supabaseAdmin
    .from('payment_logs')
    .update(updatePayload)
    .eq('id', paymentLog.id);

  if (paymentUpdateError) {
    console.error('Failed to update payment log from webhook:', paymentUpdateError);
    return NextResponse.json({ error: 'Failed to update payment log' }, { status: 500 });
  }

  if (paymentLog.reservation_id) {
    if (mappedStatus === 'paid') {
      await supabaseAdmin
        .from('fencing_class_reservations')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_confirmed_at: parsed.approvedAt || nowIso,
          updated_at: nowIso,
        })
        .eq('id', paymentLog.reservation_id);
    } else if (mappedStatus === 'failed' || mappedStatus === 'cancelled') {
      await supabaseAdmin
        .from('fencing_class_reservations')
        .update({
          payment_status: mappedStatus === 'cancelled' ? 'cancelled' : 'failed',
          updated_at: nowIso,
        })
        .eq('id', paymentLog.reservation_id);
    }
  }

  return NextResponse.json({ ok: true });
}
