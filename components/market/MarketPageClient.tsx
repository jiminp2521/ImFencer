'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { preloadSWRLite, useSWRLite } from '@/lib/swr-lite';

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
  selling: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  reserved: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  sold: 'border-slate-600 bg-slate-700/60 text-slate-200',
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
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchText));

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
    keepPreviousData: true,
  });

  const items = data?.items || [];
  const currentPage = data?.currentPage || requestedPage;
  const hasNextPage = Boolean(data?.hasNextPage);

  useEffect(() => {
    if (searchText) {
      setIsSearchOpen(true);
    }
  }, [searchText]);

  useEffect(() => {
    if (!hasNextPage) return;

    const nextPageParams = new URLSearchParams({
      status: selectedStatus,
      weapon: selectedWeapon,
      q: searchText,
      page: String(currentPage + 1),
    });

    const nextFeedUrl = `/api/market/feed?${nextPageParams.toString()}`;
    preloadSWRLite(nextFeedUrl, fetchMarketFeed, { staleTime: 25_000 });
  }, [currentPage, hasNextPage, searchText, selectedStatus, selectedWeapon]);

  return (
    <div className="imf-page">
      <header className="imf-topbar">
        <div className="imf-logo">
          <img src="/app-logo.png" alt="ImFencer" className="object-contain w-full h-full object-left" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
            }}
            className="imf-icon-button"
            aria-label="마켓 검색"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="px-4 pt-3 space-y-2">
        <div className="imf-panel p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">장비/용품 거래</p>
            <Button asChild size="sm" className="h-8 rounded-full bg-blue-600 px-3 text-xs text-white hover:bg-blue-500">
              <Link href="/market/write" prefetch={false}>판매글 등록</Link>
            </Button>
          </div>

          <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildMarketHref(filter.value, selectedWeapon, searchText, 1)}
                prefetch={false}
                className={`imf-chip ${selectedStatus === filter.value ? 'imf-chip-active' : ''}`}
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
                className={`imf-chip ${selectedWeapon === filter.value ? 'imf-chip-active' : ''}`}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {searchText ? (
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>&quot;{searchText}&quot; 검색 중</span>
              <Link href={buildMarketHref(selectedStatus, selectedWeapon, '', 1)} className="text-slate-300 hover:text-slate-100" prefetch={false}>
                검색 해제
              </Link>
            </div>
          ) : null}
        </div>

        {isSearchOpen ? (
          <form action="/market" className="imf-panel flex gap-2 p-2.5">
            {selectedStatus !== 'All' ? <input type="hidden" name="status" value={selectedStatus} /> : null}
            {selectedWeapon !== 'All' ? <input type="hidden" name="weapon" value={selectedWeapon} /> : null}
            <input
              type="text"
              name="q"
              defaultValue={searchText}
              placeholder="상품명/브랜드 검색"
              className="h-9 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500/70"
            />
            <Button
              type="submit"
              className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500"
            >
              검색
            </Button>
          </form>
        ) : null}
      </section>

      <main className="animate-imfencer-fade-up px-4 py-2">
        {error ? (
          <div className="imf-panel py-10 text-center space-y-3">
            <p className="text-sm text-red-300">마켓 목록을 불러오지 못했습니다.</p>
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
        ) : isLoading && items.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={`market-skeleton-${index}`} className="imf-panel animate-pulse">
                <div className="flex gap-3">
                  <div className="h-20 w-20 rounded-xl bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-slate-800" />
                    <div className="h-4 w-1/3 rounded bg-slate-700" />
                    <div className="h-3 w-1/2 rounded bg-slate-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
              const statusClass = statusStyleMap[item.status] || 'border-slate-700 bg-slate-800/60 text-slate-300';

              return (
                <Link
                  key={item.id}
                  href={`/market/${item.id}`}
                  prefetch={false}
                  className="imf-panel block p-4 transition-colors hover:border-blue-400/35"
                >
                  <div className="flex gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover bg-slate-950"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-[10px] text-slate-600">
                        NO IMAGE
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-white">{item.title}</p>
                        <Badge className={`border ${statusClass}`}>{statusLabelMap[item.status] || item.status}</Badge>
                      </div>

                      <p className="text-base font-extrabold text-blue-300">{item.price.toLocaleString('ko-KR')}원</p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
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

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
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
          <div className="imf-panel py-20 text-center space-y-2 text-slate-400">
            <p>등록된 판매글이 없습니다.</p>
            <p className="text-xs text-slate-500">첫 번째 판매글을 등록해보세요.</p>
          </div>
        )}
      </main>

      {currentPage > 1 || hasNextPage ? (
        <div className="px-4 pb-4">
          <div className="imf-panel flex items-center justify-between text-xs">
            {currentPage > 1 ? (
              <Link
                href={buildMarketHref(selectedStatus, selectedWeapon, searchText, currentPage - 1)}
                className="imf-pill border-slate-600 px-3 py-1.5 hover:border-slate-500"
                prefetch={false}
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
                href={buildMarketHref(selectedStatus, selectedWeapon, searchText, currentPage + 1)}
                className="imf-pill border-slate-600 px-3 py-1.5 hover:border-slate-500"
                prefetch={false}
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
    </div>
  );
}
