import React from 'react';
import { Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InteractiveHeaderProps {
    onClear?: () => void;
    count?: number;
}

export const InteractiveHeader: React.FC<InteractiveHeaderProps> = ({ onClear, count = 0 }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 px-1">
            <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 shadow-inner shrink-0">
                    <Zap className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                            Interactive Lab
                        </h2>
                        <Badge variant="outline" className="bg-background/50 border-border/40 text-[9px] font-black tracking-[0.2em] px-2 py-0.5 rounded-md">
                            EPHEMERAL • {count} ENTRIES
                        </Badge>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider truncate">
                        Registry of short-lived tasks, explorer queries and ad-hoc executions.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 gap-2 transition-all border border-transparent hover:border-destructive/20"
                    onClick={onClear}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear History
                </Button>
            </div>
        </div>
    );
};
