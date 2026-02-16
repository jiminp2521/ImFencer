'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Sword, ShoppingBag, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { preloadSWRLite } from '@/lib/swr-lite';

const tabs = [
    {
        name: '커뮤니티',
        href: '/',
        icon: Home,
    },
    {
        name: '펜싱',
        href: '/fencing',
        icon: Sword,
    },
    {
        name: '마켓',
        href: '/market',
        icon: ShoppingBag,
    },
    {
        name: '채팅',
        href: '/chat',
        icon: MessageCircle,
    },
    {
        name: '마이',
        href: '/profile',
        icon: User,
    },
];

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const prefetchedRef = useRef(false);
    const hideNavPrefixes = ['/login', '/signup', '/write', '/auth', '/fencing/lessons/write', '/payments'];
    const shouldHideNav = hideNavPrefixes.some((prefix) => pathname.startsWith(prefix));

    useEffect(() => {
        if (shouldHideNav || prefetchedRef.current) return;

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

        const prefetchTabs = () => {
            tabs.forEach((tab) => {
                router.prefetch(tab.href);
            });

            preloadSWRLite('/api/home/feed?scope=all&category=All&sort=latest&page=1', preloadJson, { staleTime: 30_000 });
            preloadSWRLite('/api/market/feed?status=All&weapon=All&q=&page=1', preloadJson, { staleTime: 25_000 });
            preloadSWRLite('/api/chat/overview?open=1', preloadJson, { staleTime: 8_000 });

            prefetchedRef.current = true;
        };

        const timeoutId = setTimeout(prefetchTabs, 300);
        return () => clearTimeout(timeoutId);
    }, [router, shouldHideNav]);

    if (shouldHideNav) {
        return null;
    }

    return (
        <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black">
            <div className="flex h-16 items-center justify-around px-2">
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
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 transition-colors duration-200',
                                isActive ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
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
