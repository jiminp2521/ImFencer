'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProfileSetupPage() {
    const [username, setUsername] = useState('');
    const [weaponType, setWeaponType] = useState('Fleuret');
    const [userType, setUserType] = useState('동호인');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            // Check if profile already exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();

            if (profile?.username) {
                router.replace('/');
            }
        };
        checkUser();
    }, [router, supabase]);

    const handleProfileSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('로그인 정보가 없습니다. 다시 로그인해주세요.');
            setLoading(false);
            return;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                username: username,
                weapon_type: weaponType,
                user_type: userType,
                tier: 'Bronze',
                is_coach: userType === '코치 및 감독',
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            console.error("Profile creation failed:", profileError);
            setError("프로필 저장에 실패했습니다.");
            setLoading(false);
            return;
        }

        alert('가입이 완료되었습니다!');
        router.push('/');
        router.refresh();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
            <div className="mb-8 flex flex-col items-center gap-4">
                <div className="relative w-40 h-12">
                    <img src="/app-logo.png" alt="ImFencer Logo" className="object-contain w-full h-full" />
                </div>
                <p className="text-gray-400 text-sm">필수 정보를 입력해주세요</p>
            </div>

            <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800 space-y-4">
                <form onSubmit={handleProfileSetup} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="닉네임"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-black border-gray-800 text-white placeholder:text-gray-500"
                            required
                            minLength={2}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-gray-800 bg-black px-3 py-2 text-sm">
                            <span className="text-gray-500">종목 선택</span>
                            <Select value={weaponType} onValueChange={setWeaponType}>
                                <SelectTrigger className="w-[120px] border-none bg-transparent p-0 h-auto text-white focus:ring-0 focus:ring-offset-0 shadow-none justify-end gap-2 hover:bg-transparent data-[state=open]:bg-transparent">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                    <SelectItem value="Fleuret">플뢰레</SelectItem>
                                    <SelectItem value="Epee">에페</SelectItem>
                                    <SelectItem value="Sabre">사브르</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-gray-800 bg-black px-3 py-2 text-sm">
                            <span className="text-gray-500">선수 구분</span>
                            <Select value={userType} onValueChange={setUserType}>
                                <SelectTrigger className="w-[120px] border-none bg-transparent p-0 h-auto text-white focus:ring-0 focus:ring-offset-0 shadow-none justify-end gap-2 hover:bg-transparent data-[state=open]:bg-transparent">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                    <SelectItem value="동호인">동호인</SelectItem>
                                    <SelectItem value="엘리트">엘리트</SelectItem>
                                    <SelectItem value="코치 및 감독">코치 및 감독</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[15px] font-semibold"
                        disabled={loading}
                    >
                        {loading ? '저장하고 시작하기' : '시작하기'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
