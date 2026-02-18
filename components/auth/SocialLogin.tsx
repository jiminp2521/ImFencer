'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface SocialLoginProps {
    mode?: 'login' | 'signup';
}

type SocialProvider = 'google' | 'kakao' | 'apple';

export function SocialLogin({ mode = 'login' }: SocialLoginProps) {
    const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);

    const resolveRedirectTo = (isNative: boolean) => {
        const appScheme = (process.env.NEXT_PUBLIC_APP_SCHEME || 'imfencer').trim().toLowerCase();
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '');

        return isNative ? `${appScheme}://auth/callback` : `${appUrl}/auth/callback`;
    };

    const handleSocialLogin = async (provider: SocialProvider) => {
        if (pendingProvider) return;

        setPendingProvider(provider);
        const isNative = Capacitor.isNativePlatform();
        const redirectTo = resolveRedirectTo(isNative);
        let supabase;

        try {
            supabase = createClient();
        } catch (error) {
            console.error('Supabase client init failed:', error);
            alert('로그인 설정이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
            setPendingProvider(null);
            return;
        }

        const scopes = provider === 'google'
            ? 'openid email profile'
            : provider === 'kakao'
                ? 'profile_nickname'
            : provider === 'apple'
                ? 'email name'
                : undefined;

        const queryParams: Record<string, string> | undefined = provider === 'google'
            ? { prompt: 'select_account', access_type: 'offline' }
            : undefined;

        try {
            const options: {
                redirectTo: string;
                skipBrowserRedirect: boolean;
                scopes?: string;
                queryParams?: Record<string, string>;
            } = {
                redirectTo,
                skipBrowserRedirect: isNative,
            };

            if (scopes) {
                options.scopes = scopes;
            }

            if (queryParams) {
                options.queryParams = queryParams;
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options,
            });

            if (error) {
                console.error('Social login error:', error);
                alert(`로그인에 실패했습니다.\n${error.message || '다시 시도해주세요.'}`);
                return;
            }

            if (!isNative) return;

            if (!data?.url) {
                alert('로그인 URL 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
                return;
            }

            await Browser.open({ url: data.url }).catch((browserError) => {
                console.error('Failed to open browser for oauth:', browserError);
                alert('브라우저 열기에 실패했습니다.');
            });
        } finally {
            setPendingProvider(null);
        }
    };

    const isSignup = mode === 'signup';
    const actionText = isSignup ? '가입' : '로그인';
    const appleText = `Apple로 ${actionText}`;
    const pendingText = pendingProvider ? '로그인 중...' : null;

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Kakao Login */}
            <Button
                type="button"
                variant="ghost"
                onClick={() => handleSocialLogin('kakao')}
                className="relative h-12 w-full rounded-2xl bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
                disabled={Boolean(pendingProvider)}
            >
                <div className="absolute left-5 w-5 h-5 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3C5.373 3 0 7.03 0 12c0 3.197 2.23 6.026 5.617 7.643-.207.755-.748 2.733-.855 3.132-.132.486.177.478.373.348.156-.104 2.47-1.68 3.442-2.35 1.08.307 2.23.473 3.423.473 6.627 0 12-4.03 12-9s-5.373-9-12-9z" />
                    </svg>
                </div>
                <span className="text-[15px] font-semibold">{pendingText || `카카오로 ${actionText}`}</span>
            </Button>

            {/* Google Login */}
            <Button
                type="button"
                variant="ghost"
                onClick={() => handleSocialLogin('google')}
                className="relative h-12 w-full rounded-2xl border border-slate-200 bg-white text-black hover:bg-slate-100"
                disabled={Boolean(pendingProvider)}
            >
                <div className="absolute left-5 w-5 h-5 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84c.09-.27.18-.54.21-.82z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                </div>
                <span className="text-[15px] font-semibold">{pendingText || `Google로 ${actionText}`}</span>
            </Button>

            {/* Apple Login - Black Style */}
            <Button
                type="button"
                variant="ghost"
                onClick={() => handleSocialLogin('apple')}
                className="relative h-12 w-full rounded-2xl border border-slate-600 bg-black text-white hover:bg-slate-900"
                disabled={Boolean(pendingProvider)}
            >
                <div className="absolute left-5 w-5 h-5 flex items-center justify-center">
                    <img src="/apple-logo.png" alt="Apple" className="w-full h-full object-contain invert" />
                </div>
                <span className="text-[15px] font-semibold">{pendingText || appleText}</span>
            </Button>
        </div>
    );
}
