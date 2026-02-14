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

type BookmarkedPostRow = {
  created_at: string;
  posts: {
    id: string;
    title: string;
    category: string;
    created_at: string;
  } | null;
};

type BookmarkedPostView = {
  bookmarkedAt: string;
  post: {
    id: string;
    title: string;
    category: string;
    created_at: string;
  };
};

export default async function MyBookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fprofile%2Fbookmarks');
  }

  const [countResult, bookmarksResult] = await Promise.all([
    supabase
      .from('post_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('post_bookmarks')
      .select(
        `
        created_at,
        posts:post_id (
          id,
          title,
          category,
          created_at
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  if (countResult.error) {
    console.error('Error fetching bookmark count:', countResult.error);
  }
  if (bookmarksResult.error) {
    console.error('Error fetching bookmarks:', bookmarksResult.error);
  }

  const bookmarkedPosts = ((bookmarksResult.data || []) as unknown as BookmarkedPostRow[])
    .map((bookmark) => ({
      bookmarkedAt: bookmark.created_at,
      post: Array.isArray(bookmark.posts) ? bookmark.posts[0] : bookmark.posts,
    }))
    .filter((item): item is BookmarkedPostView => Boolean(item.post));

  const totalCount = countResult.count || bookmarkedPosts.length;

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-semibold text-white">북마크</h1>
        </div>
        <Badge variant="outline" className="border-gray-700 bg-transparent text-gray-300">
          {totalCount}개
        </Badge>
      </header>

      <main className="p-4 space-y-2">
        {bookmarkedPosts.length > 0 ? (
          bookmarkedPosts.map((item) => (
            <Link
              key={`${item.post.id}-${item.bookmarkedAt}`}
              href={`/posts/${item.post.id}`}
              className="block rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 hover:bg-gray-900/70 transition-colors"
            >
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span>{categoryMap[item.post.category] || item.post.category}</span>
                <span>•</span>
                <span>
                  저장{' '}
                  {new Date(item.bookmarkedAt).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-100 line-clamp-1">{item.post.title}</p>
            </Link>
          ))
        ) : (
          <Card className="bg-gray-950 border-gray-800 p-6 text-center text-sm text-gray-500">
            북마크한 글이 없습니다.
          </Card>
        )}
      </main>
    </div>
  );
}

