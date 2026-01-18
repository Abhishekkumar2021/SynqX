/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, Database, Network, FileText, 
    Layers, RefreshCw,
    Download, Info, ChevronRight,
    ArrowLeft, ExternalLink, Globe, Shield, Activity,
    X, Navigation, Eye, Hash, Link2, Binary, Trash2,
    LayoutGrid, Save, Map as MapIcon, History,
    Fingerprint, ShieldCheck, HelpCircle, Terminal,
    ArrowUpRight, GitBranch, Share2
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn, formatNumber } from '@/lib/utils';
import { getConnectionMetadata } from '@/lib/api/connections';
import { ResultsGrid } from "@/components/features/explorer/ResultsGrid";
import { DomainEntityGraph } from '../../../connections/domain/DomainEntityGraph';
import { CodeBlock } from '@/components/ui/docs/CodeBlock';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useSearchParams } from 'react-router-dom';

// --- Sub-components ---

const SearchGuide = () => (
    <div className="space-y-4 p-2">
        <div className="flex items-center gap-2 border-b border-border/10 pb-2 mb-2">
            <Terminal size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Lucene Query Syntax</span>
        </div>
        <div className="grid gap-3">
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Field Match</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">data.WellName: "Well-01"</code>
            </div>
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Range Query</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">data.Depth: [1000 TO 2000]</code>
            </div>
            <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Boolean Logic</span>
                <code className="text-[10px] block bg-muted/50 p-1.5 rounded-lg border border-border/20">data.Status: "Active" AND NOT data.Type: "Test"</code>
            </div>
        </div>
        <div className="pt-2">
            <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1" onClick={() => window.open('https://community.opengroup.org/osdu/documentation/-/wikis/OSDU-Query-Syntax', '_blank')}>
                View Full Documentation <ExternalLink size={10} />
            </Button>
        </div>
    </div>
);

interface OSDUExplorerProps {
    connectionId: number;
}

export const OSDUExplorer: React.FC<OSDUExplorerProps> = ({ connectionId }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedKind = searchParams.get('kind') || null;
    const activeRecordId = searchParams.get('recordId') || null;
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '*');
    const [activeTab, setActiveTab] = useState('records');
    const [kindSearch, setKindSearch] = useState('');

    const setKind = (kind: string | null) => {
        const next = new URLSearchParams(searchParams);
        if (kind) next.set('kind', kind);
        else next.delete('kind');
        next.delete('recordId'); 
        setSearchParams(next);
    };

    const setRecordId = (id: string | null) => {
        const next = new URLSearchParams(searchParams);
        if (id) next.set('recordId', id);
        else next.delete('recordId');
        setSearchParams(next);
    };

    // --- Queries ---

    const { data: kinds = [], isLoading: isLoadingKinds, refetch: refetchKinds } = useQuery({
        queryKey: ['osdu', 'kinds', connectionId],
        queryFn: () => getConnectionMetadata(connectionId, 'discover_assets', { include_metadata: true }),
        select: (data) => data.map((a: any) => a.metadata)
    });

    const { data: searchResults, isLoading: isSearching, refetch: refetchSearch } = useQuery({
        queryKey: ['osdu', 'search', connectionId, selectedKind, searchQuery],
        queryFn: () => getConnectionMetadata(connectionId, 'execute_query', { 
            kind: selectedKind || '*:*:*:*', 
            query: searchQuery,
            limit: 100
        }),
        enabled: !!connectionId && !activeRecordId,
    });

    const { data: record, isLoading: isLoadingRecord } = useQuery({
        queryKey: ['osdu', 'record', connectionId, activeRecordId],
        queryFn: async () => {
            const [details, relationships, ancestry, spatial] = await Promise.all([
                getConnectionMetadata(connectionId, 'get_record', { record_id: activeRecordId }),
                getConnectionMetadata(connectionId, 'get_record_relationships', { record_id: activeRecordId }),
                getConnectionMetadata(connectionId, 'get_ancestry', { record_id: activeRecordId }),
                getConnectionMetadata(connectionId, 'get_spatial_data', { record_id: activeRecordId })
            ]);
            return { details, relationships, ancestry, spatial };
        },
        enabled: !!activeRecordId,
    });

    const { data: topology = [] } = useQuery({
        queryKey: ['osdu', 'topology', connectionId, selectedKind],
        queryFn: () => getConnectionMetadata(connectionId, 'get_relationships', { kind: selectedKind }),
        enabled: !!selectedKind && activeTab === 'topology',
    });

    const downloadMutation = useMutation({
        mutationFn: (datasetId: string) => getConnectionMetadata(connectionId, 'get_dataset_url', { dataset_registry_id: datasetId }),
        onSuccess: (url) => { if (url) window.open(url, '_blank'); },
        onError: (err: any) => toast.error("File resolution failed", { description: err.message })
    });

    const filteredKinds = useMemo(() => {
        return kinds.filter((k: any) => 
            k.full_kind.toLowerCase().includes(kindSearch.toLowerCase()) ||
            k.entity_name.toLowerCase().includes(kindSearch.toLowerCase())
        );
    }, [kinds, kindSearch]);

    const formattedResults = useMemo(() => {
        if (!searchResults) return null;
        const flattened = searchResults.map((r: any) => ({
            id: r.id, kind: r.kind, authority: r.authority, source: r.source, ...(r.data || {})
        }));
        return {
            results: flattened,
            columns: flattened.length > 0 ? Object.keys(flattened[0]) : [],
            count: flattened.length,
            total_count: flattened.length 
        };
    }, [searchResults]);

    const isDataset = record?.details?.kind?.includes('dataset--File');

    return (
        <TooltipProvider>
            <div className="h-full w-full bg-background overflow-hidden flex flex-col selection:bg-primary/10">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    
                    {/* --- Left Sidebar --- */}
                    <ResizablePanel defaultSize={20} minSize={15} className="border-r border-border/40 bg-muted/5 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-border/10 bg-muted/10 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <Layers size={18} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Registry</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => refetchKinds()} className="h-8 w-8">
                                <RefreshCw size={14} className={cn(isLoadingKinds && "animate-spin")} />
                            </Button>
                        </div>
                        <div className="p-4 shrink-0">
                            <Input 
                                placeholder="Filter kinds..." 
                                className="h-9 rounded-xl bg-background/50 border-border/40 text-[11px]"
                                value={kindSearch}
                                onChange={(e) => setKindSearch(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="flex-1 px-3">
                            <button onClick={() => setKind(null)} className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left", !selectedKind ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20" : "hover:bg-muted/50")}>
                                <Globe size={14} />
                                <span className="text-[11px] font-black uppercase">Global Search</span>
                            </button>
                            <div className="h-4" />
                            {filteredKinds.map((k: any) => (
                                <button key={k.full_kind} onClick={() => setKind(k.full_kind)} className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left mb-1 transition-all", selectedKind === k.full_kind ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted/50")}>
                                    <Database size={14} className={selectedKind === k.full_kind ? "text-primary-foreground" : "text-muted-foreground opacity-40"} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold truncate">{k.entity_name}</span>
                                        <span className={cn("text-[8px] font-black uppercase opacity-40", selectedKind === k.full_kind && "text-primary-foreground/60")}>{k.group}</span>
                                    </div>
                                </button>
                            ))}
                        </ScrollArea>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* --- Viewport --- */}
                    <ResizablePanel defaultSize={activeRecordId ? 50 : 80} className="flex flex-col overflow-hidden bg-background relative">
                        <Tabs value={activeRecordId ? "inspector" : activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            {/* Header */}
                            <header className="h-20 px-8 border-b border-border/10 bg-muted/5 flex items-center gap-8 shrink-0 relative z-20">
                                <div className="flex items-center gap-4">
                                    {activeRecordId && (
                                        <Button variant="outline" size="icon" onClick={() => setRecordId(null)} className="h-10 w-10 rounded-2xl bg-background border-border/40 shadow-sm transition-transform active:scale-90">
                                            <ArrowLeft size={18} />
                                        </Button>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 leading-none">Discovery</span>
                                        <h2 className="text-xl font-black tracking-tighter text-foreground uppercase mt-1.5 truncate max-w-xs">
                                            {activeRecordId ? 'Inspector' : (selectedKind ? selectedKind.split(':').pop()?.split('--').pop() : 'Universal')}
                                        </h2>
                                    </div>
                                </div>

                                {!activeRecordId && (
                                    <>
                                        <div className="flex-1 max-w-2xl relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                            <Input 
                                                placeholder="Query ecosystem..." 
                                                className="h-12 pl-12 pr-32 rounded-2xl bg-background border-border/40 shadow-2xl focus:ring-8 focus:ring-primary/5 transition-all text-sm font-medium"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && refetchSearch()}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <Popover>
                                                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><HelpCircle size={16} /></Button></PopoverTrigger>
                                                    <PopoverContent className="w-80 glass-panel border-border/40 shadow-2xl p-4" align="end" sideOffset={12}><SearchGuide /></PopoverContent>
                                                </Popover>
                                                <Button onClick={() => refetchSearch()} disabled={isSearching} className="h-9 px-5 rounded-xl font-black uppercase text-[10px]">
                                                    {isSearching ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : "Execute"}
                                                </Button>
                                            </div>
                                        </div>
                                        <TabsList className="bg-muted/30 p-1.5 rounded-[1rem] border border-border/10 ml-auto">
                                            <TabsTrigger value="records" className="h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-2"><LayoutGrid size={14} /> Records</TabsTrigger>
                                            <TabsTrigger value="topology" className="h-7 px-4 text-[10px] font-black uppercase tracking-widest gap-2" disabled={!selectedKind}><Network size={14} /> Topology</TabsTrigger>
                                        </TabsList>
                                    </>
                                )}
                            </header>

                            <div className="flex-1 min-h-0 relative">
                                <TabsContent value="records" className="h-full m-0 animate-in fade-in duration-500 overflow-hidden">
                                    <ResultsGrid 
                                        data={formattedResults} isLoading={isSearching} variant="embedded" noBorder noBackground
                                        onSelectRows={(indices) => {
                                            const idx = Array.from(indices)[0];
                                            if (idx !== undefined && searchResults) setRecordId(searchResults[idx].id);
                                        }}
                                        title={selectedKind ? "Kind Scope" : "Global Scope"}
                                        description={isSearching ? "Resolving..." : `Matches: ${searchResults?.length || 0}`}
                                    />
                                </TabsContent>
                                <TabsContent value="topology" className="h-full m-0 animate-in fade-in duration-500 p-8 bg-muted/5">
                                    {selectedKind && <DomainEntityGraph rootEntity={selectedKind} relationships={topology} onNodeClick={(k) => setKind(k)} />}
                                </TabsContent>
                                <TabsContent value="inspector" className="h-full m-0 bg-background overflow-hidden">
                                    {activeRecordId && (
                                        <AnimatePresence mode="wait">
                                            {isLoadingRecord ? (
                                                <div key="loader" className="h-full flex flex-col items-center justify-center gap-4">
                                                    <RefreshCw size={40} className="text-primary animate-spin" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Resolving Record Registry</span>
                                                </div>
                                            ) : record ? (
                                                <motion.div key="content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                                                    <div className="p-8 pb-6 flex items-start justify-between shrink-0">
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-16 w-16 rounded-[1.5rem] bg-muted/10 border border-border/40 flex items-center justify-center text-primary shadow-2xl"><Database size={28} /></div>
                                                            <div className="space-y-1">
                                                                <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-3 h-6">MANAGED RECORD</Badge>
                                                                <h3 className="text-2xl font-black tracking-tighter uppercase leading-none truncate max-w-sm">{record.details.kind.split(':').pop()?.split('--').pop()}</h3>
                                                                <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-muted-foreground/60">
                                                                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500/60" /> {record.details.legal?.legaltags?.[0] || 'N/A'}</span>
                                                                    <span className="flex items-center gap-1.5"><Globe size={14} className="text-blue-500/60" /> {record.details.id.split(':')[0]}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {isDataset && <Button onClick={() => downloadMutation.mutate(record.details.id)} disabled={downloadMutation.isPending} className="h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black uppercase tracking-widest text-[10px] gap-2">{downloadMutation.isPending ? <RefreshCw className="animate-spin h-4 w-4" /> : <Download size={16} />} Download</Button>}
                                                            <Button variant="outline" className="h-11 px-6 rounded-xl border-border/40 font-black uppercase tracking-widest text-[10px] hover:bg-muted">Link</Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 px-8 pb-8 min-h-0">
                                                        <Tabs defaultValue="payload" className="h-full flex flex-col border border-border/20 rounded-[2rem] overflow-hidden shadow-xl bg-muted/5">
                                                            <div className="px-6 pt-4 border-b border-border/10 bg-background/50 backdrop-blur-md shrink-0">
                                                                <TabsList className="bg-transparent gap-6 h-10">
                                                                    <TabsTrigger value="payload" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0"><Binary size={14} /> Manifest</TabsTrigger>
                                                                    <TabsTrigger value="relationships" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0"><GitBranch size={14} /> Relationships</TabsTrigger>
                                                                    <TabsTrigger value="ancestry" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0"><History size={14} /> Ancestry</TabsTrigger>
                                                                    {record.spatial && <TabsTrigger value="map" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0"><MapIcon size={14} /> Map</TabsTrigger>}
                                                                </TabsList>
                                                            </div>
                                                            <div className="flex-1 min-h-0 relative bg-background/50">
                                                                <TabsContent value="payload" className="h-full m-0 overflow-hidden"><CodeBlock code={JSON.stringify(record.details.data, null, 2)} language="json" rounded={false} maxHeight="100%" /></TabsContent>
                                                                <TabsContent value="relationships" className="h-full m-0 overflow-hidden">
                                                                    <ScrollArea className="h-full">
                                                                        <div className="p-8 space-y-8 pb-32">
                                                                            <div className="space-y-4">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Outgoing references</span>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {record.relationships.outbound.map((rel: any, i: number) => (
                                                                                        <div key={i} className="p-4 rounded-2xl bg-background border border-border/40 flex items-center justify-between group hover:border-primary/40 transition-all">
                                                                                            <div className="flex flex-col min-w-0 pr-4"><span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1">{rel.field}</span><code className="text-[10px] font-bold truncate text-foreground/80">{rel.target_id}</code></div>
                                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => setRecordId(rel.target_id)}><Navigation size={12} className="rotate-45" /></Button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <Separator className="opacity-5" />
                                                                            <div className="space-y-4">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Incoming references</span>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {record.relationships.inbound.map((rel: any, i: number) => (
                                                                                        <div key={i} className="p-4 rounded-2xl bg-background border border-border/40 flex items-center justify-between group hover:border-primary/40 transition-all">
                                                                                            <div className="flex flex-col min-w-0 pr-4"><span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1">{rel.kind.split(':').pop()?.split('--').pop()}</span><code className="text-[10px] font-bold truncate text-foreground/80">{rel.source_id}</code></div>
                                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => setRecordId(rel.source_id)}><Navigation size={12} className="rotate-45" /></Button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </ScrollArea>
                                                                </TabsContent>
                                                                <TabsContent value="ancestry" className="h-full m-0 flex flex-col items-center justify-center p-12 opacity-40 gap-4"><Layers size={48} /><span className="text-[11px] font-black uppercase tracking-widest text-center">No explicit lineage.</span></TabsContent>
                                                                <TabsContent value="map" className="h-full m-0 flex flex-col items-center justify-center p-12 opacity-40 gap-4"><MapIcon size={48} /><span className="text-[11px] font-black uppercase tracking-widest">Spatial detected</span></TabsContent>
                                                            </div>
                                                        </Tabs>
                                                    </div>
                                                </motion.div>
                                            ) : null}
                                        </AnimatePresence>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </ResizablePanel>

                    {/* --- Right Sidebar --- */}
                    <AnimatePresence>
                        {activeRecordId && record && (
                            <>
                                <ResizableHandle withHandle />
                                <ResizablePanel defaultSize={25} minSize={20} className="flex flex-col bg-muted/5 overflow-hidden border-l border-border/10">
                                    <div className="p-6 border-b border-border/10 bg-muted/10 flex items-center justify-between shrink-0">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Contextual Audit</span>
                                            <h4 className="text-sm font-black tracking-tight mt-1">Audit Trail</h4>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setRecordId(null)} className="h-8 w-8"><X size={18} /></Button>
                                    </div>
                                    <ScrollArea className="flex-1 px-6">
                                        <div className="py-6 space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-muted-foreground/60 px-1"><Hash size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Identity</span></div>
                                                <div className="p-4 rounded-2xl bg-background border border-border/40 space-y-2 group">
                                                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Record UID</span>
                                                    <div className="flex items-center justify-between gap-3 pt-1">
                                                        <code className="text-[11px] font-bold truncate text-primary leading-none">{record.details.id}</code>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => { navigator.clipboard.writeText(record.details.id); toast.success("ID Copied"); }}><Hash size={10} /></Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <Separator className="opacity-5" />
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-muted-foreground/60 px-1"><Shield size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Compliance</span></div>
                                                <div className="p-5 rounded-3xl bg-background border border-border/40 space-y-6">
                                                    <div className="space-y-3">
                                                        <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">ACL Groups</span>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/5 text-blue-600 border border-blue-500/10 text-[9px] font-bold uppercase">Owners <Badge className="bg-blue-500 text-white border-none h-5">{record.details.acl?.owners?.length || 0}</Badge></div>
                                                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/5 text-amber-600 border border-amber-500/10 text-[9px] font-bold uppercase">Viewers <Badge className="bg-amber-500 text-white border-none h-5">{record.details.acl?.viewers?.length || 0}</Badge></div>
                                                        </div>
                                                    </div>
                                                    <Separator className="opacity-5" />
                                                    <div className="space-y-3">
                                                        <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Legal Tags</span>
                                                        <div className="flex flex-wrap gap-2">{(record.details.legal?.legaltags || []).map((tag: string) => <Badge key={tag} variant="outline" className="text-[9px] font-bold border-border/40 bg-muted/20 px-2.5 py-0.5 rounded-lg">{tag}</Badge>)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Separator className="opacity-5" />
                                            <div className="space-y-4 px-1">
                                                <div className="flex items-center gap-2 text-muted-foreground/60"><Activity size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Resolved Event</span></div>
                                                <div className="p-4 rounded-2xl bg-background border border-border/40 flex items-center justify-between shadow-sm">
                                                    <span className="text-[9px] font-black uppercase text-muted-foreground/40">Timestamp</span>
                                                    <span className="text-[10px] font-bold text-foreground/80 font-mono tracking-tighter">{new Date().toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                    <div className="p-6 border-t border-border/10 bg-muted/5 flex flex-col gap-3">
                                        <Button variant="default" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all"><Save size={16} className="mr-2" /> Push Update</Button>
                                        <Button variant="ghost" className="w-full h-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 transition-all"><Trash2 size={16} className="mr-2" /> Delete Object</Button>
                                    </div>
                                </ResizablePanel>
                            </>
                        )}
                    </AnimatePresence>
                </ResizablePanelGroup>
            </div>
        </TooltipProvider>
    );
};