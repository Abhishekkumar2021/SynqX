/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    Search, RefreshCw, Save, Loader2,
    LayoutGrid, List, Plus, Sparkles, CheckCircle2,
    Grid3X3, Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent
} from "@/components/ui/sheet";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCreateAssets, discoverAssetSchema, type Asset } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Shared Components
import { OSDUKindDetails } from './components/OSDUKindDetails';
import { AssetTableRow } from '../../AssetTableRow';
import { AssetGridItem } from '../../AssetGridItem';
import { CreateAssetsDialog } from '../../CreateAssetsDialog';
import { DiscoveredAssetCard } from '../../DiscoveredAssetCard';

// Local Components
import { OSDUKind, ViewMode } from './types';
import { DomainCatalogSkeleton } from './components/DomainCatalogSkeleton';
import { FilterToolbar } from './components/FilterToolbar';
import { DomainGroupCard } from './components/DomainGroupCard';
import { RichKindCard } from './components/RichKindCard';
import { ManagedOSDUCard } from './components/ManagedOSDUCard';


interface OSDUBrowserProps {
    connectionId: number;
    connectionName: string;
    assets: OSDUKind[]; // These are discovered kinds
    registeredAssets?: Asset[]; // These are already managed in Synqx
    isLoading: boolean;
    onDiscover: () => void;
}

// --- Main Component ---

export const OSDUBrowser: React.FC<OSDUBrowserProps> = ({ 
    connectionId,
    assets = [], 
    registeredAssets = [],
    isLoading, 
    onDiscover
}) => {
    const [activeView, setActiveView] = useState<'managed' | 'discovery'>(registeredAssets.length > 0 ? 'managed' : 'discovery');
    const [viewMode, setViewMode] = useState<ViewMode>('domain');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedAuthority, setSelectedAuthority] = useState<string | null>(null);
    const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
    const [selectedKind, setSelectedKind] = useState<OSDUKind | null>(null);
    const [selectedForRegistration, setSelectedForRegistration] = useState<Set<string>>(new Set());
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    const queryClient = useQueryClient();

    const registerMutation = useMutation({
        mutationFn: async (kinds: OSDUKind[]) => {
            const data = await bulkCreateAssets(connectionId, {
                assets: kinds.map(k => ({
                    name: k.metadata?.entity_name || k.name,
                    asset_type: 'osdu_kind',
                    fully_qualified_name: k.name,
                    is_source: true,
                    is_destination: true,
                    connection_id: connectionId,
                    schema_metadata: {
                        osdu_kind: k.name,
                        group: k.metadata?.group,
                        version: k.metadata?.version,
                        acl: k.metadata?.acl,
                        legal: k.metadata?.legal
                    }
                }))
            });

            if (data.created_ids?.length > 0) {
                data.created_ids.forEach(id => discoverAssetSchema(connectionId, id));
            }
            return data;
        },
        onSuccess: (data) => {
            toast.success("Registration Successful", { 
                description: `Managed ${data.successful_creates} new OSDU Kinds.` 
            });
            setSelectedForRegistration(new Set());
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
            setActiveView('managed');
        },
        onError: (err: any) => toast.error("Registration Failed", { description: err.message })
    });

    const filteredDiscovery = useMemo(() => {
        return assets.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (a.metadata?.entity_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesGroup = selectedGroup === 'All' || a.metadata?.group === selectedGroup;
            const matchesSource = !selectedSource || a.metadata?.source === selectedSource;
            const matchesAuthority = !selectedAuthority || a.metadata?.authority === selectedAuthority;
            const matchesType = !selectedEntityType || a.metadata?.entity_type === selectedEntityType;
            return matchesSearch && matchesGroup && matchesSource && matchesAuthority && matchesType;
        });
    }, [assets, searchQuery, selectedGroup, selectedSource, selectedAuthority, selectedEntityType]);

    const filteredManaged = useMemo(() => {
        return registeredAssets.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (a.fully_qualified_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesGroup = selectedGroup === 'All' || a.schema_metadata?.group === selectedGroup;
            
            // Extract source/authority from kind name for managed assets if not explicitly in metadata
            const kindName = a.schema_metadata?.osdu_kind || a.fully_qualified_name || a.name;
            const parts = kindName.split(':');
            const authority = a.schema_metadata?.authority || (parts.length === 4 ? parts[0] : null);
            const source = a.schema_metadata?.source || (parts.length === 4 ? parts[1] : null);
            const entityType = a.schema_metadata?.entity_type || (parts.length === 4 ? parts[2] : null);

            const matchesSource = !selectedSource || source === selectedSource;
            const matchesAuthority = !selectedAuthority || authority === selectedAuthority;
            const matchesType = !selectedEntityType || entityType === selectedEntityType;

            return matchesSearch && matchesGroup && matchesSource && matchesAuthority && matchesType;
        });
    }, [registeredAssets, searchQuery, selectedGroup, selectedSource, selectedAuthority, selectedEntityType]);

    const discoveryGroups = useMemo(() => {
        const groups: Record<string, number> = {};
        assets.forEach(a => {
            const g = a.metadata?.group || 'other';
            groups[g] = (groups[g] || 0) + 1;
        });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]);
    }, [assets]);

    const managedGroups = useMemo(() => {
        const groups: Record<string, number> = {};
        registeredAssets.forEach(a => {
            const g = a.schema_metadata?.group || 'other';
            groups[g] = (groups[g] || 0) + 1;
        });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]);
    }, [registeredAssets]);

    // Extract unique sources and authorities for filters
    const { availableSources, availableAuthorities, availableEntityTypes } = useMemo(() => {
        const activeSet = activeView === 'managed' ? registeredAssets : assets;
        const sources = new Set<string>();
        const authorities = new Set<string>();
        const entityTypes = new Set<string>();

        activeSet.forEach((item: any) => {
            if (activeView === 'managed') {
                const kindName = item.schema_metadata?.osdu_kind || item.fully_qualified_name || item.name;
                const parts = kindName.split(':');
                const auth = item.schema_metadata?.authority || (parts.length === 4 ? parts[0] : null);
                const src = item.schema_metadata?.source || (parts.length === 4 ? parts[1] : null);
                const type = item.schema_metadata?.entity_type || (parts.length === 4 ? parts[2] : null);
                if (auth) authorities.add(auth);
                if (src) sources.add(src);
                if (type) entityTypes.add(type);
            } else {
                if (item.metadata?.authority) authorities.add(item.metadata.authority);
                if (item.metadata?.source) sources.add(item.metadata.source);
                if (item.metadata?.entity_type) entityTypes.add(item.metadata.entity_type);
            }
        });

        return {
            availableSources: Array.from(sources).sort(),
            availableAuthorities: Array.from(authorities).sort(),
            availableEntityTypes: Array.from(entityTypes).sort()
        };
    }, [assets, registeredAssets, activeView]);

    const toggleSelection = (kindName: string) => {
        const next = new Set(selectedForRegistration);
        if (next.has(kindName)) next.delete(kindName);
        else next.add(kindName);
        setSelectedForRegistration(next);
    };

    const handleSelectAllDiscovery = (checked: boolean) => {
        if (checked) setSelectedForRegistration(new Set(filteredDiscovery.map(a => a.name)));
        else setSelectedForRegistration(new Set());
    };

    const handleBulkRegister = () => {
        const selectedKinds = assets.filter(a => selectedForRegistration.has(a.name));
        registerMutation.mutate(selectedKinds);
    };

    return (
        <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
            {/* --- Toolbar --- */}
            <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border/20">
                        <button 
                            onClick={() => { setActiveView('managed'); setSelectedGroup('All'); setSelectedSource(null); setSelectedAuthority(null); setSelectedEntityType(null); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                activeView === 'managed' ? "bg-background text-primary shadow-sm shadow-primary/5" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <CheckCircle2 size={12} /> Registry ({registeredAssets.length})
                        </button>
                        <button 
                            onClick={() => { setActiveView('discovery'); setSelectedGroup('All'); setSelectedSource(null); setSelectedAuthority(null); setSelectedEntityType(null); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                activeView === 'discovery' ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Sparkles size={12} /> Discovery ({assets.length})
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-60 group">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                        <Input
                            placeholder={`Filter ${activeView === 'managed' ? 'registry' : 'discovery'}...`}
                            className="pl-9 h-9 rounded-xl bg-background/50 border-border/40 text-xs shadow-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5">
                        <Button
                            variant="ghost" size="icon" 
                            className={cn("h-7 w-7 rounded-md transition-all", viewMode === 'list' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted")}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" 
                            className={cn("h-7 w-7 rounded-md transition-all", viewMode === 'grid' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted")}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" 
                            className={cn("h-7 w-7 rounded-md transition-all", viewMode === 'domain' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted")}
                            onClick={() => setViewMode('domain')}
                            title="Grouped Domain View"
                        >
                            <Grid3X3 className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {activeView === 'discovery' ? (
                        <>
                            <AnimatePresence>
                                {selectedForRegistration.size > 0 && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                                        <Button variant="default" size="sm" onClick={handleBulkRegister} disabled={registerMutation.isPending} className="h-9 px-4 gap-2 text-xs font-bold rounded-xl shadow-lg shadow-primary/20">
                                            {registerMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            Register {selectedForRegistration.size}
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <Button variant="outline" size="icon" onClick={onDiscover} disabled={isLoading} className="h-9 w-9 rounded-xl border-border/40">
                                <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" className="h-9 px-4 gap-2 text-xs font-bold rounded-xl" onClick={() => setIsCreateOpen(true)}>
                            <Plus size={14} />
                            Add Asset
                        </Button>
                    )}
                </div>
            </div>

            {/* --- Main Layout --- */}
            <div className="flex-1 flex overflow-hidden relative">
                {isLoading && assets.length === 0 ? (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50">
                        <DomainCatalogSkeleton />
                    </div>
                ) : (
                    <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                        <AnimatePresence mode="wait">
                            {/* --- DOMAIN CATALOG VIEW --- */}
                            {viewMode === 'domain' ? (
                                <motion.div key="domain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 p-6">
                                    {/* Top Level Categories */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <Filter className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Domain Groups</h3>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            <DomainGroupCard 
                                                group="All" 
                                                count={activeView === 'managed' ? registeredAssets.length : assets.length} 
                                                isSelected={selectedGroup === 'All'}
                                                onClick={() => setSelectedGroup('All')}
                                            />
                                            {(activeView === 'managed' ? managedGroups : discoveryGroups).map(([group, count]) => (
                                                <DomainGroupCard 
                                                    key={group} 
                                                    group={group} 
                                                    count={count} 
                                                    isSelected={selectedGroup === group}
                                                    onClick={() => setSelectedGroup(group)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Advanced Filter Toolbar */}
                                    <div className="flex items-center justify-between px-1 border-b border-border/40 pb-4">
                                        <div className="flex items-center gap-4">
                                            <FilterToolbar 
                                                sources={availableSources}
                                                authorities={availableAuthorities}
                                                entityTypes={availableEntityTypes}
                                                selectedSource={selectedSource}
                                                selectedAuthority={selectedAuthority}
                                                selectedEntityType={selectedEntityType}
                                                onSelectSource={setSelectedSource}
                                                onSelectAuthority={setSelectedAuthority}
                                                onSelectEntityType={setSelectedEntityType}
                                                onClearAll={() => { setSelectedSource(null); setSelectedAuthority(null); setSelectedEntityType(null); }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-muted-foreground/60">{activeView === 'managed' ? filteredManaged.length : filteredDiscovery.length} items</span>
                                        </div>
                                    </div>

                                    {/* Filtered Results List */}
                                    <div className="space-y-4">
                                        <div className="grid gap-3">
                                            {activeView === 'managed' ? (
                                                 filteredManaged.length > 0 ? (
                                                    filteredManaged.map(asset => (
                                                        <ManagedOSDUCard key={asset.id} asset={asset} connectionId={connectionId} />
                                                    ))
                                                 ) : (
                                                    <div className="p-12 text-center border rounded-2xl border-dashed">
                                                        <p className="text-muted-foreground text-sm">No managed assets match your filters.</p>
                                                    </div>
                                                 )
                                            ) : (
                                                filteredDiscovery.length > 0 ? (
                                                    filteredDiscovery.map(kind => (
                                                        <RichKindCard 
                                                            key={kind.name} 
                                                            kind={kind} 
                                                            selected={selectedForRegistration.has(kind.name)} 
                                                            onSelect={() => toggleSelection(kind.name)}
                                                            onClick={() => setSelectedKind(kind)}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="p-12 text-center border rounded-2xl border-dashed">
                                                        <p className="text-muted-foreground text-sm">No discovered assets match your filters.</p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                /* --- LEGACY VIEWS (List/Grid) --- */
                                <motion.div key="legacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {activeView === 'managed' ? (
                                        viewMode === 'list' ? (
                                            <Table wrapperClassName="rounded-none border-none shadow-none">
                                                <TableHeader className="bg-muted/20 border-b border-border/40 sticky top-0 z-10 backdrop-blur-md">
                                                    <TableRow className="hover:bg-transparent border-none">
                                                        <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Asset</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Type</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Schema</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Volume</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Size</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Last Update</TableHead>
                                                        <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="divide-y divide-border/30">
                                                    {filteredManaged.map((asset) => (
                                                        <AssetTableRow key={asset.id} asset={asset} connectionId={connectionId} />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                                                {filteredManaged.map((asset) => (
                                                    <AssetGridItem key={asset.id} asset={asset} connectionId={connectionId} />
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        viewMode === 'list' ? (
                                            <Table wrapperClassName="rounded-none border-none shadow-none">
                                                <TableHeader className="bg-muted/30 border-b border-border/40 sticky top-0 z-10 backdrop-blur-md">
                                                    <TableRow className="hover:bg-transparent border-none">
                                                        <TableHead className="w-12 pl-6">
                                                            <Checkbox
                                                                checked={selectedForRegistration.size > 0 && selectedForRegistration.size === filteredDiscovery.length}
                                                                onCheckedChange={(checked) => handleSelectAllDiscovery(Boolean(checked))}
                                                                className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                            />
                                                        </TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Asset Name</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Domain Group</TableHead>
                                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70 text-right pr-6">Records</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredDiscovery.map((kind) => (
                                                        <TableRow 
                                                            key={kind.name} 
                                                            className={cn(
                                                                "hover:bg-amber-500/5 transition-colors border-b border-amber-500/10 group cursor-pointer",
                                                                selectedForRegistration.has(kind.name) && "bg-amber-500/5"
                                                            )}
                                                            onClick={() => toggleSelection(kind.name)}
                                                        >
                                                            <TableCell className="pl-6 py-2.5">
                                                                <Checkbox
                                                                    checked={selectedForRegistration.has(kind.name)}
                                                                    onCheckedChange={() => toggleSelection(kind.name)}
                                                                    className="border-amber-500/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-foreground/80 group-hover:text-amber-700 transition-colors">
                                                                        {kind.metadata?.entity_name || kind.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground/60 font-mono truncate">{kind.name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="capitalize text-[9px] font-bold tracking-widest bg-muted/50 border-amber-500/20 text-muted-foreground">
                                                                    {kind.metadata?.group || 'other'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-6 py-2.5 font-mono text-[11px] font-bold text-muted-foreground">
                                                                {kind.rows?.toLocaleString() || 0}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                                                {filteredDiscovery.map(kind => (
                                                    <DiscoveredAssetCard
                                                        key={kind.name}
                                                        asset={{ ...kind, asset_type: 'osdu_kind' }}
                                                        selected={selectedForRegistration.has(kind.name)}
                                                        onSelect={() => toggleSelection(kind.name)}
                                                    />
                                                ))}
                                            </div>
                                        )
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>
                )
            }
        </div>

            {/* --- Overlays --- */}
            <Sheet open={!!selectedKind} onOpenChange={(o) => !o && setSelectedKind(null)}>
                <SheetContent side="right" className="sm:max-w-xl p-0 flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl">
                    {selectedKind && (
                        <OSDUKindDetails 
                            kind={selectedKind} connectionId={connectionId} 
                            onClose={() => setSelectedKind(null)} initialTab="overview"
                        />
                    )}
                </SheetContent>
            </Sheet>

            <CreateAssetsDialog 
                connectionId={connectionId} connectorType={'osdu'} 
                open={isCreateOpen} onOpenChange={setIsCreateOpen}
            />
        </div>
    );
};
