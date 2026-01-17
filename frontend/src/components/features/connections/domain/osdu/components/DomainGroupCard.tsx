import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DomainGroupCardProps { 
    group: string;
    count: number;
    isSelected: boolean;
    onClick: () => void;
}

export const DomainGroupCard = ({ 
    group, 
    count, 
    isSelected, 
    onClick 
}: DomainGroupCardProps) => {
    const displayName = group.replace(/-/g, ' ');
    
    // Determine color based on group type
    const colorClass = useMemo(() => {
        if (group === 'master-data') return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
        if (group === 'work-product-component') return "text-blue-500 bg-blue-500/10 border-blue-500/20";
        if (group === 'reference-data') return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
    }, [group]);

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left group overflow-hidden",
                isSelected 
                    ? `border-primary/50 bg-primary/5 shadow-lg shadow-primary/5 ring-1 ring-primary/20` 
                    : "border-border/40 bg-muted/5 hover:bg-muted/20 hover:border-border/80"
            )}
        >
            <div className="flex items-center justify-between w-full mb-3 z-10">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colorClass)}>
                    <Layers className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className="font-mono font-bold text-[10px]">{count}</Badge>
            </div>
            <div className="z-10">
                <h4 className="font-bold text-sm capitalize text-foreground/90 group-hover:text-primary transition-colors">{displayName}</h4>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">OSDU Domain Group</p>
            </div>
            
            {isSelected && (
                <motion.div 
                    layoutId="active-ring"
                    className="absolute inset-0 border-2 border-primary/20 rounded-2xl pointer-events-none"
                />
            )}
        </button>
    );
};
