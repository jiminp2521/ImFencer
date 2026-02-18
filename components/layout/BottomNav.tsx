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
    const resolveMyTabHref = async () => {
        try {
            const response = await fetch('/api/me', {
                credentials: 'include',
                cache: 'no-store',
            });

            if (response.ok) {
                router.push('/profile');
                return;
            }
        } catch {
            // Fall through to login
        }

        router.push('/login?next=%2Fprofile');
    };

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

        const timeoutId = setTimeout(prefetchTabs, 300);
        return () => clearTimeout(timeoutId);
    }, [router, shouldHideNav]);

    if (shouldHideNav) {
        return null;
    }

    return (
        <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[linear-gradient(180deg,rgba(2,8,23,0.7)_0%,rgba(2,10,28,0.96)_18%,rgba(2,10,28,0.98)_100%)] backdrop-blur-2xl shadow-[0_-14px_36px_rgba(0,0,0,0.42)]">
            <div className="flex h-16 items-center justify-around gap-1 px-2">
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
                            onClick={(event) => {
                                if (tab.href !== '/profile') return;
                                event.preventDefault();
                                void resolveMyTabHref();
                            }}
                            onMouseEnter={() => {
                                router.prefetch(tab.href);
                                warmTabData(tab.href);
                            }}
                            onTouchStart={() => {
                                router.prefetch(tab.href);
                                warmTabData(tab.href);
                            }}
                            className={cn(
                                'flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-colors duration-200',
                                isActive
                                    ? 'bg-blue-500/20 text-blue-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{tab.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
