'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function WritePage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('Free');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('로그인이 필요합니다.');
            router.push('/login');
            return;
        }

        // Insert post
        const { error } = await supabase
            .from('posts')
            .insert({
                title,
                content,
                category,
                author_id: user.id,
                tags: [], // Optional: Add tag input later
            });

        if (error) {
            console.error(error);
            alert('게시글 작성에 실패했습니다.');
            setIsSubmitting(false);
        } else {
            router.push('/');
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black border-b border-white/10 px-4 h-14 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-white">글쓰기</h1>
                <Button
                    variant="ghost"
                    className="text-blue-500 hover:text-blue-400 hover:bg-transparent p-0 font-semibold"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title || !content}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '완료'}
                </Button>
            </header>

            {/* Form */}
            <main className="p-4 space-y-6">
                <div className="space-y-4">
                    {/* Category Select */}
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-full bg-gray-900 border-gray-800 text-white">
                            <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800 text-white">
                            <SelectItem value="Free">자유</SelectItem>
                            <SelectItem value="Question">질문</SelectItem>
                            <SelectItem value="Info">정보</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        placeholder="제목을 입력하세요"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent border-none text-xl font-bold placeholder:text-gray-600 focus-visible:ring-0 px-0"
                    />

                    <div className="min-h-[200px]">
                        <Textarea
                            placeholder="내용을 자유롭게 작성해주세요. (펜싱 관련 매너를 지켜주세요!)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="bg-transparent border-none text-base resize-none min-h-[300px] placeholder:text-gray-600 focus-visible:ring-0 px-0"
                        />
                    </div>
                </div>

                {/* Toolbar (Image, Tags, etc.) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/50 backdrop-blur border-t border-white/10 flex gap-4">
                    <button className="text-gray-400 hover:text-blue-500 transition-colors">
                        <ImageIcon className="w-6 h-6" />
                    </button>
                </div>
            </main>
        </div>
    );
}
