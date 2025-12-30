import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LayoutGrid, List, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionsToolbarProps {
    filter: string;
    setFilter: (filter: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    count: number;
}

export const ConnectionsToolbar: React.FC<ConnectionsToolbarProps> = ({
    filter,
    setFilter,
    viewMode,
    setViewMode,
    count,
}) => {
    return (
        <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
            {/* Search Bar */}
            <div className="relative w-full md:max-w-md group">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                <Input
                    placeholder="Filter connections..."
                    className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {/* Controls Group */}
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                {/* Status Chip */}
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-background/50 border border-border/50 px-4 py-2 rounded-full shadow-sm">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <span>{count} Total</span>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-muted/50 border border-border/40 rounded-2xl p-1.5 shadow-inner">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-xl transition-all",
                            viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-xl transition-all",
                            viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
