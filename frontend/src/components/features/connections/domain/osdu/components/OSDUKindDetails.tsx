/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    Layers, Globe, Shield, History, Settings2, FileSearch, ArrowLeft,
    Play, Loader2, Info, Lock, Scale, Tag, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';
import { useMutation, useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/api/ephemeral';
import { getConnectionMetadata } from '@/lib/api/connections';
import { toast } from 'sonner';

// --- Helper Components ---



// --- Main Component ---

interface OSDUKindDetailsProps {
    kind: any;
    connectionId: number;
    onClose: () => void;
    initialTab?: string;
}

export const OSDUKindDetails: React.FC<OSDUKindDetailsProps> = ({ 
    kind, 
    connectionId, 
    onClose,
    initialTab = 'overview'
}) => {
    const [luceneQuery, setLuceneQuery] = useState('*:*');

    // Fetch full record sample if ACLs are missing (due to fast discovery)
    const recordQuery = useQuery({
        queryKey: ['osdu', 'record-sample', connectionId, kind.name],
        queryFn: () => executeQuery(connectionId, { 
            query: '*:*', 
            limit: 1,
            params: { kind: kind.name }
        }),
        enabled: !kind.metadata?.acl || !kind.metadata?.legal,
    });

    const fullMetadata = useMemo(() => {
        const base = kind.metadata || {};
        if (recordQuery.data?.result_sample?.rows?.length > 0) {
            const record = recordQuery.data.result_sample.rows[0];
            return {
                ...base,
                acl: record.acl || base.acl,
                legal: record.legal || base.legal,
                tags: record.tags || base.tags
            };
        }
        return base;
    }, [kind.metadata, recordQuery.data]);

    const searchMutation = useMutation({
        mutationFn: (query: string) => executeQuery(connectionId, { 
            query, 
            limit: 100,
            params: { kind: kind.name }
        }),
        onError: (err: any) => toast.error("OSDU Search Failed", { description: err.message })
    });

    const schemaQuery = useQuery({
        queryKey: ['osdu', 'schema', connectionId, kind.name],
        queryFn: () => getConnectionMetadata(connectionId, 'get_schema', { kind: kind.name }),
        enabled: initialTab === 'schema', // Fetch if landing on schema
    });

    const searchResults = searchMutation.data ? {
        results: searchMutation.data.result_sample?.rows || [],
        columns: searchMutation.data.result_summary?.columns || [],
        count: searchMutation.data.result_summary?.count || 0
    } : null;

    const handleTabChange = (value: string) => {
        if (value === 'schema' && !schemaQuery.data) {
            schemaQuery.refetch();
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="p-8 border-b border-border/20 bg-muted/5 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose}
                            className="h-9 w-9 rounded-xl hover:bg-muted/80 -ml-2"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-none">
                            {fullMetadata?.group?.replace(/-/g, ' ')}
                        </Badge>
                    </div>
                    <SheetTitle className="text-2xl font-bold tracking-tight leading-tight">
                        {fullMetadata?.entity_name || kind.name}
                    </SheetTitle>
                    <SheetDescription className="text-xs font-mono font-medium opacity-70 flex items-center gap-2 pt-1">
                        <Globe className="h-3 w-3" /> {kind.name}
                    </SheetDescription>
                </div>
            </SheetHeader>

            <Tabs defaultValue={initialTab} className="flex-1 flex flex-col min-h-0" onValueChange={handleTabChange}>
                <div className="px-8 border-b border-border/20 bg-muted/10">
                    <TabsList className="bg-transparent h-14 w-full justify-start gap-8 p-0 border-none">
                        <TabsTrigger value="overview" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-[13px] px-1 transition-all">Overview</TabsTrigger>
                        <TabsTrigger value="data" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-[13px] px-1 transition-all">Data Explorer</TabsTrigger>
                        <TabsTrigger value="schema" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-[13px] px-1 transition-all">Schema</TabsTrigger>
                        <TabsTrigger value="security" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-[13px] px-1 transition-all">Security & Legal</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <TabsContent value="overview" className="mt-0 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard icon={<Shield className="h-4 w-4" />} label="Authority" value={kind.metadata?.authority} />
                            <StatCard icon={<History className="h-4 w-4" />} label="Version" value={kind.metadata?.version} />
                            <StatCard icon={<Database className="h-4 w-4" />} label="Partition" value={kind.schema} />
                            <StatCard icon={<Layers className="h-4 w-4" />} label="Records" value={kind.rows?.toLocaleString()} />
                        </div>

                        <div className="space-y-4">
                            <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Core Identity</h5>
                            <div className="p-6 rounded-3xl border border-border/40 bg-muted/5 space-y-5">
                                <DetailItem label="Entity Type" value={kind.metadata?.entity_type} />
                                <DetailItem label="Source Namespace" value={kind.metadata?.source} />
                                <DetailItem label="Semantic Group" value={kind.metadata?.group} />
                                <DetailItem 
                                    label="Definition Status" 
                                    value={<Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">PRODUCTION READY</Badge>} 
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-primary/20 gap-2">
                                <Settings2 className="h-4 w-4" /> Create Extraction Pipeline
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="data" className="mt-0 h-full flex flex-col gap-6">
                        <div className="p-6 rounded-3xl border border-border bg-muted/5 space-y-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileSearch className="z-20 h-4 w-4 text-primary" />
                                    <h4 className="font-bold text-sm">Lucene Search</h4>
                                </div>
                                <Badge variant="secondary" className="text-[9px] font-bold">REAL-TIME</Badge>
                            </div>
                            <div className="flex gap-2">
                                <Input 
                                    value={luceneQuery}
                                    onChange={(e) => setLuceneQuery(e.target.value)}
                                    placeholder="query string (e.g. data.WellName: 'A*')..." 
                                    className="h-10 rounded-xl bg-background font-mono text-xs shadow-inner" 
                                />
                                <Button 
                                    onClick={() => searchMutation.mutate(luceneQuery)}
                                    disabled={searchMutation.isPending}
                                    className="rounded-xl h-10 px-6 font-bold gap-2"
                                >
                                    {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                    Execute
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 px-1">
                                <Info className="h-3 w-3" /> Tip: use <code>data.Property: Value</code> for field-level filtering.
                            </p>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            <ResultsGrid 
                                data={searchResults} 
                                isLoading={searchMutation.isPending} 
                                variant="embedded"
                                noBorder
                                noBackground
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="schema" className="mt-0">
                        {schemaQuery.isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                <p className="text-sm font-bold text-muted-foreground animate-pulse">Fetching Schema from OSDU Platform...</p>
                            </div>
                        ) : schemaQuery.data ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Kind Properties</h5>
                                    <Badge variant="outline" className="text-[9px] font-mono">{Object.keys(schemaQuery.data.metadata?.properties || {}).length} Fields</Badge>
                                </div>
                                <div className="grid gap-3">
                                    {Object.entries(schemaQuery.data.metadata?.properties || {}).map(([name, meta]: [string, any]) => (
                                        <div key={name} className="p-4 rounded-2xl border border-border/40 bg-muted/5 flex items-center justify-between group hover:bg-muted/10 transition-all">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold font-mono group-hover:text-primary transition-colors">{name}</span>
                                                <span className="text-[10px] text-muted-foreground/60 line-clamp-1">{meta.description || 'No description available'}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] font-mono h-5">{meta.type}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center space-y-4 opacity-40">
                                <Layers className="h-12 w-12 mx-auto" />
                                <p className="text-sm font-bold">Discovering Schema Definitions from OSDU Schema Service...</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="security" className="mt-0 space-y-8">
                        <div className="space-y-4">
                            <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Entitlements (ACLs)</h5>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-6 rounded-3xl border border-border/40 bg-muted/5 space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                                            <Lock className="h-3.5 w-3.5 text-amber-500" /> Viewers
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(kind.metadata?.acl?.viewers || []).map((v: string) => (
                                                <Badge key={v} variant="outline" className="text-[10px] py-1 px-3 rounded-lg bg-background/50 border-border/40 font-mono">{v}</Badge>
                                            ))}
                                            {!(kind.metadata?.acl?.viewers?.length) && <span className="text-[10px] text-muted-foreground italic">No explicit viewers defined</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                                            <Lock className="h-3.5 w-3.5 text-rose-500" /> Owners
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(kind.metadata?.acl?.owners || []).map((o: string) => (
                                                <Badge key={o} variant="outline" className="text-[10px] py-1 px-3 rounded-lg bg-background/50 border-border/40 font-mono">{o}</Badge>
                                            ))}
                                            {!(kind.metadata?.acl?.owners?.length) && <span className="text-[10px] text-muted-foreground italic">No explicit owners defined</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Legal Compliance</h5>
                            <div className="p-6 rounded-3xl border border-border/40 bg-muted/5 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                                        <Scale className="h-3.5 w-3.5 text-blue-500" /> Legal Tags
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(kind.metadata?.legal?.legaltags || []).map((t: string) => (
                                            <Badge key={t} className="text-[10px] py-1 px-3 rounded-lg bg-blue-500/10 text-blue-600 border-none font-bold">{t}</Badge>
                                        ))}
                                        {!(kind.metadata?.legal?.legaltags?.length) && <span className="text-[10px] text-muted-foreground italic">No legal tags assigned</span>}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                    <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                                        <Globe className="h-3.5 w-3.5 text-emerald-500" /> Other Relevant Data Countries
                                    </div>
                                    <div className="flex gap-1">
                                        {(kind.metadata?.legal?.otherRelevantDataCountries || []).map((c: string) => (
                                            <Badge key={c} variant="secondary" className="text-[10px] font-bold">{c}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">System Tags</h5>
                             <div className="p-6 rounded-3xl border border-border/40 bg-muted/5 flex flex-wrap gap-2">
                                {Object.entries(kind.metadata?.tags || {}).map(([k, v]: [string, any]) => (
                                    <Badge key={k} variant="outline" className="gap-2 px-3 py-1 rounded-xl border-border/40 text-[10px] font-bold">
                                        <Tag className="h-3 w-3 opacity-50" /> {k}: {v}
                                    </Badge>
                                ))}
                                {!(Object.keys(kind.metadata?.tags || {}).length) && <span className="text-[10px] text-muted-foreground italic">No system tags present</span>}
                             </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};


const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
    <div className="p-5 rounded-2xl border border-border/40 bg-muted/5 space-y-2 hover:bg-muted/10 transition-all">
        <div className="flex items-center gap-2.5 text-muted-foreground/70">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-[13px] font-bold text-foreground truncate">{value || 'N/A'}</p>
    </div>
);

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
    </div>
);
