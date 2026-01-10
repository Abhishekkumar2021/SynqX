import React from 'react';
import { LayoutGrid, List as ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, setViewMode, className }) => {
    return (
        <div className={cn("flex items-center gap-1 bg-muted/30 border border-border/40 rounded-xl p-1 backdrop-blur-md w-fit", className)}>
            <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                    "rounded-lg transition-all duration-200",
                    viewMode === 'grid' 
                        ? "bg-background shadow-sm text-primary ring-1 ring-border/40 scale-100" 
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 scale-95 hover:scale-100"
                )}
                onClick={() => setViewMode('grid')}
                title="Grid View"
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                    "rounded-lg transition-all duration-200",
                    viewMode === 'list' 
                        ? "bg-background shadow-sm text-primary ring-1 ring-border/40 scale-100" 
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 scale-95 hover:scale-100"
                )}
                onClick={() => setViewMode('list')}
                title="List View"
            >
                <ListIcon className="h-4 w-4" />
            </Button>
        </div>
    );
};
