import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

type TossConfirmRequest = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

type TossConfirmSuccess = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string | null;
  approvedAt?: string | null;
  [key: string]: unknown;
};

type TossConfirmFailure = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

export type TossConfirmResult =
  | { ok: true; data: TossConfirmSuccess }
  | { ok: false; status: number; error: TossConfirmFailure };

export function getTossClientKey() {
  return process.env.TOSS_CLIENT_KEY?.trim() || '';
}

export function getTossSecretKey() {
  return process.env.TOSS_SECRET_KEY?.trim() || '';
}

export function getTossWebhookSecret() {
  return process.env.TOSS_WEBHOOK_SECRET?.trim() || '';
}

export async function confirmTossPayment({
  paymentKey,
  orderId,
  amount,
}: TossConfirmRequest): Promise<TossConfirmResult> {
  const secretKey = getTossSecretKey();
  if (!secretKey) {
    return {
      ok: false,
      status: 500,
      error: { code: 'MISSING_TOSS_SECRET_KEY', message: 'TOSS_SECRET_KEY is not configured' },
    };
  }

  const authorization = Buffer.from(`${secretKey}:`).toString('base64');
  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  });

  const json = (await response.json().catch(() => null)) as
    | TossConfirmSuccess
    | TossConfirmFailure
    | null;

  if (!response.ok || !json) {
    return {
      ok: false,
      status: response.status,
      error:
        (json as TossConfirmFailure | null) || {
          code: 'TOSS_CONFIRM_FAILED',
          message: 'Failed to confirm payment',
        },
    };
  }

  return {
    ok: true,
    data: json as TossConfirmSuccess,
  };
}

export function verifyTossWebhookRequest(rawBody: string, signatureHeader: string | null) {
  const webhookSecret = getTossWebhookSecret();
  if (!webhookSecret) {
    return { ok: false, reason: 'missing-webhook-secret' as const };
  }

  if (!signatureHeader) {
    return { ok: false, reason: 'missing-signature-header' as const };
  }

  // Expected format: sha256=<hex|base64>. We support both values for operational flexibility.
  const cleanedSignature = signatureHeader.replace(/^sha256=/i, '').trim();
  const hmacHex = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const hmacBase64 = createHmac('sha256', webhookSecret).update(rawBody).digest('base64');

  const signatureCandidates = [hmacHex, hmacBase64];

  const isValid = signatureCandidates.some((candidate) => {
    try {
      const a = Buffer.from(candidate);
      const b = Buffer.from(cleanedSignature);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });

  if (!isValid) {
    return { ok: false, reason: 'signature-mismatch' as const };
  }

  return { ok: true };
}
