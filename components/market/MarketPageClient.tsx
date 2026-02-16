'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSWRLite } from '@/lib/swr-lite';

type MarketProfile = {
  username: string | null;
};

type MarketItem = {
  id: string;
  title: string;
  price: number;
  status: string;
  weapon_type: string | null;
  brand: string | null;
  condition: string | null;
  image_url: string | null;
  created_at: string;
  profiles: MarketProfile | MarketProfile[] | null;
};

type MarketFeedResponse = {
  selectedStatus: string;
  selectedWeapon: string;
  searchText: string;
  currentPage: number;
  hasNextPage: boolean;
  items: MarketItem[];
};

const statusFilters = [
  { label: '전체', value: 'All' },
  { label: '판매중', value: 'selling' },
  { label: '예약중', value: 'reserved' },
  { label: '판매완료', value: 'sold' },
];

const weaponFilters = [
  { label: '전체 종목', value: 'All' },
  { label: '에페', value: 'Epee' },
  { label: '사브르', value: 'Sabre' },
  { label: '플뢰레', value: 'Fleuret' },
];

const statusLabelMap: Record<string, string> = {
  selling: '판매중',
  reserved: '예약중',
  sold: '판매완료',
};

const statusStyleMap: Record<string, string> = {
  selling: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400',
  reserved: 'border-amber-600/40 bg-amber-500/10 text-amber-400',
  sold: 'border-gray-700 bg-gray-800/60 text-gray-300',
};

const weaponLabelMap: Record<string, string> = {
  Epee: '에페',
  Sabre: '사브르',
  Fleuret: '플뢰레',
};

const buildMarketHref = (status: string, weapon: string, q: string, page = 1) => {
  const params = new URLSearchParams();

  if (status !== 'All') {
    params.set('status', status);
  }

  if (weapon !== 'All') {
    params.set('weapon', weapon);
  }

  if (q.trim()) {
    params.set('q', q.trim());
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/market?${query}` : '/market';
};

const parsePositivePage = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  return `${Math.floor(diffInSeconds / 86400)}일 전`;
};

const fetchMarketFeed = async (url: string): Promise<MarketFeedResponse> => {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market feed (${response.status})`);
  }

  return response.json() as Promise<MarketFeedResponse>;
};

export function MarketPageClient() {
  const searchParams = useSearchParams();

  const selectedStatus = statusFilters.some((filter) => filter.value === searchParams.get('status'))
    ? (searchParams.get('status') as string)
    : 'All';
  const selectedWeapon = weaponFilters.some((filter) => filter.value === searchParams.get('weapon'))
    ? (searchParams.get('weapon') as string)
    : 'All';
  const searchText = (searchParams.get('q') || '').trim();
  const requestedPage = parsePositivePage(searchParams.get('page'));

  const marketFeedUrl = useMemo(() => {
    const params = new URLSearchParams({
      status: selectedStatus,
      weapon: selectedWeapon,
      q: searchText,
      page: String(requestedPage),
    });

    return `/api/market/feed?${params.toString()}`;
  }, [requestedPage, searchText, selectedStatus, selectedWeapon]);

  const { data, error, isLoading, isValidating, mutate } = useSWRLite(marketFeedUrl, fetchMarketFeed, {
    staleTime: 25_000,
  });

  const items = data?.items || [];
  const currentPage = data?.currentPage || requestedPage;
  const hasNextPage = Boolean(data?.hasNextPage);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">마켓</h1>
        <Button asChild size="sm" className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs">
          <Link href="/market/write" prefetch={false}>판매글 등록</Link>
        </Button>
      </header>

      <div className="space-y-2 border-b border-white/5 px-4 py-3">
        <form action="/market" className="flex gap-2">
          {selectedStatus !== 'All' ? <input type="hidden" name="status" value={selectedStatus} /> : null}
          {selectedWeapon !== 'All' ? <input type="hidden" name="weapon" value={selectedWeapon} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={searchText}
            placeholder="상품명/브랜드 검색"
            className="h-9 w-full rounded-md border border-gray-800 bg-gray-950 px-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-500/60"
          />
          <Button
            type="submit"
            variant="outline"
            className="h-9 border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-900"
          >
            검색
          </Button>
        </form>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildMarketHref(filter.value, selectedWeapon, searchText, 1)}
              prefetch={false}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedStatus === filter.value
                  ? 'bg-white text-black'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {weaponFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildMarketHref(selectedStatus, filter.value, searchText, 1)}
              prefetch={false}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedWeapon === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {searchText ? (
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>&quot;{searchText}&quot; 검색 중</span>
            <Link href={buildMarketHref(selectedStatus, selectedWeapon, '', 1)} className="text-gray-400 hover:text-gray-200" prefetch={false}>
              검색 해제
            </Link>
          </div>
        ) : null}
      </div>

      <main>
        {error ? (
          <div className="px-4 py-10 text-center space-y-3">
            <p className="text-sm text-red-300">마켓 목록을 불러오지 못했습니다.</p>
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
        ) : isLoading && items.length === 0 ? (
          <div className="divide-y divide-white/10">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={`market-skeleton-${index}`} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-20 w-20 rounded-md bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-gray-800" />
                    <div className="h-4 w-1/3 rounded bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="divide-y divide-white/10">
            {items.map((item) => {
              const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
              const statusClass = statusStyleMap[item.status] || 'border-gray-700 bg-gray-800/60 text-gray-300';

              return (
                <Link
                  key={item.id}
                  href={`/market/${item.id}`}
                  prefetch={false}
                  className="block p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-20 w-20 rounded-md border border-white/10 object-cover shrink-0 bg-gray-900"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-md border border-white/10 bg-gray-900 shrink-0 flex items-center justify-center text-[10px] text-gray-600">
                        NO IMAGE
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white line-clamp-1">{item.title}</p>
                        <Badge className={`border ${statusClass}`}>{statusLabelMap[item.status] || item.status}</Badge>
                      </div>

                      <p className="text-base font-bold text-blue-400">{item.price.toLocaleString('ko-KR')}원</p>

                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap">
                        {item.weapon_type && <span>{weaponLabelMap[item.weapon_type] || item.weapon_type}</span>}
                        {item.brand && (
                          <>
                            <span>•</span>
                            <span>{item.brand}</span>
                          </>
                        )}
                        {item.condition && (
                          <>
                            <span>•</span>
                            <span>{item.condition}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>{profile?.username || '알 수 없음'}</span>
                        <span>•</span>
                        <span>{getTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-20 text-center space-y-2 text-gray-500">
            <p>등록된 판매글이 없습니다.</p>
            <p className="text-xs text-gray-600">첫 번째 판매글을 등록해보세요.</p>
          </div>
        )}
      </main>

      {currentPage > 1 || hasNextPage ? (
        <div className="border-t border-white/5 px-4 py-4 flex items-center justify-between text-xs">
          {currentPage > 1 ? (
            <Link
              href={buildMarketHref(selectedStatus, selectedWeapon, searchText, currentPage - 1)}
              className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-300 hover:bg-gray-800"
              prefetch={false}
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
              href={buildMarketHref(selectedStatus, selectedWeapon, searchText, currentPage + 1)}
              className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-300 hover:bg-gray-800"
              prefetch={false}
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
    </div>
  );
}
