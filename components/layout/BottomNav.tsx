'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sword, ShoppingBag, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

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

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black pb-safe">
            <div className="flex h-16 items-center justify-around px-2">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
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
