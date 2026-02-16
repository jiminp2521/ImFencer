'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SocialLogin } from '@/components/auth/SocialLogin';

type TestAccount = {
  key: string;
  label: string;
  email: string;
  password: string;
};

const TEST_ACCOUNTS: TestAccount[] = [
  {
    key: 'test-1',
    label: '테스트계정1 로그인',
    email: 'test1@imfencer.com',
    password: 'testuser1234!',
  },
  {
    key: 'test-2',
    label: '테스트계정2 로그인',
    email: 'test2@imfencer.com',
    password: 'testuser1234!',
  },
  {
    key: 'test-3',
    label: '테스트계정3 로그인',
    email: 'test3@imfencer.com',
    password: 'testuser1234!',
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
  const supabase = createClient();
  const deletedAccount = searchParams.get('deleted') === '1';
  const nextPath = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);

  const loginWithTestAccount = async (account: TestAccount) => {
    if (pendingAccountKey) return;

    setPendingAccountKey(account.key);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        alert(`테스트 계정 로그인 실패: ${error.message}`);
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
