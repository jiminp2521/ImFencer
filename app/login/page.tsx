'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sword } from 'lucide-react';
import Link from 'next/link';
import { SocialLogin } from '@/components/auth/SocialLogin';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [logoTapCount, setLogoTapCount] = useState(0);
    const router = useRouter();
    const supabase = createClient();

    const handleLogoClick = async () => {
        const newCount = logoTapCount + 1;
        setLogoTapCount(newCount);

        if (newCount === 7) {
            const confirmTest = confirm("테스트 계정으로 로그인하시겠습니까?");
            if (confirmTest) {
                setLoading(true);
                // Hardcoded test credentials for App Store Review
                // User must create this account in Supabase Authentication
                const { error } = await supabase.auth.signInWithPassword({
                    email: 'test@imfencer.com',
                    password: 'testuser1234!',
                });

                if (error) {
                    alert('테스트 계정 로그인 실패: ' + error.message + '\n(Supabase에서 test@imfencer.com / testuser1234! 계정을 생성해주세요)');
                    setLoading(false);
                    setLogoTapCount(0);
                } else {
                    router.push('/');
                    router.refresh();
                }
            } else {
                setLogoTapCount(0);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
            <div className="mb-12 flex flex-col items-center gap-6">
                {/* Logo Image */}
                <div
                    className="relative w-48 h-16 cursor-pointer active:scale-95 transition-transform"
                    onClick={handleLogoClick}
                >
                    <img src="/app-logo.png" alt="ImFencer Logo" className="object-contain w-full h-full" />
                </div>
                <p className="text-gray-400 text-sm">프리미엄 펜싱 커뮤니티에 오신 것을 환영합니다</p>
            </div>

            <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800 space-y-6">
                <SocialLogin mode="login" />
            </Card>
        </div>
    );
}
