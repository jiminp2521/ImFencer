'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface SocialLoginProps {
    mode?: 'login' | 'signup';
}

type SocialProvider = 'google' | 'kakao' | 'apple';
type AuthMode = 'login' | 'signup';
type ConsentKey =
    | 'age14'
    | 'serviceTerms'
    | 'privacyCollection'
    | 'entrustmentNotice'
    | 'privacyPolicy'
    | 'marketing';

type ConsentSection = {
    title: string;
    lines: string[];
};

type ConsentItem = {
    key: ConsentKey;
    required: boolean;
    title: string;
    summary: string;
    href?: string;
    sections: ConsentSection[];
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
        title: '만 14세 이상 확인',
        summary: '만 14세 미만은 법정대리인 동의 절차가 준비되기 전까지 가입할 수 없습니다.',
        sections: [
            {
                title: '① 가입 대상',
                lines: [
                    'ImFencer는 만 14세 이상 이용자를 대상으로 서비스를 제공합니다.',
                    '생년월일 또는 연령 정보가 사실과 다를 경우 서비스 이용이 제한될 수 있습니다.',
                ],
            },
            {
                title: '② 미성년자 정책',
                lines: [
                    '만 14세 미만 이용자는 별도 법정대리인 동의 절차가 제공될 때까지 가입이 제한됩니다.',
                    '향후 미성년자 가입 기능을 도입하는 경우 별도 동의 화면으로 재동의를 받습니다.',
                ],
            },
            {
                title: '③ 허위 정보 입력 시 조치',
                lines: [
                    '허위 연령 입력이 확인되면 계정이 임시 정지 또는 삭제될 수 있습니다.',
                    '운영정책 위반 기록이 누적되면 재가입 제한이 적용될 수 있습니다.',
                ],
            },
        ],
    },
    {
        key: 'serviceTerms',
        required: true,
        title: '이용약관 동의',
        summary: '커뮤니티, 채팅, 거래, 레슨/클래스 예약 기능 이용을 위한 기본 약관입니다.',
        href: '/legal/terms',
        sections: [
            {
                title: '① 서비스 제공 범위',
                lines: [
                    '서비스는 커뮤니티 글/댓글, 채팅, 중고거래, 레슨/클래스 신청, 결제 연동 기능을 제공합니다.',
                    '운영상 필요할 경우 일부 기능은 사전 공지 후 변경 또는 중단될 수 있습니다.',
                ],
            },
            {
                title: '② 회원 의무',
                lines: [
                    '회원은 관계 법령, 본 약관, 운영정책을 준수하여 서비스를 이용해야 합니다.',
                    '타인의 권리 침해, 사기/허위거래, 스팸, 욕설, 불법 게시물 작성은 금지됩니다.',
                ],
            },
            {
                title: '③ 게시물 및 거래 책임',
                lines: [
                    '게시물과 거래 내용의 책임은 작성자 또는 거래 당사자에게 있습니다.',
                    '운영자는 분쟁 예방을 위해 신고 처리, 임시 숨김, 계정 제한 조치를 할 수 있습니다.',
                ],
            },
            {
                title: '④ 이용 제한 및 탈퇴',
                lines: [
                    '중대한 정책 위반 시 계정 일시정지, 영구정지, 서비스 이용 제한이 적용될 수 있습니다.',
                    '회원은 언제든지 앱 내 계정삭제 기능으로 탈퇴를 요청할 수 있습니다.',
                ],
            },
            {
                title: '⑤ 약관 개정',
                lines: [
                    '약관은 관련 법령 및 서비스 정책에 따라 개정될 수 있습니다.',
                    '중요 변경은 앱 공지 또는 서비스 내 고지로 안내하며, 개정 후 계속 이용 시 동의로 봅니다.',
                ],
            },
        ],
    },
    {
        key: 'privacyCollection',
        required: true,
        title: '개인정보 수집·이용 동의',
        summary: '회원 식별과 서비스 제공을 위해 필요한 최소한의 개인정보를 수집·이용합니다.',
        href: '/legal/privacy',
        sections: [
            {
                title: '① 수집 항목',
                lines: [
                    '소셜 로그인 시: 소셜 식별자, 이메일, 프로필 닉네임(제공 범위 내) 정보를 수집할 수 있습니다.',
                    '가입 완료 시: 닉네임, 종목, 선수 구분, 소속 클럽(선택)을 수집합니다.',
                    '서비스 이용 시: 게시물/댓글/채팅/거래/결제/접속기록/기기정보/푸시토큰이 생성될 수 있습니다.',
                ],
            },
            {
                title: '② 이용 목적',
                lines: [
                    '회원 식별 및 인증, 계정 보안, 커뮤니티/채팅/거래 기능 제공에 이용합니다.',
                    '예약·결제 처리, 고객문의 대응, 부정 이용 방지, 서비스 품질 개선에 이용합니다.',
                ],
            },
            {
                title: '③ 보관 및 파기',
                lines: [
                    '원칙적으로 탈퇴 시 지체 없이 파기하되, 관계 법령에 따라 보관 의무가 있는 정보는 해당 기간 보관합니다.',
                    '전자상거래 및 통신비밀보호 등 관련 법령에 따른 보존 항목은 기간 만료 후 즉시 파기합니다.',
                ],
            },
            {
                title: '④ 동의 거부 권리',
                lines: [
                    '필수 항목 동의를 거부할 권리가 있으나, 이 경우 회원가입 및 핵심 기능 이용이 제한됩니다.',
                    '선택 항목은 동의하지 않아도 가입 및 기본 기능 이용이 가능합니다.',
                ],
            },
        ],
    },
    {
        key: 'entrustmentNotice',
        required: true,
        title: '개인정보 처리위탁·외부 연동 안내 확인',
        summary: '안정적인 서비스 운영을 위해 외부 서비스에 업무를 위탁하거나 연동합니다.',
        href: '/legal/privacy',
        sections: [
            {
                title: '① 처리위탁 내역',
                lines: [
                    '인증/DB/스토리지: Supabase',
                    '웹 호스팅 및 배포: Vercel',
                    '푸시 알림 전송: Firebase Cloud Messaging',
                    '결제 처리: 토스페이먼츠(결제 시점에 한함)',
                ],
            },
            {
                title: '② 제3자 제공 원칙',
                lines: [
                    '회사는 원칙적으로 이용자 동의 없이 개인정보를 제3자에게 제공하지 않습니다.',
                    '법령상 의무 이행 또는 결제/정산 등 서비스 이행에 필요한 최소 범위에서만 처리합니다.',
                ],
            },
            {
                title: '③ 국외 처리 가능성',
                lines: [
                    '클라우드·소셜 로그인 인프라 특성상 개인정보가 국외 서버에서 처리될 수 있습니다.',
                    '국외 이전이 발생하는 경우 이전 국가, 항목, 목적, 보관 기간을 처리방침에 공개합니다.',
                ],
            },
            {
                title: '④ 안전성 확보 조치',
                lines: [
                    '접근권한 관리, 전송구간 암호화, 로그 모니터링 등 기술적·관리적 보호조치를 적용합니다.',
                    '수탁사 변경 시 처리방침 및 동의 화면을 통해 즉시 안내합니다.',
                ],
            },
        ],
    },
    {
        key: 'privacyPolicy',
        required: true,
        title: '개인정보처리방침 확인',
        summary: '개인정보 처리 전반(권리행사, 파기, 안전조치, 문의처)을 확인했습니다.',
        href: '/legal/privacy',
        sections: [
            {
                title: '① 고지 항목',
                lines: [
                    '처리방침에는 수집 항목, 처리 목적, 보관 기간, 파기 절차, 권리행사 방법이 포함됩니다.',
                    '법령 및 서비스 정책 변경 시 개정일자와 변경사항을 함께 고지합니다.',
                ],
            },
            {
                title: '② 이용자 권리',
                lines: [
                    '이용자는 본인의 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.',
                    '앱 내 계정삭제 메뉴를 통해 탈퇴 및 처리중단을 요청할 수 있습니다.',
                ],
            },
            {
                title: '③ 계정 보안 및 신고',
                lines: [
                    '비정상 접근이 의심되면 즉시 비밀번호 변경 또는 계정 보호 조치를 해야 합니다.',
                    '개인정보 침해 또는 계정 도용이 의심되는 경우 고객지원 채널로 즉시 신고해야 합니다.',
                ],
            },
        ],
    },
    {
        key: 'marketing',
        required: false,
        title: '마케팅 정보 수신 동의',
        summary: '이벤트/혜택/업데이트 안내를 앱 푸시 또는 이메일로 수신합니다. 언제든 철회할 수 있습니다.',
        sections: [
            {
                title: '① 수신 정보',
                lines: [
                    '신규 기능 출시, 이벤트, 할인/프로모션, 커뮤니티 캠페인 안내를 발송할 수 있습니다.',
                    '광고성 정보에는 발신자 정보, 수신거부 방법을 함께 안내합니다.',
                ],
            },
            {
                title: '② 수신 채널',
                lines: [
                    '앱 푸시, 이메일 채널로 발송될 수 있습니다.',
                    '서비스 운영상 필수 안내(정책 변경, 보안 공지 등)는 마케팅 동의 여부와 무관하게 발송될 수 있습니다.',
                ],
            },
            {
                title: '③ 동의 철회',
                lines: [
                    '마케팅 동의는 프로필/설정 메뉴 또는 고객지원 요청으로 언제든지 철회할 수 있습니다.',
                    '철회 처리 전 이미 발송 준비된 메시지는 일부 수신될 수 있습니다.',
                ],
            },
        ],
    },
];

const REQUIRED_CONSENT_KEYS = CONSENT_ITEMS.filter((item) => item.required).map((item) => item.key);

const createInitialConsents = (): Record<ConsentKey, boolean> => ({
    age14: false,
    serviceTerms: false,
    privacyCollection: false,
    entrustmentNotice: false,
    privacyPolicy: false,
    marketing: false,
});

const createInitialExpandedState = (): Record<ConsentKey, boolean> => ({
    age14: false,
    serviceTerms: false,
    privacyCollection: false,
    entrustmentNotice: false,
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
    const [expandedItems, setExpandedItems] = useState<Record<ConsentKey, boolean>>(createInitialExpandedState);
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
    const requiredCount = REQUIRED_CONSENT_KEYS.length;
    const optionalCount = CONSENT_ITEMS.length - requiredCount;

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

    const toggleExpanded = (key: ConsentKey) => {
        setExpandedItems((prev) => ({
            ...prev,
            [key]: !prev[key],
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
                    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 shadow-2xl max-h-[88vh] overflow-hidden flex flex-col">
                        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                            <h3 className="text-base font-semibold text-white">
                                {PROVIDER_LABEL[consentProvider]}로 가입하기
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                                필수 {requiredCount}개, 선택 {optionalCount}개 항목을 확인하고 동의하면 가입이 진행됩니다.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                            <div className="mb-3 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-[11px] leading-5 text-cyan-100">
                                개인정보보호법, 앱스토어 정책, 운영정책 기준에 따라 동의 항목을 제공합니다.
                                <br />
                                항목별 “전문 보기”에서 실제 고지 내용을 확인할 수 있습니다.
                            </div>

                            <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                                <input
                                    type="checkbox"
                                    checked={allConsentChecked}
                                    onChange={(event) => setAllConsents(event.target.checked)}
                                    className="h-4 w-4 rounded border-slate-600 bg-black text-white"
                                />
                                <span className="text-sm font-semibold text-slate-100">전체 동의</span>
                            </label>

                            <div className="space-y-2">
                                {CONSENT_ITEMS.map((item) => {
                                    const expanded = expandedItems[item.key];
                                    return (
                                        <div
                                            key={item.key}
                                            className="rounded-xl border border-white/10 bg-black/30"
                                        >
                                            <div className="flex items-start gap-3 px-3 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={consents[item.key]}
                                                    onChange={(event) => setConsent(item.key, event.target.checked)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-black text-white"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.required ? 'bg-rose-500/20 text-rose-100' : 'bg-slate-600/30 text-slate-200'}`}>
                                                            {item.required ? '필수' : '선택'}
                                                        </span>
                                                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                                                    </div>
                                                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.summary}</p>

                                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                                        {item.href ? (
                                                            <Link
                                                                href={item.href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-slate-300 underline underline-offset-2 hover:text-white"
                                                            >
                                                                약관/방침 원문
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Link>
                                                        ) : null}

                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpanded(item.key)}
                                                            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
                                                        >
                                                            전문 {expanded ? '접기' : '보기'}
                                                            {expanded ? (
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {expanded ? (
                                                <div className="border-t border-white/10 bg-slate-900/70 px-3 pb-3 pt-2">
                                                    <div className="space-y-3">
                                                        {item.sections.map((section) => (
                                                            <div key={section.title} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                                                                <p className="text-xs font-semibold text-slate-100">{section.title}</p>
                                                                <div className="mt-1 space-y-1 text-[11px] leading-5 text-slate-300">
                                                                    {section.lines.map((line) => (
                                                                        <p key={`${section.title}-${line}`}>{line}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            {consentError ? (
                                <p className="mt-3 text-xs text-red-300">{consentError}</p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4 sm:px-5">
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
