'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Sword, ShoppingBag, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { preloadSWRLite } from '@/lib/swr-lite';

const preloadJson = async <T,>(key: string) => {
    const response = await fetch(key, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
            'x-imfencer-prefetch': '1',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to preload ${key}`);
    }

    return response.json() as Promise<T>;
};

const tabs = [
    {
        name: '커뮤니티',
        href: '/',
        icon: Home,
        preloadKeys: [{ key: '/api/home/feed?scope=all&category=All&sort=latest&page=1', staleTime: 30_000 }],
    },
    {
        name: '펜싱',
        href: '/fencing',
        icon: Sword,
        preloadKeys: [] as { key: string; staleTime: number }[],
    },
    {
        name: '마켓',
        href: '/market',
        icon: ShoppingBag,
        preloadKeys: [{ key: '/api/market/feed?status=All&weapon=All&q=&page=1', staleTime: 25_000 }],
    },
    {
        name: '채팅',
        href: '/chat',
        icon: MessageCircle,
        preloadKeys: [{ key: '/api/chat/overview?open=1', staleTime: 8_000 }],
    },
    {
        name: '마이',
        href: '/profile',
        icon: User,
        preloadKeys: [] as { key: string; staleTime: number }[],
    },
];

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const prefetchedRef = useRef(false);
    const hideNavPrefixes = ['/login', '/signup', '/write', '/auth', '/fencing/lessons/write', '/payments'];
    const shouldHideNav = hideNavPrefixes.some((prefix) => pathname.startsWith(prefix));
    const warmTabData = (href: string) => {
        const tab = tabs.find((item) => item.href === href);
        if (!tab) return;

        tab.preloadKeys.forEach((entry) => {
            preloadSWRLite(entry.key, preloadJson, { staleTime: entry.staleTime });
        });
    };

    useEffect(() => {
        if (shouldHideNav || prefetchedRef.current) return;

        const prefetchTabs = () => {
            tabs.forEach((tab) => {
                router.prefetch(tab.href);
                warmTabData(tab.href);
            });

            prefetchedRef.current = true;
        };

        if ('requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(prefetchTabs, { timeout: 1_000 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = setTimeout(prefetchTabs, 80);
        return () => clearTimeout(timeoutId);
    }, [router, shouldHideNav]);

    if (shouldHideNav) {
        return null;
    }

    return (
        <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-3xl">
            <div className="mx-auto flex h-16 max-w-[640px] items-center justify-around gap-1 px-2">
                {tabs.map((tab) => {
                    const isActive =
                        tab.href === '/'
                            ? pathname === '/'
                            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            onClick={() => {
                                router.prefetch(tab.href);
                                warmTabData(tab.href);
                            }}
                            onMouseEnter={() => {
                                router.prefetch(tab.href);
                                warmTabData(tab.href);
                            }}
                            onFocus={() => {
                                router.prefetch(tab.href);
                                warmTabData(tab.href);
                            }}
                            onTouchStart={() => {
                                router.prefetch(tab.href);
                                warmTabData(tab.href);
                            }}
                            className={cn(
                                'relative flex min-w-[58px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all duration-200',
                                isActive
                                    ? 'bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                                    : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-200'
                            )}
                        >
                            <Icon className={cn("h-[22px] w-[22px]", isActive && "fill-current")} strokeWidth={isActive ? 2.4 : 2} />
                            <span className="text-[10px] font-medium">{tab.name}</span>
                            <span
                                className={cn(
                                    "mt-0.5 h-0.5 w-5 rounded-full transition-all",
                                    isActive ? "bg-white/80 opacity-100" : "bg-transparent opacity-0"
                                )}
                            />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
