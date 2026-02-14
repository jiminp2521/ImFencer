import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase-server';

type PostPageProps = {
  params: Promise<{ id: string }>;
};

const categoryMap: Record<string, string> = {
  Free: '자유',
  Info: '정보',
  Question: '질문',
};

export default async function PostDetailPage({ params }: PostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id,
      category,
      title,
      content,
      image_url,
      tags,
      created_at,
      profiles:author_id (username, weapon_type)
    `)
    .eq('id', id)
    .single();

  if (error || !post) {
    notFound();
  }

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const createdAt = new Date(post.created_at).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">게시글</h1>
      </header>

      <main className="px-4 py-5 space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Badge variant="outline" className="border-gray-700 text-gray-400 bg-transparent text-[10px] px-1.5 py-0 h-5">
            {categoryMap[post.category] || post.category}
          </Badge>
          <span className="font-medium text-gray-300">{profile?.username || '알 수 없음'}</span>
          {profile?.weapon_type && <span>• {profile.weapon_type}</span>}
          <span>•</span>
          <span>{createdAt}</span>
        </div>

        <h2 className="text-xl font-bold text-white leading-tight">{post.title}</h2>

        {post.image_url && (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <img src={post.image_url} alt={post.title} className="w-full max-h-96 object-cover" />
          </div>
        )}

        <article className="text-sm leading-7 text-gray-200 whitespace-pre-wrap">
          {post.content || '내용이 없습니다.'}
        </article>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
