import Link from 'next/link';
import Image from 'next/image';
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

export function FeedItem({
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
    // Simple time ago formatter (Korean)
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

    return (
        <Link href={`/posts/${id}`} className="block border-b border-white/10 p-4 hover:bg-white/5 transition-colors active:bg-white/10">
            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Badge variant="outline" className="border-gray-700 text-gray-400 bg-transparent text-[10px] px-1.5 py-0 h-5">
                            {categoryMap[category] || category}
                        </Badge>
                        <span className="font-medium text-gray-300">{author}</span>
                        <span>•</span>
                        <span>{getTimeAgo(date)}</span>
                    </div>
                    <h3 className="font-semibold text-base text-white leading-tight line-clamp-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2">
                        {previewText}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>좋아요 {likeCount}</span>
                        <span>댓글 {commentCount}</span>
                    </div>
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag) => (
                                <span key={tag} className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {imageUrl && (
                    <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-gray-900">
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
}
