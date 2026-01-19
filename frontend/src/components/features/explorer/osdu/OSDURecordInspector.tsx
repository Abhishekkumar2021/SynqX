/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    X, ArrowLeft, Database, Globe, 
    ShieldCheck, Download, Share2, 
    Binary, GitBranch, History, Map as MapIcon,
    RefreshCw, Save, Trash2, Hash, Shield, Activity,
    Navigation, ExternalLink, Sliders, Copy, ChevronRight,
    Lock, Info, Layout, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeBlock } from '@/components/ui/docs/CodeBlock';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { OSDUAncestryGraph } from './OSDUAncestryGraph';
import { SpatialMap } from '@/components/common/SpatialMap';
import { toast } from 'sonner';

interface OSDURecordInspectorProps {
    record: any;
    isLoading: boolean;
    onClose: () => void;
    onNavigate: (id: string) => void;
    onDownload?: () => void;
}

export const OSDURecordInspector: React.FC<OSDURecordInspectorProps> = ({
    record, isLoading, onClose, onNavigate, onDownload
}) => {
    const [activeTab, setActiveTab] = useState('payload');

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    // Extract coordinates if available
    const coordinates = useMemo(() => {
        if (!record?.spatial) return null;
        const coords = record.spatial.geometries?.[0]?.coordinates || record.spatial.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
            // OSDU usually [lon, lat]
            return { lon: coords[0], lat: coords[1] };
        }
        return null;
    }, [record]);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="absolute inset-0 z-50 bg-background flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] border-l border-border/20"
        >
            {/* Header */}
            <header className="h-20 px-10 border-b border-border/10 bg-background/40 backdrop-blur-3xl flex items-center justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-6 min-w-0">
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11 rounded-2xl hover:bg-muted active:scale-90 border border-border/40 shrink-0">
                        <ArrowLeft size={24} />
                    </Button>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 leading-none mb-1">Object Inspector</span>
                        <h2 className="text-xl font-black tracking-tighter text-foreground uppercase truncate" title={record?.details?.id}>
                            {isLoading ? 'Resolving Object...' : record?.details?.id}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {!isLoading && record && (
                        <div className="flex items-center gap-2">
                            {record.details.kind?.includes('dataset--File') && (
                                <Button onClick={onDownload} size="sm" className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-emerald-500/20">
                                    <Download size={16} /> Download
                                </Button>
                            )}
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/40 shadow-sm" onClick={() => copyToClipboard(record.details.id, "Registry ID")}>
                                <Copy size={16} />
                            </Button>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/40 shadow-sm">
                                <Share2 size={16} />
                            </Button>
                        </div>
                    )}
                    <Separator orientation="vertical" className="h-6 mx-2 opacity-10" />
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-muted"><X size={20} /></Button>
                </div>
            </header>

            {/* Content Body */}
            <div className="flex-1 flex min-h-0">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40">
                        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Materializing record manifest...</span>
                    </div>
                ) : record ? (
                    <>
                        <main className="flex-1 flex flex-col min-h-0 bg-background/50 border-r border-border/10">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col overflow-hidden">
                                <div className="px-10 border-b border-border/10 bg-muted/5 shrink-0">
                                    <TabsList className="bg-transparent gap-10 h-14">
                                        <TabsTrigger value="payload" className="gap-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"><Binary size={14} /> Manifest</TabsTrigger>
                                        <TabsTrigger value="relationships" className="gap-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"><GitBranch size={14} /> Relationships</TabsTrigger>
                                        <TabsTrigger value="ancestry" className="gap-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"><History size={14} /> Lineage</TabsTrigger>
                                        {coordinates && <TabsTrigger value="map" className="gap-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"><MapIcon size={14} /> Spatial</TabsTrigger>}
                                    </TabsList>
                                </div>

                                <div className="flex-1 min-h-0 relative">
                                    <TabsContent value="payload" className="h-full m-0 overflow-hidden bg-background">
                                        <CodeBlock code={JSON.stringify(record.details.data, null, 2)} language="json" rounded={false} maxHeight="100%" />
                                    </TabsContent>
                                    
                                    <TabsContent value="relationships" className="h-full m-0 overflow-hidden bg-muted/5">
                                        <ScrollArea className="h-full">
                                            <div className="p-12 space-y-16 pb-32 max-w-6xl mx-auto">
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between border-b border-border/10 pb-4">
                                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70 flex items-center gap-3">
                                                            <ArrowUpRight size={16} className="text-primary" /> Outbound References
                                                        </h3>
                                                        <Badge variant="outline" className="text-[10px] font-bold">{record.relationships.outbound.length} Links</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {record.relationships.outbound.map((rel: any, i: number) => (
                                                            <div key={i} className="p-5 rounded-[1.5rem] bg-background border border-border/40 flex items-center justify-between group hover:border-primary/40 transition-all shadow-sm">
                                                                <div className="flex flex-col min-w-0 pr-4">
                                                                    <span className="text-[9px] font-black uppercase text-muted-foreground/40 mb-1.5 tracking-widest">{rel.field}</span>
                                                                    <code className="text-xs font-bold truncate text-foreground/80 font-mono">{rel.target_id}</code>
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 shrink-0 bg-primary/5 text-primary" onClick={() => onNavigate(rel.target_id)}><Navigation size={14} className="rotate-45" /></Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between border-b border-border/10 pb-4">
                                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70 flex items-center gap-3">
                                                            <ChevronRight size={16} className="text-blue-500 rotate-180" /> Inbound references
                                                        </h3>
                                                        <Badge variant="outline" className="text-[10px] font-bold">{record.relationships.inbound.length} Links</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {record.relationships.inbound.map((rel: any, i: number) => (
                                                            <div key={i} className="p-5 rounded-[1.5rem] bg-background border border-border/40 flex items-center justify-between group hover:border-blue-500/40 transition-all shadow-sm">
                                                                <div className="flex flex-col min-w-0 pr-4">
                                                                    <span className="text-[9px] font-black uppercase text-muted-foreground/40 mb-1.5 tracking-widest">{rel.kind.split(':').pop()?.split('--').pop()}</span>
                                                                    <code className="text-xs font-bold truncate text-foreground/80 font-mono">{rel.source_id}</code>
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 shrink-0 bg-blue-500/5 text-blue-500" onClick={() => onNavigate(rel.source_id)}><Navigation size={14} className="rotate-45" /></Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>

                                    <TabsContent value="ancestry" className="h-full m-0 relative">
                                        <OSDUAncestryGraph ancestryData={record.ancestry} rootId={record.details.id} />
                                    </TabsContent>

                                    <TabsContent value="map" className="h-full m-0 flex flex-col p-10 gap-6 bg-muted/5">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Spatial Intelligence</h3>
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">WGS84 Geometric Context</p>
                                            </div>
                                            <Badge className="bg-primary/10 text-primary border-primary/20 font-black h-6 uppercase tracking-tighter text-[9px]">Live_Projection</Badge>
                                        </div>
                                        {coordinates && (
                                            <SpatialMap 
                                                latitude={coordinates.lat} 
                                                longitude={coordinates.lon} 
                                                title={record.details.id.split(':').pop()}
                                                description={record.details.kind}
                                                height="100%"
                                            />
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </main>

                        {/* Right Meta Column */}
                        <aside className="w-96 bg-muted/5 flex flex-col overflow-hidden shrink-0 border-l border-border/10">
                            <div className="p-6 px-8 border-b border-border/10 bg-muted/10 shrink-0 uppercase tracking-[0.2em] font-black text-[10px] text-muted-foreground/60 flex items-center gap-3">
                                <Lock size={14} /> Governance & Identity
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-8 space-y-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-muted-foreground/60 px-1 uppercase text-[10px] font-black tracking-widest"><Hash size={14} /> Technical Identifiers</div>
                                        <div className="p-5 rounded-[2rem] bg-background border border-border/20 space-y-4 shadow-sm group">
                                            <div className="space-y-1.5">
                                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Global Registry UID</span>
                                                <div className="bg-muted/30 p-3 rounded-xl border border-border/10">
                                                    <code className="text-[10px] font-bold break-all text-primary leading-relaxed font-mono">{record.details.id}</code>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Schema Version</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono border-border/40 bg-muted/20">{record.details.kind?.split(':').pop()}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-muted-foreground/60 px-1 uppercase text-[10px] font-black tracking-widest"><ShieldCheck size={14} /> Security Posture</div>
                                        <div className="p-6 rounded-[2rem] bg-background border border-border/40 space-y-8 shadow-sm">
                                            <div className="space-y-4">
                                                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Access Control Lists</span>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-500/5 text-blue-600 border border-blue-500/10 text-[10px] font-bold uppercase">Owners <Badge className="bg-blue-500 text-white border-none h-5 px-2 text-[10px]">{record.details.acl?.owners?.length || 0}</Badge></div>
                                                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/5 text-amber-600 border border-amber-500/10 text-[10px] font-bold uppercase">Viewers <Badge className="bg-amber-500 text-white border-none h-5 px-2 text-[10px]">{record.details.acl?.viewers?.length || 0}</Badge></div>
                                                </div>
                                            </div>
                                            <Separator className="opacity-5" />
                                            <div className="space-y-4">
                                                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Legal context</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {(record.details.legal?.legaltags || []).map((tag: string, idx: number) => (
                                                        <Badge key={tag || `tag-${idx}`} variant="outline" className="text-[10px] font-bold border-border/40 bg-muted/20 px-3 py-1.5 rounded-xl hover:bg-muted/40 transition-colors cursor-default">{tag}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-muted-foreground/60 px-1 uppercase text-[10px] font-black tracking-widest"><Activity size={14} /> Record Health</div>
                                        <div className="p-5 rounded-[2rem] bg-background border border-border/40 flex items-center justify-between shadow-sm hover:border-emerald-500/20 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">Status</span>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Verified</span>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            
                            {/* Actions Footer */}
                            <div className="p-8 border-t border-border/10 bg-muted/10 flex flex-col gap-3 shrink-0">
                                <Button variant="default" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"><Save size={18} className="mr-3" /> Push Changes</Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest border-border/40 group">
                                        <Sliders size={16} className="mr-2 group-hover:rotate-90 transition-transform" /> Setup
                                    </Button>
                                    <Button variant="ghost" className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 transition-all"><Trash2 size={18} className="mr-2" /> Expunge</Button>
                                </div>
                            </div>
                        </aside>
                    </>
                ) : null}
            </div>
        </motion.div>
    );
};