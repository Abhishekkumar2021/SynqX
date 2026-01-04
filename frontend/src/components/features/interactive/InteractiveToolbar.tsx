import React from 'react';
import { Search, List as ListIcon, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface InteractiveToolbarProps {
    filter: string;
    setFilter: (val: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    filterType: string;
    setFilterType: (val: string) => void;
    count: number;
}

export const InteractiveToolbar: React.FC<InteractiveToolbarProps> = ({
    filter,
    setFilter,
    viewMode,
    setViewMode,
    filterType,
    setFilterType,
    count
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-b border-border/40 bg-muted/5 relative z-30 shrink-0">
            <div className="relative flex-1 w-full group">
                <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Search task signatures, connections or agents..." 
                    className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-xs font-bold shadow-none"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 mr-2">
                    <Badge variant="outline" className="h-6 px-2.5 rounded-full border-border/50 text-[10px] font-black uppercase tracking-tight text-muted-foreground/60 bg-muted/20 whitespace-nowrap">
                        {count} <span className="ml-1 opacity-40">TASKS</span>
                    </Badge>
                </div>

                <Tabs value={filterType} onValueChange={setFilterType} className="shrink-0">
                    <TabsList className="bg-muted/30 border border-border/40 rounded-xl h-10 p-1 shadow-inner">
                        <TabsTrigger 
                            value="all" 
                            className="rounded-lg text-[9px] font-black uppercase px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                        >
                            All
                        </TabsTrigger>
                        <TabsTrigger 
                            value="explorer" 
                            className="rounded-lg text-[9px] font-black uppercase px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                        >
                            Queries
                        </TabsTrigger>
                        <TabsTrigger 
                            value="metadata" 
                            className="rounded-lg text-[9px] font-black uppercase px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                        >
                            Metadata
                        </TabsTrigger>
                        <TabsTrigger 
                            value="test" 
                            className="rounded-lg text-[9px] font-black uppercase px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                        >
                            Tests
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center bg-background/50 border border-border/40 rounded-xl p-1 shrink-0 ml-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-8 w-8 rounded-lg", viewMode === 'list' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted")}
                        onClick={() => setViewMode('list')}
                    >
                        <ListIcon size={14} />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted")}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
