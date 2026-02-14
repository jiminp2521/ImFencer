import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-server';

const categoryMap: Record<string, string> = {
  Free: '자유',
  Info: '정보',
  Question: '질문',
};

type PostRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

export default async function MyPostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fprofile%2Fposts');
  }

  const [countResult, postsResult] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase
      .from('posts')
      .select('id, title, category, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  if (countResult.error) {
    console.error('Error fetching my posts count:', countResult.error);
  }
  if (postsResult.error) {
    console.error('Error fetching my posts:', postsResult.error);
  }

  const posts = (postsResult.data || []) as PostRow[];
  const totalCount = countResult.count || posts.length;

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-semibold text-white">내가 쓴 글</h1>
        </div>
        <Badge variant="outline" className="border-gray-700 bg-transparent text-gray-300">
          {totalCount}개
        </Badge>
      </header>

      <main className="p-4 space-y-2">
        {posts.length > 0 ? (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 hover:bg-gray-900/70 transition-colors"
            >
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span>{categoryMap[post.category] || post.category}</span>
                <span>•</span>
                <span>
                  {new Date(post.created_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-100 line-clamp-1">{post.title}</p>
            </Link>
          ))
        ) : (
          <Card className="bg-gray-950 border-gray-800 p-6 text-center text-sm text-gray-500">
            아직 작성한 게시글이 없습니다.
          </Card>
        )}
      </main>
    </div>
  );
}

