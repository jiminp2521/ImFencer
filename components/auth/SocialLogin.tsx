'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface SocialLoginProps {
    mode?: 'login' | 'signup';
}

type SocialProvider = 'google' | 'kakao' | 'apple';
type AuthMode = 'login' | 'signup';
type ConsentKey =
    | 'age14'
    | 'serviceTerms'
    | 'privacyCollection'
    | 'privacyPolicy'
    | 'marketing';

type ConsentItem = {
    key: ConsentKey;
    required: boolean;
    title: string;
    detail: string;
    href?: string;
};

const PROVIDER_LABEL: Record<SocialProvider, string> = {
    google: 'Google',
    kakao: '카카오',
    apple: 'Apple',
};

const CONSENT_ITEMS: ConsentItem[] = [
    {
        key: 'age14',
        required: true,
        title: '(필수) 만 14세 이상입니다.',
        detail: '만 14세 미만은 법정대리인 동의 없이 가입할 수 없습니다.',
    },
    {
        key: 'serviceTerms',
        required: true,
        title: '(필수) 이용약관 동의',
        detail: '서비스 이용을 위한 기본 약관에 동의합니다.',
        href: '/legal/terms',
    },
    {
        key: 'privacyCollection',
        required: true,
        title: '(필수) 개인정보 수집·이용 동의',
        detail: '회원 식별, 커뮤니티/거래/문의 기능 제공을 위해 최소한의 정보를 수집·이용합니다.',
        href: '/legal/privacy',
    },
    {
        key: 'privacyPolicy',
        required: true,
        title: '(필수) 개인정보 처리방침 확인',
        detail: '개인정보의 처리 목적, 보관 기간, 파기 및 권리 행사 방법을 확인했습니다.',
        href: '/legal/privacy',
    },
    {
        key: 'marketing',
        required: false,
        title: '(선택) 마케팅 정보 수신 동의',
        detail: '이벤트/혜택 안내 알림 수신에 동의합니다. (언제든 철회 가능)',
    },
];

const REQUIRED_CONSENT_KEYS = CONSENT_ITEMS.filter((item) => item.required).map((item) => item.key);

const createInitialConsents = (): Record<ConsentKey, boolean> => ({
    age14: false,
    serviceTerms: false,
    privacyCollection: false,
    privacyPolicy: false,
    marketing: false,
});

const sanitizeNextPath = (value: string | null) => {
    if (!value) return '/';
    if (!value.startsWith('/')) return '/';
    if (value.startsWith('//')) return '/';
    return value;
};

export function SocialLogin({ mode = 'login' }: SocialLoginProps) {
    const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
    const [consentProvider, setConsentProvider] = useState<SocialProvider | null>(null);
    const [consents, setConsents] = useState<Record<ConsentKey, boolean>>(createInitialConsents);
    const [consentError, setConsentError] = useState<string | null>(null);

    const isSignup = mode === 'signup';
    const actionText = isSignup ? '가입' : '로그인';
    const appleText = `Apple로 ${actionText}`;
    const requiredConsentSatisfied = useMemo(
        () => REQUIRED_CONSENT_KEYS.every((key) => consents[key]),
        [consents]
    );
    const allConsentChecked = useMemo(
        () => CONSENT_ITEMS.every((item) => consents[item.key]),
        [consents]
    );

    const setAllConsents = (checked: boolean) => {
        const nextState = createInitialConsents();
        for (const item of CONSENT_ITEMS) {
            nextState[item.key] = checked;
        }
        setConsents(nextState);
    };

    const setConsent = (key: ConsentKey, checked: boolean) => {
        setConsents((prev) => ({
            ...prev,
            [key]: checked,
        }));
    };

    const closeConsentModal = () => {
        if (pendingProvider) return;
        setConsentProvider(null);
        setConsentError(null);
    };

    const resolveRedirectTo = (isNative: boolean, authMode: AuthMode) => {
        const appScheme = (process.env.NEXT_PUBLIC_APP_SCHEME || 'imfencer').trim().toLowerCase();
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '');
        const params = new URLSearchParams();
        params.set('authMode', authMode);

        if (authMode === 'login') {
            const next = sanitizeNextPath(new URLSearchParams(window.location.search).get('next'));
            if (next !== '/') {
                params.set('next', next);
            }
        }

        const query = params.toString();
        if (isNative) {
            return `${appScheme}://auth/callback?${query}`;
        }
        return `${appUrl}/auth/callback?${query}`;
    };

    const startSocialAuth = async (provider: SocialProvider, authMode: AuthMode) => {
        if (pendingProvider) return;

        setPendingProvider(provider);
        const isNative = Capacitor.isNativePlatform();
        const redirectTo = resolveRedirectTo(isNative, authMode);
        let supabase;

        try {
            supabase = createClient();
        } catch (error) {
            console.error('Supabase client init failed:', error);
            alert('로그인 설정이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
            setPendingProvider(null);
            return;
        }

        const scopes =
            provider === 'google'
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
                console.error('Social auth error:', error);
                alert(`${PROVIDER_LABEL[provider]} ${actionText}에 실패했습니다.\n${error.message || '다시 시도해주세요.'}`);
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

    const handleSocialPress = (provider: SocialProvider) => {
        if (pendingProvider) return;

        if (isSignup) {
            setConsentProvider(provider);
            setConsentError(null);
            return;
        }

        void startSocialAuth(provider, 'login');
    };

    const handleSignupConsentConfirm = () => {
        if (!consentProvider || pendingProvider) return;

        if (!requiredConsentSatisfied) {
            setConsentError('필수 항목에 모두 동의해야 가입을 진행할 수 있습니다.');
            return;
        }

        const provider = consentProvider;
        setConsentProvider(null);
        setConsentError(null);
        void startSocialAuth(provider, 'signup');
    };

    return (
        <>
            <div className="flex flex-col gap-3 w-full">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleSocialPress('kakao')}
                    className="relative h-12 w-full rounded-2xl bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
                    disabled={Boolean(pendingProvider)}
                >
                    <div className="absolute left-5 w-5 h-5 flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C5.373 3 0 7.03 0 12c0 3.197 2.23 6.026 5.617 7.643-.207.755-.748 2.733-.855 3.132-.132.486.177.478.373.348.156-.104 2.47-1.68 3.442-2.35 1.08.307 2.23.473 3.423.473 6.627 0 12-4.03 12-9s-5.373-9-12-9z" />
                        </svg>
                    </div>
                    <span className="text-[15px] font-semibold">
                        {pendingProvider === 'kakao' ? `${PROVIDER_LABEL.kakao} ${actionText} 중...` : `카카오로 ${actionText}`}
                    </span>
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleSocialPress('google')}
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
                    <span className="text-[15px] font-semibold">
                        {pendingProvider === 'google' ? `${PROVIDER_LABEL.google} ${actionText} 중...` : `Google로 ${actionText}`}
                    </span>
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleSocialPress('apple')}
                    className="relative h-12 w-full rounded-2xl border border-slate-600 bg-black text-white hover:bg-slate-900"
                    disabled={Boolean(pendingProvider)}
                >
                    <div className="absolute left-5 w-5 h-5 flex items-center justify-center">
                        <Image
                            src="/apple-logo.png"
                            alt="Apple"
                            width={20}
                            height={20}
                            className="w-full h-full object-contain invert"
                        />
                    </div>
                    <span className="text-[15px] font-semibold">
                        {pendingProvider === 'apple' ? `${PROVIDER_LABEL.apple} ${actionText} 중...` : appleText}
                    </span>
                </Button>
            </div>

            {isSignup && consentProvider ? (
                <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-4 sm:items-center">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-white">
                                    {PROVIDER_LABEL[consentProvider]}로 가입하기
                                </h3>
                                <p className="mt-1 text-xs text-slate-400">
                                    가입 진행을 위해 아래 약관/개인정보 항목 동의가 필요합니다.
                                </p>
                            </div>
                        </div>

                        <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                            <input
                                type="checkbox"
                                checked={allConsentChecked}
                                onChange={(event) => setAllConsents(event.target.checked)}
                                className="h-4 w-4 rounded border-slate-600 bg-black text-white"
                            />
                            <span className="text-sm font-semibold text-slate-100">전체 동의</span>
                        </label>

                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {CONSENT_ITEMS.map((item) => (
                                <label key={item.key} className="block cursor-pointer rounded-lg border border-white/10 px-3 py-2">
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            checked={consents[item.key]}
                                            onChange={(event) => setConsent(item.key, event.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-black text-white"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-slate-100">{item.title}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
                                            {item.href ? (
                                                <Link
                                                    href={item.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-block text-xs text-slate-300 underline underline-offset-2 hover:text-white"
                                                >
                                                    전문 보기
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {consentError ? (
                            <p className="mt-2 text-xs text-red-300">{consentError}</p>
                        ) : null}

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                onClick={closeConsentModal}
                                disabled={Boolean(pendingProvider)}
                            >
                                취소
                            </Button>
                            <Button
                                type="button"
                                className="bg-white text-black hover:bg-slate-200"
                                onClick={handleSignupConsentConfirm}
                                disabled={!requiredConsentSatisfied || Boolean(pendingProvider)}
                            >
                                동의하고 가입 진행
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
