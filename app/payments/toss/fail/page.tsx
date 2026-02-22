'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

type FailResult = {
  ok?: boolean;
  error?: string;
};

export default function TossPaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [logged, setLogged] = useState(false);

  const code = searchParams.get('code') || '';
  const message = searchParams.get('message') || '결제가 취소되었거나 실패했습니다.';
  const orderId = searchParams.get('orderId') || '';
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    let active = true;
    const logFail = async () => {
      if (!orderId) {
        setLogged(true);
        return;
      }

      const response = await fetch('/api/payments/toss/fail', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          code,
          message,
        }),
      });

      if (!active) return;

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/payments/toss/fail?${queryString}`)}`);
        return;
      }

      const body = (await response.json().catch(() => null)) as FailResult | null;
      if (!response.ok) {
        console.error('Failed to mark payment fail:', body?.error);
      }

      setLogged(true);
    };

    void logFail().catch((error) => {
      console.error('Failed to process fail callback:', error);
      if (active) setLogged(true);
    });

    return () => {
      active = false;
    };
  }, [code, message, orderId, queryString, router]);

  return (
    <div className="min-h-screen bg-black px-4 py-24 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="text-lg font-semibold text-white">결제가 완료되지 않았습니다.</h1>
        <p className="text-sm text-red-100/90">{message}</p>
        <p className="text-xs text-red-200/70">
          {code ? `오류코드: ${code}` : '결제를 다시 시도해주세요.'}
          {!logged ? ' 상태를 저장 중입니다...' : ''}
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/fencing/classes"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            클래스 목록으로
          </Link>
          <Link
            href="/activity"
            className="inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            신청/예약 상태 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
