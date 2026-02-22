'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { SocialLogin } from '@/components/auth/SocialLogin';

export default function SignUpPage() {
  return (
    <div className="imf-page flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-10 flex flex-col items-center gap-5">
        <div className="imf-panel flex h-18 w-56 items-center justify-center p-3">
          <div className="relative h-12 w-44">
            <Image
              src="/app-logo.png"
              alt="ImFencer Logo"
              width={176}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>
        <p className="text-sm text-slate-300">소셜 계정으로 회원가입</p>
      </div>

      <Card className="imf-panel w-full max-w-sm space-y-6 p-6">
        <SocialLogin mode="signup" />

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
          <p className="text-xs text-slate-400">이미 회원이신가요?</p>
          <Link
            href="/login"
            className="mt-1 inline-flex items-center justify-center text-sm font-semibold text-white underline underline-offset-2 hover:text-slate-200"
          >
            로그인하기
          </Link>
        </div>
      </Card>
    </div>
  );
}
