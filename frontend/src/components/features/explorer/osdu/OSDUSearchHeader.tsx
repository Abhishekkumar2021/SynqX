import React from 'react';
import { Search, HelpCircle, Terminal, RefreshCw, LayoutGrid, Network, Map, History, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface OSDUSearchHeaderProps {
    query: string;
    onQueryChange: (q: string) => void;
    onExecute: () => void;
    isExecuting: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
    selectedKind: string | null;
    resultCount: number;
    activeRecordId: string | null;
    onClearRecord: () => void;
}

const SearchGuide = () => (
    <div className="space-y-4 p-2">
        <div className="flex items-center gap-2 border-b border-border/10 pb-2 mb-2">
            <Terminal size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Query Syntax (Lucene)</span>
        </div>
        <div className="grid gap-3">
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Field Exact Match</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">data.WellName: "Well-01"</code>
            </div>
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Range (Numeric/Date)</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">data.Depth: [1000 TO 2000]</code>
            </div>
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Boolean Chains</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">data.Status: "Active" AND data.Type: "Prod"</code>
            </div>
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Existence</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">_exists_: "data.SpatialLocation"</code>
            </div>
        </div>
    </div>
);

export const OSDUSearchHeader: React.FC<OSDUSearchHeaderProps> = ({
    query,
    onQueryChange,
    onExecute,
    isExecuting,
    activeTab,
    onTabChange,
    selectedKind,
    resultCount,
    activeRecordId,
    onClearRecord
}) => {
    return (
        <div className="h-20 px-8 border-b border-border/10 bg-muted/5 flex items-center gap-8 shrink-0 relative z-20">
            <div className="flex items-center gap-4">
                {activeRecordId && (
                    <Button variant="outline" size="icon" onClick={onClearRecord} className="h-10 w-10 rounded-2xl bg-background border-border/40 shadow-sm transition-transform active:scale-90">
                        <ArrowLeft size={18} />
                    </Button>
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 leading-none">OSDU Discovery</span>
                    <h2 className="text-xl font-black tracking-tighter text-foreground uppercase mt-1.5 truncate max-w-xs">
                        {activeRecordId ? 'Object Inspector' : (selectedKind ? selectedKind.split(':').pop()?.split('--').pop() : 'Universal Exploration')}
                    </h2>
                </div>
            </div>

            {!activeRecordId && (
                <>
                    <div className="flex-1 max-w-2xl relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                        <Input 
                            placeholder="Execute complex OSDU search..." 
                            className="h-12 pl-12 pr-32 rounded-2xl bg-background border-border/40 shadow-2xl focus:ring-8 focus:ring-primary/5 transition-all text-sm font-medium"
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onExecute()}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground/60"><HelpCircle size={16} /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 glass-panel rounded-2xl border-border/40 shadow-2xl p-4" align="end" sideOffset={12}>
                                    <SearchGuide />
                                </PopoverContent>
                            </Popover>
                            <Button onClick={onExecute} disabled={isExecuting} className="h-9 px-5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                                {isExecuting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center ml-auto gap-6">
                        <div className="hidden lg:flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Results</span>
                            <span className="text-sm font-black text-foreground mt-1">{resultCount} matches</span>
                        </div>
                        <Tabs value={activeTab} onValueChange={onTabChange} className="h-10">
                            <TabsList className="bg-muted/30 p-1.5 rounded-[1.25rem] border border-border/10">
                                <TabsTrigger value="records" className="h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
                                    <LayoutGrid size={14} /> Records
                                </TabsTrigger>
                                <TabsTrigger value="topology" className="h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all" disabled={!selectedKind}>
                                    <Network size={14} /> Topology
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </>
            )}
        </div>
    );
};
