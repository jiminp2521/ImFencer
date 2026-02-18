import Link from 'next/link';
import Image from 'next/image';
import { memo } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FeedItemProps {
    id: string;
    category: string;
    title: string;
    previewText: string;
    imageUrl?: string | null;
    tags: string[] | null;
    author: string;
    date: string;
    likeCount?: number;
    commentCount?: number;
}

const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
};

const categoryMap: Record<string, string> = {
    'Free': '자유',
    'Info': '정보',
    'Question': '질문'
};

export const FeedItem = memo(function FeedItem({
    id,
    category,
    title,
    previewText,
    imageUrl,
    tags,
    author,
    date,
    likeCount = 0,
    commentCount = 0,
}: FeedItemProps) {
    return (
        <Link
            href={`/posts/${id}`}
            prefetch={false}
            className="imf-panel block p-4 transition-colors hover:border-white/30 hover:bg-slate-900/75 active:scale-[0.997] [content-visibility:auto] [contain-intrinsic-size:220px]"
        >
            <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Badge variant="outline" className="border-slate-600 bg-slate-800/70 text-[10px] text-slate-300">
                            {categoryMap[category] || category}
                        </Badge>
                        <span className="font-medium text-slate-200">{author}</span>
                        <span>•</span>
                        <span>{getTimeAgo(date)}</span>
                    </div>
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">
                        {title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-slate-400">
                        {previewText}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {likeCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {commentCount}
                        </span>
                    </div>
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag) => (
                                <span key={tag} className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {imageUrl && (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="80px"
                            priority={false}
                        />
                    </div>
                )}
            </div>
        </Link>
    );
});
