import Link from 'next/link';
import { FeedItem } from '@/components/community/FeedItem';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { createPublicClient } from '@/lib/supabase-public';

export const revalidate = 30;

type HomePageProps = {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    page?: string;
  }>;
};

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

type FallbackPostRow = {
  id: string;
  category: string;
  title: string;
  content: string | null;
  image_url: string | null;
  tags: string[] | null;
  created_at: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

type LikeRow = {
  post_id: string;
};

type CommentRow = {
  post_id: string;
};

const FEED_PAGE_SIZE = 20;

const categoryFilters = [
  { label: '전체', value: 'All' },
  { label: '자유', value: 'Free' },
  { label: '질문', value: 'Question' },
  { label: '정보', value: 'Info' },
];

const sortFilters = [
  { label: '최신순', value: 'latest' },
  { label: '인기순', value: 'popular' },
];

const buildHomeHref = (category: string, sort: string, page = 1) => {
  const params = new URLSearchParams();

  if (category !== 'All') {
    params.set('category', category);
  }

  if (sort !== 'latest') {
    params.set('sort', sort);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
};

const parsePositivePage = (rawValue: string | undefined) => {
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

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = createPublicClient();
  const requestedPage = parsePositivePage(resolvedSearchParams.page);
  const selectedCategory = categoryFilters.some(
    (filter) => filter.value === resolvedSearchParams.category
  )
    ? resolvedSearchParams.category!
    : 'All';
  const selectedSort = sortFilters.some((filter) => filter.value === resolvedSearchParams.sort)
    ? resolvedSearchParams.sort!
    : 'latest';

  let totalCountQuery = supabase.from('posts').select('id', { count: 'exact', head: true });
  if (selectedCategory !== 'All') {
    totalCountQuery = totalCountQuery.eq('category', selectedCategory);
  }

  const { count: totalCount, error: totalCountError } = await totalCountQuery;
  if (totalCountError) {
    console.error('Error fetching feed total count:', totalCountError);
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / FEED_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const offset = (currentPage - 1) * FEED_PAGE_SIZE;
  const categoryArg = selectedCategory === 'All' ? null : selectedCategory;

  const { data: rpcPosts, error: rpcError } = await supabase.rpc('get_feed_posts', {
    p_category: categoryArg,
    p_sort: selectedSort,
    p_limit: FEED_PAGE_SIZE,
    p_offset: offset,
  });

  let posts: FeedPost[] = [];

  if (rpcError) {
    // Fallback path for environments where migration SQL has not been applied yet.
    console.error('RPC get_feed_posts failed, using fallback feed query:', rpcError);

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
        profiles:author_id (username)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + FEED_PAGE_SIZE - 1);

    if (selectedCategory !== 'All') {
      fallbackQuery = fallbackQuery.eq('category', selectedCategory);
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

      for (const like of (likesResult.data || []) as LikeRow[]) {
        const target = posts.find((post) => post.id === like.post_id);
        if (target) {
          target.like_count += 1;
          target.score += 2;
        }
      }

      for (const comment of (commentsResult.data || []) as CommentRow[]) {
        const target = posts.find((post) => post.id === comment.post_id);
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
  } else {
    posts = ((rpcPosts || []) as FeedPost[]).map((post) => ({
      ...post,
      like_count: Number(post.like_count || 0),
      comment_count: Number(post.comment_count || 0),
      score: Number(post.score || 0),
      author: post.author || '알 수 없음',
    }));
  }

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between h-14">
        <div className="relative w-32 h-8">
          <img src="/app-logo.png" alt="ImFencer" className="object-contain w-full h-full object-left" />
        </div>
        <div className="flex gap-2" />
      </header>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
        {categoryFilters.map((filter) => (
          <Link
            key={filter.value}
            href={buildHomeHref(filter.value, selectedSort, 1)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === filter.value
                ? 'bg-white text-black'
                : 'bg-gray-900 text-gray-400 border border-gray-800'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-white/5">
        {sortFilters.map((filter) => (
          <Link
            key={filter.value}
            href={buildHomeHref(selectedCategory, filter.value, 1)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedSort === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-400 border border-gray-800'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <main>
        {posts.length > 0 ? (
          posts.map((post) => (
            <FeedItem
              key={post.id}
              id={post.id}
              category={post.category}
              title={post.title}
              previewText={post.content || ''}
              imageUrl={post.image_url}
              tags={post.tags}
              author={post.author}
              date={post.created_at}
              likeCount={post.like_count}
              commentCount={post.comment_count}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
            <p>등록된 게시글이 없습니다.</p>
            <p className="text-xs text-gray-600">첫 번째 글을 작성해보세요!</p>
          </div>
        )}
      </main>

      {totalPages > 1 ? (
        <div className="border-t border-white/5 px-4 py-4 flex items-center justify-between text-xs">
          {currentPage > 1 ? (
            <Link
              href={buildHomeHref(selectedCategory, selectedSort, currentPage - 1)}
              className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-300 hover:bg-gray-800"
            >
              이전
            </Link>
          ) : (
            <span className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1.5 text-gray-600">
              이전
            </span>
          )}

          <span className="text-gray-500">
            {currentPage} / {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link
              href={buildHomeHref(selectedCategory, selectedSort, currentPage + 1)}
              className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-300 hover:bg-gray-800"
            >
              다음
            </Link>
          ) : (
            <span className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1.5 text-gray-600">
              다음
            </span>
          )}
        </div>
      ) : null}

      <FloatingActionButton />
    </div>
  );
}
