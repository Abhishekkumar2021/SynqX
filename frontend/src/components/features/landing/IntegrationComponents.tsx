import React from 'react';
import { cn } from '@/lib/utils';

export const IntegrationItem: React.FC<{ icon: React.ReactNode, text: string }> = ({ icon, text }) => (
    <li className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-default">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5">
            {icon}
        </div>
        <span className="font-medium text-sm text-foreground/80">{text}</span>
    </li>
);

interface IntegrationCardProps {
    name: string;
    position: string;
    icon: React.ReactNode;
    color: string;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ name, position, icon, color }) => (
    <div className={cn(
        "px-4 py-3 bg-card/80 backdrop-blur-md border border-white/10 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:border-primary/40 flex items-center gap-3 cursor-default",
        position
    )}>
        <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", color)}>
            {React.cloneElement(icon as React.ReactElement)}
        </div>
        <span className="font-semibold text-sm">{name}</span>
    </div>
);
