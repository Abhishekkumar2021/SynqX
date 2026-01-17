/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    Search, Layers, Database, 
    HelpCircle, FileSearch, Play, Loader2, Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useMutation } from '@tanstack/react-query';
import { executeQuery } from '@/lib/api/ephemeral';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';
import { toast } from 'sonner';

interface OSDUKind {
    name: string;
    type: string;
    rows: number;
    schema: string;
    metadata?: {
        authority: string;
        source: string;
        entity_type: string;
        group: string;
        entity_name: string;
        version: string;
    };
}

interface OSDUExplorerProps {
    connectionId: number;
    connectionName: string;
    assets: OSDUKind[];
    isLoading: boolean;
}

export const OSDUExplorer: React.FC<OSDUExplorerProps> = ({ 
    connectionId,
    assets = [], 
    isLoading 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKind, setSelectedKind] = useState<OSDUKind | null>(null);
    const [activeGroup, setActiveGroup] = useState<string>('All');
    const [luceneQuery, setLuceneQuery] = useState('*:*');

    const domainGroups = useMemo(() => {
        const groups: Record<string, number> = { 'All': assets.length };
        assets.forEach(a => {
            const g = a.metadata?.group || 'Other';
            groups[g] = (groups[g] || 0) + 1;
        });
        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'All') return -1;
            if (b[0] === 'All') return 1;
            return b[1] - a[1];
        });
    }, [assets]);

    const filteredKinds = useMemo(() => {
        return assets.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (a.metadata?.entity_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesGroup = activeGroup === 'All' || a.metadata?.group === activeGroup;
            return matchesSearch && matchesGroup;
        });
    }, [assets, searchQuery, activeGroup]);

    const searchMutation = useMutation({
        mutationFn: (query: string) => executeQuery(connectionId, { 
            query, 
            limit: 100,
            params: { kind: selectedKind?.name }
        }),
        onError: (err: any) => toast.error("OSDU Search Failed", { description: err.message })
    });

    const searchResults = searchMutation.data ? {
        results: searchMutation.data.result_sample?.rows || [],
        columns: searchMutation.data.result_summary?.columns || [],
        count: searchMutation.data.result_summary?.count || 0
    } : null;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="flex-1 min-h-0">
                <ResizablePanelGroup direction="horizontal">
                    {/* Kind Browser Sidebar */}
                    <ResizablePanel defaultSize={25} minSize={20} className="bg-muted/5 border-r border-border/20">
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-border/20 space-y-4 bg-muted/10">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                    Kinds Catalog
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3 w-3 cursor-help opacity-40" />
                                            </TooltipTrigger>
                                            <TooltipContent>OSDU Schema definitions.</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="relative group">
                                    <Search className="z-20 absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="Filter catalog..." value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-8 rounded-lg bg-background border-border/40 text-[11px] shadow-none"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {domainGroups.slice(0, 6).map(([group]) => (
                                        <Badge 
                                            key={group}
                                            variant={activeGroup === group ? 'default' : 'outline'}
                                            className="cursor-pointer text-[9px] uppercase font-bold py-0 h-5"
                                            onClick={() => setActiveGroup(group)}
                                        >
                                            {group}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-0.5">
                                    {isLoading ? (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <div key={i} className="h-10 w-full animate-pulse bg-muted/20 rounded-lg" />
                                        ))
                                    ) : filteredKinds.map(kind => (
                                        <button
                                            key={kind.name}
                                            onClick={() => {
                                                setSelectedKind(kind);
                                                searchMutation.reset();
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border",
                                                selectedKind?.name === kind.name
                                                    ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                                                    : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Database size={12} className={cn(selectedKind?.name === kind.name ? "opacity-100" : "opacity-30")} />
                                                <span className="truncate">{kind.metadata?.entity_name || kind.name}</span>
                                            </div>
                                            <div className="mt-1 pl-5 text-[9px] opacity-40 font-mono truncate">{kind.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Search & Results Area */}
                    <ResizablePanel defaultSize={75}>
                        {selectedKind ? (
                            <div className="h-full flex flex-col overflow-hidden bg-background">
                                <div className="p-6 border-b border-border/20 bg-muted/5 space-y-4 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                <FileSearch size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold tracking-tight">{selectedKind.metadata?.entity_name || selectedKind.name}</h3>
                                                <p className="text-[10px] font-mono opacity-50">{selectedKind.name}</p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-none">
                                            {selectedKind.rows?.toLocaleString()} Records
                                        </Badge>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                            <Input 
                                                value={luceneQuery}
                                                onChange={(e) => setLuceneQuery(e.target.value)}
                                                placeholder="Lucene query (e.g. data.WellName: 'A*')..." 
                                                className="h-10 pl-10 rounded-xl bg-background border-border/40 font-mono text-xs shadow-inner" 
                                            />
                                        </div>
                                        <Button 
                                            onClick={() => searchMutation.mutate(luceneQuery)}
                                            disabled={searchMutation.isPending}
                                            className="rounded-xl h-10 px-6 font-bold gap-2 shadow-lg shadow-primary/20"
                                        >
                                            {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                            Execute Search
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium px-1">
                                        <Info size={12} className="text-primary/60" />
                                        <span>Tip: OSDU uses Lucene syntax. Use <code>data.Property: Value</code> for field-level filtering.</span>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 relative bg-muted/5">
                                    <ResultsGrid 
                                        data={searchResults} 
                                        isLoading={searchMutation.isPending}
                                        variant="embedded"
                                        noBorder
                                        noBackground
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                                <div className="p-8 rounded-[2.5rem] bg-muted/5 border border-border/40 relative group">
                                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-all" />
                                    <Layers className="h-16 w-16 text-primary/30 relative z-10" />
                                </div>
                                <div className="space-y-2 max-w-xs">
                                    <h3 className="text-lg font-bold">Select an OSDU Kind</h3>
                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed opacity-70">
                                        Choose a data kind from the subsurface catalog on the left to begin searching and analyzing records.
                                    </p>
                                </div>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
};