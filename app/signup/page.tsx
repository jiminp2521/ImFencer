'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                }
            }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    username: username,
                    weapon_type: 'Fleuret',
                    tier: 'Bronze'
                });

            if (profileError) {
                console.error("Profile creation failed:", profileError);
                if (!profileError.message.includes('duplicate key')) {
                    setError("계정은 생성되었으나 프로필 설정에 실패했습니다.");
                    setLoading(false);
                    return;
                }
            }

            alert('회원가입이 완료되었습니다! 로그인을 진행해주세요.');
            router.push('/login');
        } else {
            // In case email confirmation is enabled (usually off for tests)
            alert('인증 메일을 확인해주세요.');
            setLoading(false);
        }
    };

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
                    <img src="/logo.png" alt="ImFencer Logo" className="object-contain w-full h-full" />
                </div>
                <p className="text-gray-400 text-sm">계정을 생성하고 시작하세요</p>
            </div>

            <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800 space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="닉네임"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-black border-gray-800 text-white placeholder:text-gray-500"
                            required
                            minLength={3}
                        />
                    </div>
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
                            placeholder="비밀번호 (6자 이상)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-black border-gray-800 text-white placeholder:text-gray-500"
                            required
                            minLength={6}
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
                        {loading ? '가입 중...' : '회원가입'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
