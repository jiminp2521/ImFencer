'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SocialLogin } from '@/components/auth/SocialLogin';

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
            <div className="absolute top-4 left-4">
                <Link href="/login" className="flex items-center text-gray-400 hover:text-white">
                    <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로가기
                </Link>
            </div>

            <div className="mb-8 flex flex-col items-center gap-4">
                {/* Logo Image */}
                <div className="relative w-40 h-12">
                    <Image
                        src="/app-logo.png"
                        alt="ImFencer Logo"
                        width={160}
                        height={48}
                        className="object-contain w-full h-full"
                        priority
                    />
                </div>
                <p className="text-gray-400 text-sm text-center">
                    소셜 계정으로 가입을 시작하고
                    <br />
                    필수 정보 입력을 완료하면 가입이 완료됩니다.
                </p>
            </div>

            <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800 space-y-5">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs leading-5 text-slate-300">
                    ① 소셜 계정 선택 및 약관 동의
                    <br />
                    ② 기본 프로필 정보 입력
                    <br />
                    ③ 가입 완료 후 서비스 이용
                </div>
                <SocialLogin mode="signup" />
            </Card>
        </div>
    );
}
