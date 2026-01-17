/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    Search, Layers, Database, ChevronRight, 
    Globe, BookOpen, ExternalLink,
    RefreshCw, HelpCircle, CheckSquare, Square, Save, Loader2
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
import { 
    Sheet,
    SheetContent
} from "@/components/ui/sheet";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCreateAssets } from '@/lib/api/connections';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Shared Components
import { ExplorerContentHeader } from '../../../explorer/components/ExplorerContentHeader';
import { DiscoverySkeleton } from '../../../explorer/components/DiscoverySkeleton';
import { OSDUKindDetails } from './components/OSDUKindDetails';

// --- Types ---

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
        acl?: any;
        legal?: any;
    };
}

interface OSDUBrowserProps {
    connectionId: number;
    connectionName: string;
    assets: OSDUKind[];
    isLoading: boolean;
    onDiscover: () => void;
    mode?: 'management' | 'exploration';
}

// --- Sub-components ---

const DomainSidebar: React.FC<{
    activeGroup: string;
    setActiveGroup: (group: string) => void;
    domainGroups: [string, number][];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}> = ({ activeGroup, setActiveGroup, domainGroups, searchQuery, setSearchQuery }) => (
    <aside className="w-72 flex flex-col border-r border-border/40 bg-muted/5 shrink-0">
        <div className="p-6 border-b border-border/20 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Subsurface Domains
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent">
                                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px] uppercase font-bold tracking-tight">Logical grouping of OSDU Kinds.</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="relative group">
                <Search className="z-20 absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Filter kinds..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-xl bg-background border-border/40 text-xs shadow-none"
                />
            </div>
        </div>
        <ScrollArea className="flex-1">
            <nav className="p-3 space-y-1">
                {domainGroups.map(([group, count]) => (
                    <button
                        key={group} onClick={() => setActiveGroup(group)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all group relative",
                            activeGroup === group 
                                ? "bg-primary/10 text-primary shadow-sm" 
                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("h-1.5 w-1.5 rounded-full transition-all", activeGroup === group ? "bg-primary scale-125" : "bg-border/60")} />
                            <span className="truncate capitalize font-bold">{group.replace(/-/g, ' ')}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] font-mono border-none h-5 px-1.5", activeGroup === group ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                            {count}
                        </Badge>
                    </button>
                ))}
            </nav>
        </ScrollArea>
        <div className="p-4 border-t border-border/20 bg-muted/10">
            <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 text-[10px] font-bold text-primary hover:bg-primary/5 cursor-pointer uppercase tracking-tight">
                <a href="https://community.opengroup.org/osdu/data/data-definitions" target="_blank" rel="noreferrer">
                    <BookOpen className="h-3.5 w-3.5" /> 
                    <span>OSDU Data Models</span> 
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </a>
            </Button>
        </div>
    </aside>
);

const KindCard: React.FC<{
    asset: OSDUKind;
    isSelected: boolean;
    onSelect: () => void;
    onToggleRegistration: () => void;
    isRegistered: boolean;
    getGroupColor: (group: string) => string;
    mode: 'management' | 'exploration';
}> = ({ asset, isSelected, onSelect, onToggleRegistration, isRegistered, getGroupColor, mode }) => (
    <div className="relative group">
        <button
            onClick={onSelect}
            className={cn(
                "w-full flex flex-col items-start p-6 rounded-[2.5rem] border border-border/40 bg-card/40 hover:bg-muted/40 hover:border-primary/40 hover:shadow-2xl transition-all text-left relative overflow-hidden",
                (mode === 'management' && isRegistered) && "border-primary/60 bg-primary/5 shadow-inner"
            )}
        >
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Layers className="h-20 w-20 rotate-12" />
            </div>
            <Badge className={cn("text-[9px] uppercase tracking-wider font-bold mb-4 border-none shadow-sm", getGroupColor(asset.metadata?.group || ''))}>
                {asset.metadata?.group || 'Core'}
            </Badge>
            <h4 className="text-[15px] font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1 pr-10">{asset.metadata?.entity_name || asset.name}</h4>
            <p className="text-[11px] text-muted-foreground font-medium line-clamp-2 opacity-70 leading-relaxed mb-6 h-8">{asset.name}</p>
            <div className="mt-auto pt-4 border-t border-border/20 w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className="flex items-center gap-2 text-muted-foreground/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> 
                    {asset.rows?.toLocaleString()} Active Records
                </span>
                <div className="h-7 w-7 rounded-xl bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                    <ChevronRight className="h-4 w-4 text-primary" />
                </div>
            </div>
        </button>
        
        {/* Selection Overlay */}
        {mode === 'management' && (
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleRegistration(); }}
                className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all"
            >
                {isRegistered ? (
                    <CheckSquare className="h-5 w-5 text-primary fill-primary/10" />
                ) : (
                    <Square className="h-5 w-5 text-muted-foreground/30 hover:text-primary opacity-0 group-hover:opacity-100" />
                )}
            </button>
        )}
    </div>
);

// --- Main Component ---

export const OSDUBrowser: React.FC<OSDUBrowserProps> = ({ 
    connectionId,
    connectionName,
    assets, 
    isLoading, 
    onDiscover,
    mode = 'management'
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKind, setSelectedKind] = useState<OSDUKind | null>(null);
    const [activeGroup, setActiveGroup] = useState<string>('All');
    const [selectedForRegistration, setSelectedForRegistration] = useState<Set<string>>(new Set());
    
    const queryClient = useQueryClient();

    const registerMutation = useMutation({
        mutationFn: (kinds: OSDUKind[]) => bulkCreateAssets(connectionId, {
            assets: kinds.map(k => ({
                name: k.metadata?.entity_name || k.name,
                asset_type: 'table',
                fully_qualified_name: k.name,
                is_source: true,
                is_destination: false,
                schema_metadata: {
                    osdu_kind: k.name,
                    group: k.metadata?.group,
                    version: k.metadata?.version,
                    acl: k.metadata?.acl,
                    legal: k.metadata?.legal
                }
            }))
        }),
        onSuccess: (data) => {
            toast.success("Assets Registered", { description: `Successfully registered ${data.successful_creates} assets.` });
            setSelectedForRegistration(new Set());
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
        },
        onError: (err: any) => toast.error("Registration Failed", { description: err.message })
    });

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

    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (a.metadata?.entity_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesGroup = activeGroup === 'All' || a.metadata?.group === activeGroup;
            return matchesSearch && matchesGroup;
        });
    }, [assets, searchQuery, activeGroup]);

    const toggleSelection = (kindName: string) => {
        const next = new Set(selectedForRegistration);
        if (next.has(kindName)) next.delete(kindName);
        else next.add(kindName);
        setSelectedForRegistration(next);
    };

    const handleBulkRegister = () => {
        const selectedKinds = assets.filter(a => selectedForRegistration.has(a.name));
        registerMutation.mutate(selectedKinds);
    };

    const getGroupColor = (group: string) => {
        const colors: Record<string, string> = {
            'master-data': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
            'reference-data': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
            'work-product-component': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
            'abstract': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
            'All': 'text-primary bg-primary/10 border-primary/20'
        };
        return colors[group] || 'text-muted-foreground bg-muted/10 border-border/40';
    };

    if (isLoading && assets.length === 0) {
        return <DiscoverySkeleton />;
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Unified Context Header */}
            <ExplorerContentHeader 
                name={connectionName} 
                type={mode === 'exploration' ? "OSDU EXPLORER" : "OSDU DATA PLATFORM"}
                actions={
                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {(mode === 'management' && selectedForRegistration.size > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={handleBulkRegister}
                                        disabled={registerMutation.isPending}
                                        className="rounded-xl h-8 px-4 gap-2 text-[10px] font-bold shadow-lg shadow-primary/20"
                                    >
                                        {registerMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        <span>REGISTER {selectedForRegistration.size} ASSETS</span>
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onDiscover} 
                            disabled={isLoading}
                            className="rounded-xl h-8 px-4 gap-2 text-[10px] font-bold border-border/40 bg-background/50 transition-all hover:bg-primary/5"
                        >
                            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} /> 
                            <span>{isLoading ? 'SCANNING PARTITION...' : 'RE-SCAN REGISTRY'}</span>
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 flex overflow-hidden">
                <DomainSidebar
                    activeGroup={activeGroup}
                    setActiveGroup={setActiveGroup}
                    domainGroups={domainGroups}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />

                {/* --- Main Discovery Grid --- */}
                <main className="flex-1 flex flex-col min-w-0 bg-background/20 relative">
                    {isLoading && assets.length > 0 && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-primary/20 z-50">
                            <motion.div 
                                className="h-full bg-primary" 
                                animate={{ width: ["0%", "100%"] }} 
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
                            />
                        </div>
                    )}
                    <ScrollArea className="flex-1">
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                            {filteredAssets.map(asset => (
                                <KindCard
                                    key={asset.name}
                                    asset={asset}
                                    isSelected={selectedKind?.name === asset.name}
                                    onSelect={() => setSelectedKind(asset)}
                                    onToggleRegistration={() => toggleSelection(asset.name)}
                                    isRegistered={selectedForRegistration.has(asset.name)}
                                    getGroupColor={getGroupColor}
                                    mode={mode}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </main>
            </div>

            {/* --- Details Side Drawer --- */}
            <Sheet open={!!selectedKind} onOpenChange={(o) => !o && setSelectedKind(null)}>
                <SheetContent side="right" className="sm:max-w-xl p-0 flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/40">
                    {selectedKind && (
                        <OSDUKindDetails 
                            kind={selectedKind} 
                            connectionId={connectionId} 
                            onClose={() => setSelectedKind(null)} 
                            initialTab={mode === 'exploration' ? 'data' : 'overview'}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};