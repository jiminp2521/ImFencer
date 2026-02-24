'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface FABProps extends React.ComponentProps<typeof Button> {
    onClick?: () => void;
}

export function FloatingActionButton({ className, onClick, ...props }: FABProps) {
    const router = useRouter();

    return (
        <Button
            size="icon"
            className={cn(
                "fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full border border-white/25 bg-white text-black shadow-[0_12px_26px_rgba(0,0,0,0.36)] transition-all hover:bg-slate-200 active:scale-95",
                className
            )}
            onClick={onClick || (() => router.push('/write'))}
            {...props}
        >
            <Plus className="h-6 w-6 text-black" strokeWidth={3} />
        </Button>
    );
}
