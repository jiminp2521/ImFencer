'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

type ConfirmResult = {
  ok?: boolean;
  alreadyConfirmed?: boolean;
  redirectPath?: string;
  error?: string;
};

export default function TossPaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('결제 확인 중입니다...');

  const paymentKey = searchParams.get('paymentKey') || '';
  const orderId = searchParams.get('orderId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    let active = true;

    const confirmPayment = async () => {
      if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
        setState('error');
        setMessage('결제 확인 파라미터가 올바르지 않습니다.');
        return;
      }

      const response = await fetch('/api/payments/toss/confirm', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      });

      if (!active) return;

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/payments/toss/success?${queryString}`)}`);
        return;
      }

      const body = (await response.json().catch(() => null)) as ConfirmResult | null;
      if (!response.ok || !body?.ok) {
        setState('error');
        setMessage(body?.error || '결제 확인에 실패했습니다.');
        return;
      }

      setState('done');
      setMessage(body.alreadyConfirmed ? '이미 결제가 확인된 예약입니다.' : '결제가 완료되었습니다.');

      const redirectPath = body.redirectPath || '/activity';
      setTimeout(() => {
        router.replace(redirectPath);
      }, 900);
    };

    void confirmPayment().catch((error) => {
      console.error('Failed to confirm payment:', error);
      if (active) {
        setState('error');
        setMessage('결제 확인 중 오류가 발생했습니다.');
      }
    });

    return () => {
      active = false;
    };
  }, [amount, orderId, paymentKey, queryString, router]);

  return (
    <div className="min-h-screen bg-black px-4 py-24 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-gray-950 p-6 space-y-4">
        {state === 'loading' ? (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-400" />
        ) : state === 'done' ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        ) : (
          <CheckCircle2 className="mx-auto h-10 w-10 text-red-400" />
        )}

        <h1 className="text-lg font-semibold text-white">
          {state === 'error' ? '결제 처리 실패' : '결제 처리'}
        </h1>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{message}</p>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/activity"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            신청/예약 관리로 이동
          </Link>
          <Link
            href="/fencing/classes"
            className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            클래스 목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
