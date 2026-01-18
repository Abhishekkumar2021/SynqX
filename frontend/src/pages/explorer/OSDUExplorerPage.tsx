import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExplorerState } from '@/hooks/useExplorerState';
import { getConnection, getConnectionMetadata } from '@/lib/api/connections';
import { KindSidebar } from '@/components/features/explorer/osdu/KindSidebar';
import { OSDUSearchHeader } from '@/components/features/explorer/osdu/OSDUSearchHeader';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';
import { DomainEntityGraph } from '@/components/features/connections/domain/DomainEntityGraph';
import { PageMeta } from '@/components/common/PageMeta';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    RefreshCw, Database, ShieldCheck, Globe, 
    Binary, GitBranch, History, Map as MapIcon, 
    Download, Share2, Binary as BinaryIcon, 
    Layers, Search, ArrowLeft, ChevronRight,
    Navigation, Fingerprint, Shield, Info, Hash,
    Activity, Trash2, Save, ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/docs/CodeBlock';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useZenMode } from '@/hooks/useZenMode';

export const OSDUExplorerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const connectionId = parseInt(id!);
    const navigate = useNavigate();
    const { isZenMode } = useZenMode();
    const [isMaximized, setIsMaximized] = useState(false);
    
    const { 
        selectedKind, activeRecordId, query, activeTab, 
        setKind, setRecord, setQuery, setTab 
    } = useExplorerState();

    // 1. Connection Details
    const { data: connection } = useQuery({
        queryKey: ['connection', connectionId],
        queryFn: () => getConnection(connectionId)
    });

    // 2. Kind Discovery
    const { data: kinds = [], isLoading: isLoadingKinds, refetch: refetchKinds } = useQuery({
        queryKey: ['osdu', 'kinds', connectionId],
        queryFn: () => getConnectionMetadata(connectionId, 'discover_assets', { include_metadata: true }),
        select: (data) => data.map((a: any) => a.metadata)
    });

    // 3. Execute Search
    const { data: searchResults, isLoading: isSearching, refetch: refetchSearch } = useQuery({
        queryKey: ['osdu', 'search', connectionId, selectedKind, query],
        queryFn: () => getConnectionMetadata(connectionId, 'execute_query', { 
            kind: selectedKind || '*:*:*:*', 
            query: (query && query !== '*') ? query : '*',
            limit: 100
        }),
        enabled: !!connectionId && !activeRecordId && !!(selectedKind || (query && query !== '*')),
    });

    // 4. Record Deep Dive
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

    // 5. Schema Topology
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

    return (
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex-1 flex flex-col gap-6 md:gap-8 px-1",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title={`OSDU Explorer - ${connection?.name || 'Loading...'}`} />
            
            {/* --- Page Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate('/explorer')}
                            className="h-10 w-10 rounded-2xl hover:bg-muted active:scale-95"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="p-2 bg-indigo-500/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <Layers className="h-6 w-6 text-indigo-500" />
                        </div>
                        {connection?.name || 'OSDU Registry'}
                        <Badge variant="outline" className="h-7 px-3 rounded-xl bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold uppercase tracking-widest text-[9px] gap-1.5">
                            OSDU Platform
                        </Badge>
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1 leading-relaxed max-w-2xl">
                        Interactively browse, search, and navigate through the OSDU data mesh.
                    </p>
                </div>
            </div>

            {/* --- Content Pane (Glass Registry Style) --- */}
            <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* 1. Kind Sidebar */}
                    <ResizablePanel defaultSize={20} minSize={15} className="bg-muted/5 border-r border-border/40">
                        <KindSidebar 
                            kinds={kinds}
                            selectedKind={selectedKind}
                            onSelectKind={setKind}
                            isLoading={isLoadingKinds}
                            onRefresh={refetchKinds}
                        />
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-transparent" />

                    {/* 2. Main Discovery Area */}
                    <ResizablePanel defaultSize={80}>
                        <div className="h-full flex flex-col">
                            <OSDUSearchHeader 
                                query={query}
                                onQueryChange={setQuery}
                                onExecute={refetchSearch}
                                isExecuting={isSearching}
                                activeTab={activeTab}
                                onTabChange={setTab}
                                selectedKind={selectedKind}
                                resultCount={searchResults?.length || 0}
                                activeRecordId={activeRecordId}
                                onClearRecord={() => setRecord(null)}
                            />

                            <main className="flex-1 min-h-0 relative">
                                {!activeRecordId ? (
                                    <Tabs value={activeTab} className="h-full flex flex-col">
                                        <div className="flex-1 min-h-0 relative">
                                            <TabsContent value="records" className="h-full m-0 overflow-hidden animate-in fade-in duration-500">
                                                <ResultsGrid 
                                                    data={formattedResults}
                                                    isLoading={isSearching}
                                                    isMaximized={isMaximized}
                                                    onToggleMaximize={() => setIsMaximized(!isMaximized)}
                                                    variant="embedded"
                                                    noBorder
                                                    noBackground
                                                    onSelectRows={(indices) => {
                                                        const idx = Array.from(indices)[0];
                                                        if (idx !== undefined && searchResults) setRecord(searchResults[idx].id);
                                                    }}
                                                    title={selectedKind ? "Registry Scan" : "Universal Search"}
                                                    description={isSearching ? "Resolving OSDU query..." : `Detected ${searchResults?.length || 0} objects`}
                                                />
                                            </TabsContent>
                                            <TabsContent value="topology" className="h-full m-0 p-8 bg-muted/5 animate-in fade-in zoom-in-95 duration-500">
                                                <DomainEntityGraph 
                                                    rootEntity={selectedKind || ''} 
                                                    relationships={topology} 
                                                    onNodeClick={(k) => {
                                                        setKind(k);
                                                        setTab('records');
                                                    }} 
                                                />
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                ) : (
                                    <div className="h-full flex flex-col bg-background/50 overflow-hidden">
                                        <AnimatePresence mode="wait">
                                            {isLoadingRecord ? (
                                                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center gap-6">
                                                    <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Resolving Record Manifest</span>
                                                </motion.div>
                                            ) : record ? (
                                                <motion.div key="content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                                                    {/* Record Header - Compact for Registry Style */}
                                                    <div className="p-6 border-b border-border/10 bg-muted/10 flex items-start justify-between shrink-0">
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shadow-lg ring-1 ring-indigo-500/10">
                                                                <Database size={24} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge className="bg-indigo-500/10 text-indigo-600 border-none font-black text-[8px] uppercase tracking-widest px-2 h-5 rounded-md">RECORD</Badge>
                                                                    <span className="text-[9px] font-mono text-muted-foreground/40 font-bold uppercase tracking-tighter">V{record.details.version}</span>
                                                                </div>
                                                                <h3 className="text-xl font-bold tracking-tight uppercase leading-none truncate max-w-md text-foreground/90">{record.details.kind.split(':').pop()?.split('--').pop()}</h3>
                                                                <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-muted-foreground/50">
                                                                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> {record.details.legal?.legaltags?.[0]}</span>
                                                                    <span className="flex items-center gap-1.5"><Globe size={12} /> {record.details.id.split(':')[0]}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {record.details.kind?.includes('dataset--File') && (
                                                                <Button onClick={() => downloadMutation.mutate(record.details.id)} disabled={downloadMutation.isPending} className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[10px] font-black uppercase tracking-widest gap-2">
                                                                    {downloadMutation.isPending ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : <Download size={14} />} Download
                                                                </Button>
                                                            )}
                                                            <Button variant="outline" className="h-9 px-4 rounded-xl border-border/40 font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-muted shadow-sm">
                                                                <Share2 size={14} /> Link
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 flex overflow-hidden">
                                                        {/* Tabs Area */}
                                                        <Tabs defaultValue="payload" className="flex-1 flex flex-col overflow-hidden">
                                                            <div className="px-6 py-2 border-b border-border/10 bg-background/50 shrink-0">
                                                                <TabsList className="bg-muted/30 p-1 rounded-xl h-9">
                                                                    <TabsTrigger value="payload" className="text-[9px] font-black uppercase gap-2"><BinaryIcon size={12} /> Manifest</TabsTrigger>
                                                                    <TabsTrigger value="relationships" className="text-[9px] font-black uppercase gap-2"><GitBranch size={12} /> Links</TabsTrigger>
                                                                    <TabsTrigger value="ancestry" className="text-[9px] font-black uppercase gap-2"><History size={12} /> Lineage</TabsTrigger>
                                                                    {record.spatial && <TabsTrigger value="map" className="text-[9px] font-black uppercase gap-2"><MapIcon size={12} /> Spatial</TabsTrigger>}
                                                                </TabsList>
                                                            </div>

                                                            <div className="flex-1 min-h-0 relative bg-background/20">
                                                                <TabsContent value="payload" className="h-full m-0 overflow-hidden"><CodeBlock code={JSON.stringify(record.details.data, null, 2)} language="json" rounded={false} maxHeight="100%" /></TabsContent>
                                                                <TabsContent value="relationships" className="h-full m-0 overflow-hidden p-6">
                                                                    <ScrollArea className="h-full">
                                                                        <div className="space-y-8 pb-20">
                                                                            <div className="space-y-4">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Outbound References</span>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {record.relationships.outbound.map((rel: any, i: number) => (
                                                                                        <div key={i} className="p-4 rounded-xl bg-background border border-border/40 flex items-center justify-between group hover:border-primary/40 transition-all shadow-sm">
                                                                                            <div className="flex flex-col min-w-0 pr-4">
                                                                                                <span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1">{rel.field}</span>
                                                                                                <code className="text-[10px] font-bold truncate text-foreground/80">{rel.target_id}</code>
                                                                                            </div>
                                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0 opacity-0 group-hover:opacity-100" onClick={() => setRecord(rel.target_id)}>
                                                                                                <Navigation size={12} className="rotate-45" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <Separator className="opacity-5" />
                                                                            <div className="space-y-4">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Inbound References</span>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {record.relationships.inbound.map((rel: any, i: number) => (
                                                                                        <div key={i} className="p-4 rounded-xl bg-background border border-border/40 flex items-center justify-between group hover:border-primary/40 transition-all shadow-sm">
                                                                                            <div className="flex flex-col min-w-0 pr-4">
                                                                                                <span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1">{rel.kind.split(':').pop()?.split('--').pop()}</span>
                                                                                                <code className="text-[10px] font-bold truncate text-foreground/80">{rel.source_id}</code>
                                                                                            </div>
                                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0 opacity-0 group-hover:opacity-100" onClick={() => setRecord(rel.source_id)}>
                                                                                                <Navigation size={12} className="rotate-45" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </ScrollArea>
                                                                </TabsContent>
                                                                <TabsContent value="ancestry" className="h-full m-0 bg-background/50 flex flex-col items-center justify-center opacity-40 gap-4"><Layers size={40} /><span className="text-[10px] font-black uppercase tracking-widest">No Ancestry metadata</span></TabsContent>
                                                                <TabsContent value="map" className="h-full m-0 bg-background/50 flex flex-col items-center justify-center opacity-40 gap-4"><MapIcon size={40} /><span className="text-[10px] font-black uppercase tracking-widest">Spatial Data Identified</span></TabsContent>
                                                            </div>
                                                        </Tabs>

                                                        {/* Right Meta Column */}
                                                        <div className="w-80 border-l border-border/10 bg-muted/5 flex flex-col overflow-hidden shrink-0">
                                                            <div className="p-6 border-b border-border/10 bg-muted/10 shrink-0 uppercase tracking-[0.2em] font-black text-[9px] text-muted-foreground/60">Audit & Governance</div>
                                                            <ScrollArea className="flex-1 p-6">
                                                                <div className="space-y-8">
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2 text-muted-foreground/60 px-1 leading-none uppercase text-[9px] font-black"><Hash size={12} /> Identity</div>
                                                                        <div className="p-4 rounded-2xl bg-background border border-border/40 space-y-2 group shadow-sm">
                                                                            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Record UID</span>
                                                                            <div className="flex items-center justify-between gap-3 overflow-hidden">
                                                                                <code className="text-[10px] font-bold truncate text-indigo-600">{record.details.id}</code>
                                                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => { navigator.clipboard.writeText(record.details.id); toast.success("ID Copied"); }}><Hash size={10} /></Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <Separator className="opacity-5" />
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2 text-muted-foreground/60 px-1 leading-none uppercase text-[9px] font-black"><Shield size={12} /> Security</div>
                                                                        <div className="p-4 rounded-2xl bg-background border border-border/40 space-y-4 shadow-sm">
                                                                            <div className="space-y-2">
                                                                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">ACL Context</span>
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-blue-500/5 text-blue-600 text-[9px] font-bold uppercase">Owners <Badge className="bg-blue-500 text-white border-none h-4 px-1.5 text-[8px]">{record.details.acl?.owners?.length || 0}</Badge></div>
                                                                                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-500/5 text-amber-600 text-[9px] font-bold uppercase">Viewers <Badge className="bg-amber-500 text-white border-none h-4 px-1.5 text-[8px]">{record.details.acl?.viewers?.length || 0}</Badge></div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="h-px bg-border/5" />
                                                                            <div className="space-y-2">
                                                                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Legal Tags</span>
                                                                                <div className="flex flex-wrap gap-1.5">{(record.details.legal?.legaltags || []).map((t: string) => <Badge key={t} variant="outline" className="text-[8px] font-bold border-border/40 bg-muted/20 px-2 py-0 h-4 rounded-md">{t}</Badge>)}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <Separator className="opacity-5" />
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2 text-muted-foreground/60 px-1 leading-none uppercase text-[9px] font-black"><Activity size={12} /> Activity</div>
                                                                        <div className="p-4 rounded-2xl bg-background border border-border/40 flex items-center justify-between shadow-sm">
                                                                            <span className="text-[8px] font-black uppercase text-muted-foreground/40">Last Modified</span>
                                                                            <span className="text-[10px] font-bold text-foreground/80 font-mono">{new Date(record.details.modifyTime || Date.now()).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </ScrollArea>
                                                            <div className="p-6 border-t border-border/10 bg-muted/10 flex flex-col gap-2 shrink-0">
                                                                <Button variant="default" className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl shadow-indigo-500/20"><Save size={14} className="mr-2" /> Commit</Button>
                                                                <Button variant="ghost" className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-widest text-destructive hover:bg-destructive/5"><Trash2 size={14} className="mr-2" /> Unregister</Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : null}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </main>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </motion.div>
    );
};
