'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sword } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 올바르지 않습니다." : error.message);
            setLoading(false);
        } else {
            router.push('/'); // Redirect to home on success
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
            <div className="mb-8 flex flex-col items-center gap-4">
                {/* Logo Image */}
                <div className="relative w-48 h-16">
                    <img src="/app-logo.png" alt="ImFencer Logo" className="object-contain w-full h-full" />
                </div>
                <p className="text-gray-400 text-sm">프리미엄 펜싱 커뮤니티에 오신 것을 환영합니다</p>
            </div>

            <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="이메일"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-black border-gray-800 text-white placeholder:text-gray-500"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-black border-gray-800 text-white placeholder:text-gray-500"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={loading}
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </Button>
                </form>

                <div className="text-center text-xs text-gray-500 space-y-2">
                    <p>
                        계정이 없으신가요?{' '}
                        <Link href="/signup" className="text-blue-500 hover:underline">
                            회원가입
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
