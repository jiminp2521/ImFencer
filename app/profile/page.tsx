import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-server';

const categoryMap: Record<string, string> = {
  Free: '자유',
  Info: '정보',
  Question: '질문',
};

const weaponMap: Record<string, string> = {
  Fleuret: '플뢰레',
  Epee: '에페',
  Sabre: '사브르',
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

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [
    profileResult,
    authoredPostsResult,
    recentPostsResult,
    commentsCountResult,
    bookmarkCountResult,
    awardCountResult,
    bookmarkedPostsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, weapon_type, tier, avatar_url, user_type, club_id')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('posts').select('id').eq('author_id', user.id),
    supabase
      .from('posts')
      .select('id, title, category, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id),
    supabase
      .from('post_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('awards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('post_bookmarks')
      .select(`
        created_at,
        posts:post_id (
          id,
          title,
          category,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  if (profileResult.error) {
    console.error('Error fetching profile:', profileResult.error);
  }
  if (authoredPostsResult.error) {
    console.error('Error fetching authored posts:', authoredPostsResult.error);
  }
  if (recentPostsResult.error) {
    console.error('Error fetching recent posts:', recentPostsResult.error);
  }
  if (commentsCountResult.error) {
    console.error('Error fetching comments count:', commentsCountResult.error);
  }
  if (bookmarkCountResult.error) {
    console.error('Error fetching bookmark count:', bookmarkCountResult.error);
  }
  if (awardCountResult.error) {
    console.error('Error fetching award count:', awardCountResult.error);
  }
  if (bookmarkedPostsResult.error) {
    console.error('Error fetching bookmarked posts:', bookmarkedPostsResult.error);
  }

  const authoredPostIds = (authoredPostsResult.data || []).map((post) => post.id);
  const { count: receivedLikeCount = 0, error: receivedLikeError } =
    authoredPostIds.length > 0
      ? await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', authoredPostIds)
      : { count: 0, error: null };

  if (receivedLikeError) {
    console.error('Error fetching received likes:', receivedLikeError);
  }

  const profile = profileResult.data;
  const clubResult = profile?.club_id
    ? await supabase
        .from('fencing_clubs')
        .select('name')
        .eq('id', profile.club_id)
        .maybeSingle()
    : { data: null, error: null };

  if (clubResult.error && clubResult.error.code !== '42P01') {
    console.error('Error fetching my club:', clubResult.error);
  }

  const displayName = profile?.username || user.email?.split('@')[0] || 'Fencer';
  const weaponLabel = profile?.weapon_type ? weaponMap[profile.weapon_type] || profile.weapon_type : '미설정';
  const clubName = clubResult.data?.name || null;

  const recentPosts = recentPostsResult.data || [];
  const bookmarkedPosts = ((bookmarkedPostsResult.data || []) as unknown as BookmarkedPostRow[])
    .map((bookmark) => ({
      bookmarkedAt: bookmark.created_at,
      post: Array.isArray(bookmark.posts) ? bookmark.posts[0] : bookmark.posts,
    }))
    .filter((item): item is BookmarkedPostView => Boolean(item.post));

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-white">My Page</h1>
        <Badge variant="outline" className="border-gray-700 bg-transparent text-gray-300">
          {profile?.tier || 'Bronze'} Tier
        </Badge>
      </header>

      <div className="p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-white/10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-sm text-gray-400">
              {weaponLabel}
              {profile?.user_type ? ` • ${profile.user_type}` : ''}
              {clubName ? ` • ${clubName}` : ''}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{authoredPostIds.length}</div>
            <div className="text-xs text-gray-500">내 게시글</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{receivedLikeCount}</div>
            <div className="text-xs text-gray-500">받은 좋아요</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{commentsCountResult.count || 0}</div>
            <div className="text-xs text-gray-500">작성 댓글</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{bookmarkCountResult.count || 0}</div>
            <div className="text-xs text-gray-500">북마크</div>
          </Card>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">최근 작성한 글</h3>
            <span className="text-xs text-gray-500">{recentPosts.length}개 표시</span>
          </div>
          {recentPosts.length > 0 ? (
            <div className="space-y-2">
              {recentPosts.map((post) => (
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
              ))}
            </div>
          ) : (
            <Card className="bg-gray-950 border-gray-800 p-4 text-center text-sm text-gray-500">
              아직 작성한 게시글이 없습니다.
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">북마크한 글</h3>
            <span className="text-xs text-gray-500">{bookmarkCountResult.count || 0}개</span>
          </div>
          {bookmarkedPosts.length > 0 ? (
            <div className="space-y-2">
              {bookmarkedPosts.map((item) => (
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
              ))}
            </div>
          ) : (
            <Card className="bg-gray-950 border-gray-800 p-4 text-center text-sm text-gray-500">
              북마크한 글이 없습니다.
            </Card>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-gray-950 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">수상 인증</h3>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              {awardCountResult.count || 0}개
            </Badge>
          </div>
          <p className="mt-2 text-xs text-gray-500">수상 인증 등록 기능은 다음 단계에서 연결됩니다.</p>
        </section>
      </div>
    </div>
  );
}
