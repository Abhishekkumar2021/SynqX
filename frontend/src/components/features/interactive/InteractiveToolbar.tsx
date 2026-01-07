import React from 'react';
import { 
    Search, List as ListIcon, LayoutGrid, 
    Cpu, Activity, Zap, Command, Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InteractiveToolbarProps {
    filter: string;
    setFilter: (val: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    filterType: string;
    setFilterType: (val: string) => void;
    agentFilter: string;
    setAgentFilter: (val: string) => void;
    count: number;
}

export const InteractiveToolbar: React.FC<InteractiveToolbarProps> = ({
    filter,
    setFilter,
    viewMode,
    setViewMode,
    filterType,
    setFilterType,
    agentFilter,
    setAgentFilter,
    count
}) => {
    return (
        <div className="flex flex-col gap-3 p-3 border-b border-border/40 bg-muted/5 relative z-30 shrink-0">
            <div className="flex flex-col lg:flex-row items-center gap-3">
                {/* Search - Enhanced with shortcut and better focus */}
                <div className="relative flex-1 w-full group">
                    <div className="z-20 absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input 
                        placeholder="Search signatures, connections or agents..." 
                        className="h-9 pl-9 pr-12 rounded-xl bg-background/40 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-[11px] font-bold shadow-none placeholder:text-muted-foreground/50"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 pointer-events-none">
                        <Command size={10} className="text-muted-foreground/60" />
                        <span className="text-[9px] font-black text-muted-foreground/60">K</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Agent Filter - Segmented Control Style */}
                    <div className="flex items-center gap-2">
                        <Tabs value={agentFilter} onValueChange={setAgentFilter} className="shrink-0">
                            <TabsList className="bg-muted/40 border border-border/40 rounded-xl h-9 p-1 shadow-inner">
                                <TabsTrigger 
                                    value="all" 
                                    className="rounded-lg text-[9px] font-black uppercase px-3 gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    <Filter size={12} className="opacity-40" /> All Agents
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="internal" 
                                    className="rounded-lg text-[9px] font-black uppercase px-3 gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    <Zap size={12} className="opacity-40" /> Internal
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="remote" 
                                    className="rounded-lg text-[9px] font-black uppercase px-3 gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    <Cpu size={12} className="opacity-40" /> Remote
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Type Filter */}
                        <Tabs value={filterType} onValueChange={setFilterType} className="shrink-0">
                            <TabsList className="bg-muted/40 border border-border/40 rounded-xl h-9 p-1 shadow-inner">
                                <TabsTrigger 
                                    value="all" 
                                    className="rounded-lg text-[9px] font-black uppercase px-3 gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    All Types
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="explorer" 
                                    className="rounded-lg text-[9px] font-black uppercase px-3 gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    <Activity size={12} className="opacity-40" /> Queries
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="metadata" 
                                    className="rounded-lg text-[9px] font-black uppercase px-3 gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                >
                                    <Activity size={12} className="opacity-40" /> Metadata
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {/* View Mode & Metadata */}
                        <div className="flex items-center gap-2 bg-background/30 border border-border/40 rounded-xl p-1 shrink-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-7 w-7 rounded-lg", viewMode === 'list' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted")}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <ListIcon size={14} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest">List View</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-7 w-7 rounded-lg", viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted")}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <LayoutGrid size={14} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest">Grid View</TooltipContent>
                            </Tooltip>
                        </div>

                        <Badge variant="outline" className="h-9 px-3 rounded-xl border-border/50 text-[10px] font-black uppercase tracking-tight text-foreground bg-background/50 whitespace-nowrap shadow-sm">
                            {count} <span className="ml-1.5 opacity-40">RESULTS</span>
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};
