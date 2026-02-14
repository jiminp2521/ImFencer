import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase-server';
import { PostInteractions } from '@/components/community/PostInteractions';
import { StartChatButton } from '@/components/chat/StartChatButton';

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
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

  const [likesResult, likedResult, bookmarkedResult, commentsResult] = await Promise.all([
    supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id),
    user
      ? supabase
          .from('post_likes')
          .select('post_id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? supabase
          .from('post_bookmarks')
          .select('post_id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('comments')
      .select(`
        id,
        author_id,
        content,
        created_at,
        profiles:author_id (username)
      `)
      .eq('post_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: true }),
  ]);

  if (likesResult.error) {
    console.error('Error fetching likes count:', likesResult.error);
  }

  if (likedResult.error) {
    console.error('Error fetching like status:', likedResult.error);
  }

  if (bookmarkedResult.error) {
    console.error('Error fetching bookmark status:', bookmarkedResult.error);
  }

  if (commentsResult.error) {
    console.error('Error fetching comments:', commentsResult.error);
  }

  const comments = (commentsResult.data || []).map((comment) => {
    const commentProfile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;

    return {
      id: comment.id,
      authorId: comment.author_id,
      content: comment.content || '',
      createdAt: comment.created_at,
      author: commentProfile?.username || '알 수 없음',
    };
  });

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <Badge variant="outline" className="border-gray-700 text-gray-400 bg-transparent text-[10px] px-1.5 py-0 h-5">
              {categoryMap[post.category] || post.category}
            </Badge>
            <Link
              href={`/users/${post.author_id}?next=${encodeURIComponent(`/posts/${post.id}`)}`}
              className="font-medium text-gray-300 hover:text-white transition-colors"
            >
              {profile?.username || '알 수 없음'}
            </Link>
            {profile?.weapon_type && <span>• {profile.weapon_type}</span>}
            <span>•</span>
            <span>{createdAt}</span>
          </div>
          <StartChatButton
            targetUserId={post.author_id}
            contextTitle={post.title}
            openingMessage={`${post.title} 게시글 문의드립니다.`}
            loginNext={`/posts/${post.id}`}
            label="채팅"
            size="xs"
            variant="ghost"
            className="shrink-0 text-gray-300 hover:text-white"
          />
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

        <PostInteractions
          postId={post.id}
          postTitle={post.title}
          postAuthorId={post.author_id}
          currentUserId={user?.id || null}
          initialLiked={Boolean(likedResult.data)}
          initialBookmarked={Boolean(bookmarkedResult.data)}
          initialLikeCount={likesResult.count || 0}
          initialComments={comments}
        />
      </main>
    </div>
  );
}
