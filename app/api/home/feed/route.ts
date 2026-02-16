import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-public';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { withApiTiming } from '@/lib/api-timing';

export const dynamic = 'force-dynamic';

const FEED_PAGE_SIZE = 20;
const VALID_SCOPES = new Set(['all', 'club']);
const VALID_CATEGORIES = new Set(['All', 'Free', 'Question', 'Info']);
const VALID_SORTS = new Set(['latest', 'popular']);

type CommunityScope = 'all' | 'club';

type FeedPost = {
  id: string;
  category: string;
  title: string;
  content: string | null;
  image_url: string | null;
  tags: string[] | null;
  created_at: string;
  author: string;
  like_count: number;
  comment_count: number;
  score: number;
};

type FallbackProfile = {
  username: string | null;
  club_id?: string | null;
};

type FallbackPostRow = {
  id: string;
  category: string;
  title: string;
  content: string | null;
  image_url: string | null;
  tags: string[] | null;
  created_at: string;
  profiles: FallbackProfile | FallbackProfile[] | null;
};

type LikeRow = {
  post_id: string;
};

type CommentRow = {
  post_id: string;
};

const parsePositivePage = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const pickProfile = (profiles: FallbackPostRow['profiles']) => {
  if (Array.isArray(profiles)) {
    return profiles[0] || null;
  }
  return profiles;
};

export async function GET(request: NextRequest) {
  return withApiTiming('home-feed', async () => {
    const { searchParams } = new URL(request.url);

    const selectedScope: CommunityScope = VALID_SCOPES.has(searchParams.get('scope') || '')
      ? (searchParams.get('scope') as CommunityScope)
      : 'all';
    const selectedCategory = VALID_CATEGORIES.has(searchParams.get('category') || '')
      ? (searchParams.get('category') as string)
      : 'All';
    const selectedSort = VALID_SORTS.has(searchParams.get('sort') || '')
      ? (searchParams.get('sort') as string)
      : 'latest';
    const currentPage = parsePositivePage(searchParams.get('page'));

    const supabase = createPublicClient();

    let userId: string | null = null;
    let myClubId: string | null = null;

    if (selectedScope === 'club') {
      const serverSupabase = await createServerClient();
      const {
        data: { user },
      } = await serverSupabase.auth.getUser();

      if (user) {
        userId = user.id;
        const myProfileResult = await serverSupabase
          .from('profiles')
          .select('club_id')
          .eq('id', user.id)
          .maybeSingle();

        if (myProfileResult.error) {
          console.error('Error fetching my profile club:', myProfileResult.error);
        } else {
          myClubId = myProfileResult.data?.club_id || null;
        }
      }
    }

    const canUseClubFeed = Boolean(userId && myClubId);
    const offset = (currentPage - 1) * FEED_PAGE_SIZE;
    const categoryArg = selectedCategory === 'All' ? null : selectedCategory;

    let posts: FeedPost[] = [];

    const shouldUseRpc = selectedScope === 'all';
    const rpcResult = shouldUseRpc
      ? await supabase.rpc('get_feed_posts', {
          p_category: categoryArg,
          p_sort: selectedSort,
          p_limit: FEED_PAGE_SIZE + 1,
          p_offset: offset,
        })
      : { data: null, error: null };

    if (rpcResult.error) {
      console.error('RPC get_feed_posts failed, using fallback feed query:', rpcResult.error);
    }

    if (shouldUseRpc && !rpcResult.error) {
      posts = ((rpcResult.data || []) as FeedPost[]).map((post) => ({
        ...post,
        like_count: Number(post.like_count || 0),
        comment_count: Number(post.comment_count || 0),
        score: Number(post.score || 0),
        author: post.author || '알 수 없음',
      }));
    } else if (selectedScope === 'club' && !canUseClubFeed) {
      posts = [];
    } else {
      let fallbackQuery = supabase
        .from('posts')
        .select(`
          id,
          category,
          title,
          content,
          image_url,
          tags,
          created_at,
          profiles:author_id${selectedScope === 'club' ? '!inner' : ''} (username, club_id)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + FEED_PAGE_SIZE);

      if (selectedCategory !== 'All') {
        fallbackQuery = fallbackQuery.eq('category', selectedCategory);
      }

      if (selectedScope === 'club' && myClubId) {
        fallbackQuery = fallbackQuery.eq('profiles.club_id', myClubId);
      }

      const { data: fallbackRows, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        console.error('Fallback feed query failed:', fallbackError);
      }

      const fallbackPosts = (fallbackRows || []) as unknown as FallbackPostRow[];
      posts = fallbackPosts.map((post) => {
        const profile = pickProfile(post.profiles);
        return {
          id: post.id,
          category: post.category,
          title: post.title,
          content: post.content,
          image_url: post.image_url,
          tags: post.tags,
          created_at: post.created_at,
          author: profile?.username || '알 수 없음',
          like_count: 0,
          comment_count: 0,
          score: 0,
        };
      });

      const postIds = posts.map((post) => post.id);
      if (postIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          supabase.from('post_likes').select('post_id').in('post_id', postIds),
          supabase
            .from('comments')
            .select('post_id')
            .in('post_id', postIds)
            .is('parent_id', null),
        ]);

        if (likesResult.error) {
          console.error('Error fetching likes for fallback feed:', likesResult.error);
        }
        if (commentsResult.error) {
          console.error('Error fetching comments for fallback feed:', commentsResult.error);
        }

        const postMap = new Map(posts.map((post) => [post.id, post]));

        for (const like of (likesResult.data || []) as LikeRow[]) {
          const target = postMap.get(like.post_id);
          if (target) {
            target.like_count += 1;
            target.score += 2;
          }
        }

        for (const comment of (commentsResult.data || []) as CommentRow[]) {
          const target = postMap.get(comment.post_id);
          if (target) {
            target.comment_count += 1;
            target.score += 1;
          }
        }
      }

      if (selectedSort === 'popular') {
        posts.sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }

          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        });
      }
    }

    const hasNextPage = posts.length > FEED_PAGE_SIZE;
    const visiblePosts = hasNextPage ? posts.slice(0, FEED_PAGE_SIZE) : posts;

    return NextResponse.json({
      selectedScope,
      selectedCategory,
      selectedSort,
      currentPage,
      canUseClubFeed,
      hasNextPage,
      posts: visiblePosts,
    });
  });
}
