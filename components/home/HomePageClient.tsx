'use client';

import Link from 'next/link';
import Image from 'next/image';
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

  const selectedSortLabel = sortFilters.find((filter) => filter.value === selectedSort)?.label || '최신순';

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
    <div className="imf-page">
      <header className="imf-topbar">
        <div className="imf-logo">
          <Image
            src="/app-logo.png"
            alt="ImFencer"
            width={128}
            height={32}
            className="object-contain w-full h-full object-left"
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
            }}
            className="imf-icon-button"
            aria-label="게시글 검색"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="px-4 pt-3">
        <div className="imf-panel p-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {scopeFilters.map((filter) => {
              const active = selectedScope === filter.value;
              return (
                <Link
                  key={filter.value}
                  href={buildHomeHref(filter.value, selectedCategory, selectedSort, 1, searchText)}
                  prefetch={false}
                  className={`imf-chip h-9 px-4 text-sm ${active ? 'imf-chip-active' : ''}`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pt-2">
        <div className="imf-panel flex items-center gap-2 overflow-x-auto no-scrollbar p-2">
          <details className="group relative shrink-0">
            <summary className="imf-chip list-none flex h-9 items-center gap-1.5 px-3 cursor-pointer [&::-webkit-details-marker]:hidden">
              {selectedSortLabel}
              <ChevronDown className="h-3.5 w-3.5 text-slate-300 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[128px] rounded-xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl">
              {sortFilters.map((filter) => (
                <Link
                  key={filter.value}
                  href={buildHomeHref(selectedScope, selectedCategory, filter.value, 1, searchText)}
                  prefetch={false}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedSort === filter.value
                      ? 'bg-white text-black'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </details>

          {categoryFilters.map((filter) => {
            const active = selectedCategory === filter.value;
            const nextCategory = active ? 'All' : filter.value;

            return (
              <Link
                key={filter.value}
                href={buildHomeHref(selectedScope, nextCategory, selectedSort, 1, searchText)}
                prefetch={false}
                className={`imf-chip h-9 ${active ? 'imf-chip-active' : ''}`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {isSearchOpen ? (
        <form action="/" className="px-4 pt-2">
          <div className="imf-panel flex items-center gap-2 p-2.5">
            {selectedScope !== 'all' ? <input type="hidden" name="scope" value={selectedScope} /> : null}
            {selectedCategory !== 'All' ? <input type="hidden" name="category" value={selectedCategory} /> : null}
            {selectedSort !== 'latest' ? <input type="hidden" name="sort" value={selectedSort} /> : null}
            <input
              type="text"
              name="q"
              defaultValue={searchText}
              placeholder="게시글 검색"
              className="h-9 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-white/70"
            />
            <button
              type="submit"
              className="h-9 rounded-xl bg-white px-3 text-xs font-semibold text-black hover:bg-slate-200"
            >
              검색
            </button>
            {searchText ? (
              <Link
                href={buildHomeHref(selectedScope, selectedCategory, selectedSort, 1, '')}
                prefetch={false}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                초기화
              </Link>
            ) : null}
          </div>
        </form>
      ) : null}

      <main className="animate-imfencer-fade-up px-4 py-3">
        {error ? (
          <div className="imf-panel py-10 text-center space-y-3">
            <p className="text-sm text-red-300">피드를 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => {
                void mutate();
              }}
              className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
            >
              다시 시도
            </button>
          </div>
        ) : isLoading && posts.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`feed-skeleton-${index}`} className="imf-panel animate-pulse space-y-2">
                <div className="h-3 w-32 rounded bg-slate-800" />
                <div className="h-4 w-3/4 rounded bg-slate-800" />
                <div className="h-3 w-full rounded bg-slate-900" />
                <div className="h-3 w-2/3 rounded bg-slate-900" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-2">
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
          <div className="imf-panel py-16 text-center space-y-2 text-slate-400">
            {selectedScope === 'club' && !canUseClubFeed ? (
              <>
                <p className="font-semibold text-white">내 클럽 커뮤니티는 로그인 후 이용할 수 있습니다.</p>
                <Link
                  href="/login?next=%2F%3Fscope%3Dclub"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm text-black hover:bg-slate-200"
                >
                  로그인
                </Link>
              </>
            ) : selectedScope === 'weapon' && !canUseWeaponFeed ? (
              <>
                <p className="font-semibold text-white">내 종목 커뮤니티는 로그인 후 종목 설정이 필요합니다.</p>
                <Link
                  href="/login?next=%2Fsignup%2Fprofile"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm text-black hover:bg-slate-200"
                >
                  종목 설정하기
                </Link>
              </>
            ) : (
              <>
                <p>게시글이 없습니다.</p>
                <p className="text-xs text-slate-500">첫 게시글을 작성해보세요.</p>
              </>
            )}
          </div>
        )}
      </main>

      {currentPage > 1 || hasNextPage ? (
        <div className="px-4 pb-4">
          <div className="imf-panel flex items-center justify-between text-xs">
            {currentPage > 1 ? (
              <Link
                href={buildHomeHref(selectedScope, selectedCategory, selectedSort, currentPage - 1, searchText)}
                prefetch={false}
                className="imf-pill border-slate-600 px-3 py-1.5 hover:border-slate-500"
              >
                이전
              </Link>
            ) : (
              <span className="imf-pill border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-600">
                이전
              </span>
            )}

            <span className="text-slate-400">
              {currentPage}페이지
              {isValidating ? ' • 갱신중' : ''}
            </span>

            {hasNextPage ? (
              <Link
                href={buildHomeHref(selectedScope, selectedCategory, selectedSort, currentPage + 1, searchText)}
                prefetch={false}
                className="imf-pill border-slate-600 px-3 py-1.5 hover:border-slate-500"
              >
                다음
              </Link>
            ) : (
              <span className="imf-pill border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-600">
                다음
              </span>
            )}
          </div>
        </div>
      ) : null}

      <FloatingActionButton />
    </div>
  );
}
