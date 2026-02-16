'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SocialLogin } from '@/components/auth/SocialLogin';

type TestAccountKey = 'test-1' | 'test-2' | 'test-3';

type TestAccount = {
  key: TestAccountKey;
  label: string;
};

type TestLoginResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  accountEmail?: string;
  signedInEmail?: string;
  username?: string;
  userId?: string;
};

const TEST_ACCOUNTS: TestAccount[] = [
  {
    key: 'test-1',
    label: '테스트계정1 로그인',
  },
  {
    key: 'test-2',
    label: '테스트계정2 로그인',
  },
  {
    key: 'test-3',
    label: '테스트계정3 로그인',
  },
];

const sanitizeNext = (value: string | null) => {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
};

export default function LoginPage() {
  const [pendingAccountKey, setPendingAccountKey] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deletedAccount = searchParams.get('deleted') === '1';
  const nextPath = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);

  const loginWithTestAccount = async (account: TestAccount) => {
    if (pendingAccountKey) return;

    setPendingAccountKey(account.key);

    try {
      const testLoginResponse = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ accountKey: account.key }),
      });

      const body = (await testLoginResponse
        .json()
        .catch(() => null)) as TestLoginResponse | null;

      if (!testLoginResponse.ok || !body?.ok) {
        const detail = body?.message || body?.error || '테스트 계정 로그인 실패';
        const emailInfo = body?.accountEmail ? `\n요청 이메일: ${body.accountEmail}` : '';
        const signedInInfo = body?.signedInEmail ? `\n실제 로그인 이메일: ${body.signedInEmail}` : '';
        alert(`${detail}${emailInfo}${signedInInfo}`);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setPendingAccountKey(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <div className="mb-12 flex flex-col items-center gap-6">
        <div className="relative w-48 h-16">
          <img src="/app-logo.png" alt="ImFencer Logo" className="object-contain w-full h-full" />
        </div>
        <p className="text-gray-400 text-sm">프리미엄 펜싱 커뮤니티에 오신 것을 환영합니다</p>
      </div>

      <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800 space-y-6">
        {deletedAccount ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            계정이 삭제되었습니다. 다시 이용하려면 새로 가입해주세요.
          </div>
        ) : null}

        <SocialLogin mode="login" />

        <div className="border-t border-gray-800 pt-4 space-y-2">
          <p className="text-xs text-gray-500">테스트 로그인</p>
          {TEST_ACCOUNTS.map((account) => (
            <Button
              key={account.key}
              type="button"
              variant="outline"
              className="w-full border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-800"
              onClick={() => {
                void loginWithTestAccount(account);
              }}
              disabled={Boolean(pendingAccountKey)}
            >
              {pendingAccountKey === account.key ? '로그인 중...' : account.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
