'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: '카드' | string,
        params: {
          amount: number;
          orderId: string;
          orderName: string;
          customerName?: string;
          customerEmail?: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<void> | void;
    };
  }
}

type CheckoutPayload = {
  clientKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
};

type ClassPaymentButtonProps = {
  classId: string;
  classTitle: string;
  initialReserved?: boolean;
  loginNext?: string;
  className?: string;
};

let tossScriptPromise: Promise<void> | null = null;

const loadTossScript = async () => {
  if (typeof window === 'undefined') return;
  if (window.TossPayments) return;

  if (!tossScriptPromise) {
    tossScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-toss-payments="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Toss script')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.tosspayments.com/v1/payment';
      script.async = true;
      script.dataset.tossPayments = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Toss script'));
      document.head.appendChild(script);
    });
  }

  return tossScriptPromise;
};

export function ClassPaymentButton({
  classId,
  classTitle,
  initialReserved = false,
  loginNext = '/fencing/classes',
  className,
}: ClassPaymentButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reserved, setReserved] = useState(initialReserved);

  const requestCheckout = async () => {
    const response = await fetch(`/api/payments/classes/${classId}/prepare`, {
      method: 'POST',
    });

    if (response.status === 401) {
      alert('로그인이 필요합니다.');
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return { kind: 'auth-required' as const };
    }

    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          free?: boolean;
          alreadyConfirmed?: boolean;
          checkout?: CheckoutPayload;
        }
      | null;

    if (!response.ok) {
      throw new Error(body?.error || '결제 준비에 실패했습니다.');
    }

    if (body?.free || body?.alreadyConfirmed) {
      setReserved(true);
      alert(body.free ? `${classTitle} 예약이 확정되었습니다.` : '이미 예약이 확정된 클래스입니다.');
      router.refresh();
      return { kind: 'done' as const };
    }

    if (!body?.checkout) {
      throw new Error('결제 정보가 없습니다.');
    }

    return {
      kind: 'checkout' as const,
      payload: body.checkout,
    };
  };

  const startPayment = async (checkout: CheckoutPayload) => {
    await loadTossScript();
    if (!window.TossPayments) {
      throw new Error('TossPayments SDK를 불러오지 못했습니다.');
    }

    const tossPayments = window.TossPayments(checkout.clientKey);
    await tossPayments.requestPayment('카드', {
      amount: checkout.amount,
      orderId: checkout.orderId,
      orderName: checkout.orderName,
      customerName: checkout.customerName,
      customerEmail: checkout.customerEmail,
      successUrl: checkout.successUrl,
      failUrl: checkout.failUrl,
    });
  };

  const handleClick = async () => {
    if (pending || reserved) return;
    setPending(true);

    try {
      const checkoutResult = await requestCheckout();
      if (checkoutResult.kind !== 'checkout') {
        return;
      }

      await startPayment(checkoutResult.payload);
    } catch (error) {
      console.error('Class payment failed:', error);
      alert(error instanceof Error ? error.message : '결제를 진행하지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending || reserved}
      className={className || 'bg-blue-600 hover:bg-blue-700 text-white'}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      <span>{reserved ? '예약 완료' : '결제 후 예약'}</span>
    </Button>
  );
}
