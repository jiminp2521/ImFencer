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
                "fixed bottom-20 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 z-40 transition-transform active:scale-95",
                className
            )}
            onClick={onClick || (() => router.push('/write'))}
            {...props}
        >
            <Plus className="h-6 w-6 text-white" strokeWidth={3} />
        </Button>
    );
}
