import React from 'react';

interface StatItemProps {
    number: string;
    label: string;
}

export const StatItem: React.FC<StatItemProps> = ({ number, label }) => (
    <div className="space-y-2 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-default">
        <div className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">{number}</div>
        <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
    </div>
);
