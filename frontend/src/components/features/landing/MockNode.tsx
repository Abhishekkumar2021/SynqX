import React from 'react';
import { cn } from '@/lib/utils';

interface MockNodeProps {
    icon: React.ReactNode;
    title: string;
    sub: string;
    active?: boolean;
    status?: string;
    type?: 'source' | 'transform' | 'sink' | 'default';
}

export const MockNode: React.FC<MockNodeProps> = ({ icon, title, sub, active = false, status, type = 'default' }) => {

    const colors = {
        source: 'border-l-blue-500',
        transform: 'border-l-orange-500',
        sink: 'border-l-emerald-500',
        default: 'border-l-primary'
    };

    return (
        <div className={cn(
            "w-52 p-4 rounded-xl border border-white/10 bg-card/95 backdrop-blur-sm flex flex-col gap-3 shadow-xl transition-all hover:scale-105 border-l-4",
            colors[type],
            active ? 'ring-2 ring-primary/50 shadow-primary/20' : 'hover:border-primary/30'
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-muted/50 rounded-lg">{icon}</div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">{title}</span>
                    <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">{sub}</span>
                </div>
            </div>
            {status === 'running' && (
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress w-1/3 rounded-full"></div>
                </div>
            )}
        </div>
    );
};
