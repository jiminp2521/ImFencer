'use client';

import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FeedItem } from '@/components/community/FeedItem';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { preloadSWRLite, useSWRLite } from '@/lib/swr-lite';

type CommunityScope = 'all' | 'weapon' | 'club';

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
};

type HomeFeedResponse = {
  selectedScope: CommunityScope;
  selectedCategory: string;
  selectedSort: string;
  searchText: string;
  currentPage: number;
  canUseClubFeed: boolean;
  canUseWeaponFeed: boolean;
  hasNextPage: boolean;
  posts: FeedPost[];
};

const scopeFilters: { label: string; value: CommunityScope }[] = [
  { label: '전체', value: 'all' },
  { label: '내 종목', value: 'weapon' },
  { label: '내 클럽', value: 'club' },
];

const categoryFilters = [
  { label: '자유', value: 'Free' },
  { label: '질문', value: 'Question' },
  { label: '정보', value: 'Info' },
];

const sortFilters = [
  { label: '최신순', value: 'latest' },
  { label: '인기순', value: 'popular' },
];

const buildHomeHref = (scope: CommunityScope, category: string, sort: string, page = 1, q = '') => {
  const params = new URLSearchParams();

  if (scope !== 'all') {
    params.set('scope', scope);
  }

  if (category !== 'All') {
    params.set('category', category);
  }

  if (sort !== 'latest') {
    params.set('sort', sort);
  }

  if (page > 1) {
    params.set('page', String(page));
  }
  if (q.trim()) {
    params.set('q', q.trim());
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
};

const parsePositivePage = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const fetchHomeFeed = async (url: string): Promise<HomeFeedResponse> => {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch home feed (${response.status})`);
  }

  return response.json() as Promise<HomeFeedResponse>;
};

export function HomePageClient() {
  const searchParams = useSearchParams();

  const selectedScope = scopeFilters.some((filter) => filter.value === searchParams.get('scope'))
    ? (searchParams.get('scope') as CommunityScope)
    : 'all';
  const selectedCategory = categoryFilters.some((filter) => filter.value === searchParams.get('category'))
    ? (searchParams.get('category') as string)
    : 'All';
  const selectedSort = sortFilters.some((filter) => filter.value === searchParams.get('sort'))
    ? (searchParams.get('sort') as string)
    : 'latest';
  const searchText = (searchParams.get('q') || '').trim();
  const requestedPage = parsePositivePage(searchParams.get('page'));
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchText));

  const feedUrl = useMemo(() => {
    const params = new URLSearchParams({
      scope: selectedScope,
      category: selectedCategory,
      sort: selectedSort,
      page: String(requestedPage),
      q: searchText,
    });

    return `/api/home/feed?${params.toString()}`;
  }, [requestedPage, searchText, selectedCategory, selectedScope, selectedSort]);

  const { data, error, isLoading, isValidating, mutate } = useSWRLite(feedUrl, fetchHomeFeed, {
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const posts = data?.posts || [];
  const currentPage = data?.currentPage || requestedPage;
  const hasNextPage = Boolean(data?.hasNextPage);
  const canUseClubFeed = data?.canUseClubFeed ?? selectedScope !== 'club';
  const canUseWeaponFeed = data?.canUseWeaponFeed ?? selectedScope !== 'weapon';
  const selectedScopeLabel = scopeFilters.find((filter) => filter.value === selectedScope)?.label || '전체';

  useEffect(() => {
    if (searchText) {
      setIsSearchOpen(true);
    }
  }, [searchText]);

  useEffect(() => {
    if (!hasNextPage) return;

    const nextPageParams = new URLSearchParams({
      scope: selectedScope,
      category: selectedCategory,
      sort: selectedSort,
      page: String(currentPage + 1),
      q: searchText,
    });

    const nextFeedUrl = `/api/home/feed?${nextPageParams.toString()}`;
    preloadSWRLite(nextFeedUrl, fetchHomeFeed, { staleTime: 30_000 });
  }, [currentPage, hasNextPage, searchText, selectedCategory, selectedScope, selectedSort]);

  return (
    <div className="pb-20 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.2),_rgba(0,0,0,0.96)_42%)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-black via-black/95 to-black/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between h-14">
        <div className="relative">
          <details className="group">
            <summary className="list-none flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white cursor-pointer [&::-webkit-details-marker]:hidden">
              {selectedScopeLabel}
              <ChevronDown className="h-5 w-5 text-gray-300 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[140px] rounded-xl border border-white/10 bg-black/95 p-1.5 shadow-2xl">
              {scopeFilters.map((filter) => (
                <Link
                  key={filter.value}
                  href={buildHomeHref(filter.value, selectedCategory, selectedSort, 1, searchText)}
                  prefetch={false}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedScope === filter.value
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gray-950/80 text-gray-300 hover:bg-gray-900 hover:text-white"
            aria-label="게시글 검색"
          >
            <Search className="h-4 w-4" />
          </button>
          <NotificationBell />
        </div>
      </header>

      {isSearchOpen ? (
        <form action="/" className="border-b border-white/5 px-4 py-2 flex items-center gap-2">
          {selectedScope !== 'all' ? <input type="hidden" name="scope" value={selectedScope} /> : null}
          {selectedCategory !== 'All' ? <input type="hidden" name="category" value={selectedCategory} /> : null}
          {selectedSort !== 'latest' ? <input type="hidden" name="sort" value={selectedSort} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={searchText}
            placeholder="게시글 검색"
            className="h-9 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-500/60"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800"
          >
            검색
          </button>
          {searchText ? (
            <Link
              href={buildHomeHref(selectedScope, selectedCategory, selectedSort, 1, '')}
              prefetch={false}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-3 text-xs font-medium text-gray-300 hover:bg-gray-800"
            >
              초기화
            </Link>
          ) : null}
        </form>
      ) : null}

      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-white/5">
        {categoryFilters.map((filter) => (
          <Link
            key={filter.value}
            href={buildHomeHref(selectedScope, filter.value, selectedSort, 1, searchText)}
            prefetch={false}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors border ${
              selectedCategory === filter.value
                ? 'bg-white text-black border-white'
                : 'bg-gray-900/80 text-gray-400 border-gray-800'
            }`}
          >
            {filter.label}
          </Link>
        ))}

        <div className="h-4 w-px shrink-0 bg-white/15 mx-0.5" />

        {sortFilters.map((filter) => (
          <Link
            key={filter.value}
            href={buildHomeHref(selectedScope, selectedCategory, filter.value, 1, searchText)}
            prefetch={false}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors border ${
              selectedSort === filter.value
                ? 'bg-blue-600/80 text-white border-blue-500/60'
                : 'bg-gray-900/80 text-gray-400 border-gray-800'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <main className="animate-imfencer-fade-up">
        {error ? (
          <div className="px-4 py-10 text-center space-y-3">
            <p className="text-sm text-red-300">피드를 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => {
                void mutate();
              }}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-medium text-white"
            >
              다시 시도
            </button>
          </div>
        ) : isLoading && posts.length === 0 ? (
          <div className="divide-y divide-white/10">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`feed-skeleton-${index}`} className="p-4 space-y-2 animate-pulse">
                <div className="h-3 w-32 rounded bg-gray-800" />
                <div className="h-4 w-3/4 rounded bg-gray-800" />
                <div className="h-3 w-full rounded bg-gray-900" />
                <div className="h-3 w-2/3 rounded bg-gray-900" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div>
            {posts.map((post) => (
              <FeedItem
                key={post.id}
                id={post.id}
                category={post.category}
                title={post.title}
                previewText={post.content || '내용 없음'}
                imageUrl={post.image_url}
                tags={post.tags}
                author={post.author}
                date={post.created_at}
                likeCount={post.like_count}
                commentCount={post.comment_count}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-20 text-center space-y-2 text-gray-500">
            {selectedScope === 'club' && !canUseClubFeed ? (
              <>
                <p className="text-white font-semibold">내 클럽 커뮤니티는 로그인 후 이용할 수 있습니다.</p>
                <Link
                  href="/login?next=%2F%3Fscope%3Dclub"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white"
                >
                  로그인하기
                </Link>
              </>
            ) : selectedScope === 'weapon' && !canUseWeaponFeed ? (
              <>
                <p className="text-white font-semibold">내 종목 커뮤니티는 로그인 후 종목 설정이 필요합니다.</p>
                <Link
                  href="/login?next=%2Fsignup%2Fprofile"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white"
                >
                  로그인하고 종목 설정하기
                </Link>
              </>
            ) : (
              <>
                <p>게시글이 없습니다.</p>
                <p className="text-xs text-gray-600">첫 게시글을 작성해보세요.</p>
              </>
            )}
          </div>
        )}
      </main>

      {currentPage > 1 || hasNextPage ? (
        <div className="border-t border-white/5 px-4 py-4 flex items-center justify-between text-xs">
          {currentPage > 1 ? (
            <Link
              href={buildHomeHref(selectedScope, selectedCategory, selectedSort, currentPage - 1, searchText)}
              prefetch={false}
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
            {currentPage}페이지
            {isValidating ? ' • 갱신중' : ''}
          </span>

          {hasNextPage ? (
            <Link
              href={buildHomeHref(selectedScope, selectedCategory, selectedSort, currentPage + 1, searchText)}
              prefetch={false}
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
