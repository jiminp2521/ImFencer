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
  activeAnonKeyPrefix?: string;
  activeProjectRef?: string;
  activeKeySource?: string;
  apiVersion?: string;
};

const TEST_LOGIN_UI_VERSION = '2026-02-17-login-ui-v2';

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
  const oauthError = searchParams.get('oauthError');
  const nextPath = useMemo(() => sanitizeNext(searchParams.get('next')), [searchParams]);

  const requestTestLogin = async (accountKey: TestAccountKey) => {
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`/api/auth/test-login-v2?t=${Date.now()}-${attempt}`, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ accountKey }),
        });

        lastResponse = response;
        if (response.ok || response.status < 500 || attempt === 1) {
          return response;
        }
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
      }
    }

    return lastResponse;
  };

  const loginWithTestAccount = async (account: TestAccount) => {
    if (pendingAccountKey) return;

    setPendingAccountKey(account.key);

    try {
      const testLoginResponse = await requestTestLogin(account.key);
      if (!testLoginResponse) {
        alert('테스트 계정 로그인 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const body = (await testLoginResponse
        .json()
        .catch(() => null)) as TestLoginResponse | null;

      if (!testLoginResponse.ok || !body?.ok) {
        const detail = body?.message || body?.error || '테스트 계정 로그인 실패';
        const emailInfo = body?.accountEmail ? `\n요청 이메일: ${body.accountEmail}` : '';
        const signedInInfo = body?.signedInEmail ? `\n실제 로그인 이메일: ${body.signedInEmail}` : '';
        const keyInfo = body?.activeAnonKeyPrefix ? `\n서버 키 prefix: ${body.activeAnonKeyPrefix}` : '';
        const keySourceInfo = body?.activeKeySource ? `\n서버 키 변수: ${body.activeKeySource}` : '';
        const projectInfo = body?.activeProjectRef ? `\n서버 프로젝트 ref: ${body.activeProjectRef}` : '';
        const versionInfo = `\nUI 버전: ${TEST_LOGIN_UI_VERSION}\nAPI 버전: ${body?.apiVersion || '(missing)'}`;
        alert(`${detail}${emailInfo}${signedInInfo}${keyInfo}${keySourceInfo}${projectInfo}${versionInfo}`);
        return;
      }

      router.push(nextPath);
    } finally {
      setPendingAccountKey(null);
    }
  };

  return (
    <div className="imf-page flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-10 flex flex-col items-center gap-5">
        <div className="imf-panel flex h-18 w-56 items-center justify-center p-3">
          <div className="relative h-12 w-44">
            <img src="/app-logo.png" alt="ImFencer Logo" className="h-full w-full object-contain" />
          </div>
        </div>
        <p className="text-sm text-slate-300">프리미엄 펜싱 커뮤니티에 오신 것을 환영합니다</p>
      </div>

      <Card className="imf-panel w-full max-w-sm space-y-6 p-6">
        {deletedAccount ? (
          <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs text-slate-200">
            계정이 삭제되었습니다. 다시 이용하려면 새로 가입해주세요.
          </div>
        ) : null}

        {oauthError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            소셜 로그인에 실패했습니다: {oauthError}
          </div>
        ) : null}

        <SocialLogin mode="login" />

        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-xs text-slate-400">테스트 로그인</p>
          {TEST_ACCOUNTS.map((account) => (
            <Button
              key={account.key}
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
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
