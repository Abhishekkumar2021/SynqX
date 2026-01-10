import React from 'react';
import { 
    Search,
    Cpu, Activity, Zap, Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewToggle, type ViewMode } from '@/components/common/ViewToggle';

interface InteractiveToolbarProps {
    filter: string;
    setFilter: (val: string) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
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
        <div className="flex flex-col gap-4 p-4 border-b border-border/40 bg-muted/5 relative z-30 shrink-0">
            <div className="flex flex-col xl:flex-row items-center gap-4">
                {/* Search - Enhanced with shortcut and better focus */}
                <div className="relative flex-1 w-full group">
                    <div className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input 
                        placeholder="Search by signature, payload, or agent..." 
                        className="h-10 pl-10 pr-12 rounded-xl bg-background/40 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium shadow-none placeholder:text-muted-foreground/40"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {/* Agent Filter - Default Segmented Style */}
                    <Tabs value={agentFilter} onValueChange={setAgentFilter} className="shrink-0">
                        <TabsList>
                            <TabsTrigger value="all" className="gap-2">
                                <Filter size={14} /> All Agents
                            </TabsTrigger>
                            <TabsTrigger value="internal" className="gap-2">
                                <Zap size={14} /> Internal
                            </TabsTrigger>
                            <TabsTrigger value="remote" className="gap-2">
                                <Cpu size={14} /> Remote
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Type Filter */}
                    <Tabs value={filterType} onValueChange={setFilterType} className="shrink-0">
                        <TabsList>
                            <TabsTrigger value="all" className="gap-2">
                                All Types
                            </TabsTrigger>
                            <TabsTrigger value="explorer" className="gap-2">
                                <Activity size={14} /> Queries
                            </TabsTrigger>
                            <TabsTrigger value="metadata" className="gap-2">
                                <Activity size={14} /> Metadata
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-3 ml-auto">
                        <ViewToggle 
                            viewMode={viewMode} 
                            setViewMode={setViewMode} 
                        />

                        <div className="h-11 px-4 flex items-center justify-center rounded-xl border border-border/40 bg-muted/30 text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap shadow-sm">
                            {count} <span className="ml-2 opacity-40">MATCHES</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
