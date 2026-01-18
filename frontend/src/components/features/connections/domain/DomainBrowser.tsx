/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
    Search, RefreshCw, Save, Loader2,
    LayoutGrid, Plus, Sparkles, CheckCircle2,
    Database,
    X, Check, ChevronDown, ChevronsUpDown,
    ArrowRightLeft,
    AlertTriangle, XCircle, ShieldAlert
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCreateAssets, discoverAssetSchema, type Asset } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { DOMAIN_CONFIGS, type DomainConfig } from '@/lib/domain-definitions';
import { CreateAssetsDialog } from '../CreateAssetsDialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DomainEntityDetails } from './DomainEntityDetails';
import { AssetCardActions } from './AssetCardActions';

// --- Shared Components ---

const DomainCatalogSkeleton = () => (
    <div className="p-6 space-y-8 animate-pulse">
        <div className="flex items-center justify-between px-1 border-b border-border/40 pb-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-32 rounded-xl" />
                <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
            <Skeleton className="h-5 w-24 rounded-md" />
        </div>

        <div className="space-y-6">
            {[1, 2].map(i => (
                <div key={i} className="space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40">
                        <Skeleton className="h-5 w-5 rounded-lg" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1">
                            <Skeleton className="h-6 w-48 rounded-lg" />
                        </div>
                        <Skeleton className="h-6 w-12 rounded-lg" />
                    </div>
                    
                    {i === 1 && (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3].map(j => (
                                <div key={j} className="h-[180px] p-6 rounded-2xl border border-border/40 bg-card space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-20 rounded-md" />
                                            <Skeleton className="h-6 w-40 rounded-lg" />
                                        </div>
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                    </div>
                                    <Skeleton className="h-8 w-full rounded-xl" />
                                    <div className="pt-4 border-t border-border/10 flex justify-between">
                                        <Skeleton className="h-5 w-24 rounded-md" />
                                        <Skeleton className="h-5 w-16 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const FilterToolbar = ({
    config,
    items,
    selectedFilters,
    onSelectFilter,
    onClearAll
}: {
    config: DomainConfig,
    items: any[],
    selectedFilters: Record<string, string | null>,
    onSelectFilter: (id: string, val: string | null) => void,
    onClearAll: () => void
}) => {
    // Unified value extractor for filter options
    const getFilterValue = useCallback((item: any, filterId: string, getValueFn: (i: any) => string | undefined) => {
        // 1. Try explicit getValue (Discovery items)
        let val = getValueFn(item);
        
        // 2. Try schema_metadata (Managed assets)
        if (!val && item.schema_metadata) {
            val = item.schema_metadata[filterId];
        }
        
        // 3. Fallback: Parse OSDU kind string
        if (!val && config.connectorType === 'osdu') {
            const name = item.name || '';
            const parts = name.split(':');
            if (filterId === 'authority') val = parts[0];
            else if (filterId === 'source') val = parts[1];
            else if (filterId === 'entity_type') {
                const et = parts[2];
                val = et?.includes('--') ? et.split('--')[1] : et;
            }
        }
        return val;
    }, [config]);

    // Dynamically compute unique values for each filter
    const filterOptions = useMemo(() => {
        const options: Record<string, Set<string>> = {};
        config.filters.forEach(f => {
            options[f.id] = new Set();
        });
        items.forEach(item => {
            config.filters.forEach(f => {
                const val = getFilterValue(item, f.id, f.getValue);
                if (val) options[f.id].add(val);
            });
        });
        return options;
    }, [config, items, getFilterValue]);

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {config.filters.map(f => {
                const selected = selectedFilters[f.id];
                const available = Array.from(filterOptions[f.id] || []).sort();
                
                if (available.length === 0) return null;

                return (
                    <DropdownMenu key={f.id}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("h-8 gap-2 rounded-lg border-dashed", selected && "border-primary bg-primary/5 text-primary border-solid")}>
                                {f.icon && <f.icon className="h-3.5 w-3.5" />}
                                <span className="text-xs font-medium">{selected || f.label}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 p-1 max-h-80 overflow-y-auto">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Filter by {f.label}</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/10" />
                            {available.map(opt => (
                                <DropdownMenuItem key={opt} onClick={() => onSelectFilter(f.id, opt === selected ? null : opt)} className="gap-2 rounded-lg cursor-pointer">
                                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", opt === selected ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                                        {opt === selected && <Check className="h-2.5 w-2.5" />}
                                    </div>
                                    <span className="truncate text-xs font-medium">{opt}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}

            {Object.values(selectedFilters).some(v => v !== null) && (
                <Button variant="ghost" size="sm" onClick={onClearAll} className="h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-primary px-2 transition-colors">
                    <X className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Reset Filters</span>
                </Button>
            )}
        </div>
    );
};



const GenericEntityCard = ({ 
    item, 
    config,
    connectionId,
    selected, 
    onSelect,
    onClick,
    isManaged
}: { 
    item: any, 
    config: DomainConfig,
    connectionId: number,
    selected: boolean, 
    onSelect: () => void,
    onClick: () => void,
    isManaged?: boolean
}) => {
    const title = isManaged ? item.name : config.card.getTitle(item);
    const subtitle = isManaged ? item.fully_qualified_name : config.card.getSubtitle(item);
    const kind = isManaged ? item.asset_type : (item.metadata?.entity_type || config.registration.assetType);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            whileHover={{ y: -2 }}
            className={cn(
                "group relative flex flex-col justify-between p-5 rounded-2xl border transition-all h-[180px]",
                selected 
                    ? "bg-primary/[0.03] border-primary shadow-md ring-1 ring-primary/20" 
                    : "bg-card border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-black/5",
                "cursor-pointer overflow-hidden"
            )}
            onClick={onClick}
        >
            {/* Context selection overlay for discovery mode */}
            {!isManaged && selected && (
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            )}

            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-tighter bg-muted/50 border-border/40 text-muted-foreground/70">
                                {kind}
                            </Badge>
                            {isManaged && <Badge className="h-4 px-1.5 text-[8px] font-black bg-emerald-500/10 text-emerald-600 border-none uppercase">Registered</Badge>}
                        </div>
                        <h4 className="font-bold text-base text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                            {title}
                        </h4>
                    </div>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isManaged ? (
                            <AssetCardActions 
                                item={item} 
                                config={config} 
                                connectionId={connectionId} 
                                isManaged 
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    checked={selected}
                                    onCheckedChange={() => onSelect()}
                                    className="h-5 w-5 rounded-md border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-[10px] text-muted-foreground/60 font-mono bg-muted/20 px-2 py-1 rounded-lg truncate border border-border/5">
                    {subtitle}
                </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/10 mt-auto">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {!isManaged && config.card.badges.map((badge, idx) => {
                        const val = badge.getValue(item);
                        if (!val) return null;
                        return (
                            <Badge key={idx} variant="secondary" className={cn("text-[9px] font-bold px-1.5 py-0 rounded-md h-5", badge.color)}>
                                {badge.label || val}
                            </Badge>
                        );
                    })}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    {isManaged ? (
                        item.row_count_estimate !== undefined && item.row_count_estimate !== null && (
                            <div className="flex items-center gap-1.5 text-muted-foreground/50">
                                <Database className="h-3 w-3" />
                                <span className="font-mono font-bold text-[10px]">{item.row_count_estimate.toLocaleString()}</span>
                            </div>
                        )
                    ) : (
                        config.card.stats.map((stat, idx) => {
                            const val = stat.getValue(item);
                            if (val === undefined || val === null) return null;
                            const StatIcon = stat.icon || Database;
                            return (
                               <div key={idx} className="flex items-center gap-1.5 text-muted-foreground/50">
                                   <StatIcon className="h-3 w-3" />
                                   <span className="font-mono font-bold text-[10px]">{String(val)}</span>
                               </div>
                            );
                        })
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// --- Main Component ---

interface DomainBrowserProps {
    connectionId: number;
    connectionName: string;
    connectorType: string;
    assets: any[]; // Discovery entities
    registeredAssets?: Asset[]; // Managed assets
    isLoading: boolean;
    onDiscover: () => void;
}

export const DomainBrowser: React.FC<DomainBrowserProps> = ({
    connectionId,
    connectorType,
    assets = [], 
    registeredAssets = [],
    isLoading, 
    onDiscover
}) => {
    const [activeView, setActiveView] = useState<'managed' | 'discovery'>(registeredAssets.length > 0 ? 'managed' : 'discovery');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string | null>>({});
    const [selectedForRegistration, setSelectedForRegistration] = useState<Set<string>>(new Set());
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // NAVIGATION STACK FOR DRILL-DOWN
    const [entityStack, setEntityStack] = useState<any[]>([]);
    
    const pushToStack = (item: any) => {
        setEntityStack(prev => [...prev, item]);
    };

    const popFromStack = () => {
        setEntityStack(prev => prev.slice(0, -1));
    };

    const inspectingItem = entityStack.length > 0 ? entityStack[entityStack.length - 1] : null;

    const queryClient = useQueryClient();
    const config = DOMAIN_CONFIGS[connectorType.toLowerCase()];

    const registerMutation = useMutation({
        mutationFn: async ({ items, mode }: { items: any[], mode: 'source' | 'destination' | 'both' }) => {
            if (!config) return;
            const payload = {
                assets: items.map(item => ({
                    name: config.registration.getName(item),
                    asset_type: config.registration.assetType,
                    fully_qualified_name: config.registration.getFqn(item),
                    is_source: mode === 'source' || mode === 'both',
                    is_destination: mode === 'destination' || mode === 'both',
                    connection_id: connectionId,
                    row_count_estimate: item.rows, // Preserve the record count discovered
                    schema_metadata: config.registration.getSchemaMetadata(item)
                }))
            };
            
            const data = await bulkCreateAssets(connectionId, payload);
            if (data.created_ids?.length > 0) {
                // Trigger discovery for new items to fetch fields
                data.created_ids.forEach(id => discoverAssetSchema(connectionId, id));
            }
            return data;
        },
        onSuccess: (data) => {
            if (!data) return;
            
            const totalSuccess = data.successful_creates;
            if (totalSuccess === data.total_requested) {
                toast.success("Registration Complete", {
                    description: `All ${data.successful_creates} domain entities are now managed.`,
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                });
            } else if (totalSuccess > 0) {
                toast.warning("Partial Registration", {
                    description: `${totalSuccess} entities processed (${data.successful_creates} new), ${data.failed_creates} failed.`,
                    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />
                });
            } else {
                toast.error("Registration Failed", {
                    description: "No entities could be registered.",
                    icon: <XCircle className="h-4 w-4 text-destructive" />
                });
            }

            if (totalSuccess > 0) {
                setSelectedForRegistration(new Set());
                queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
                setActiveView('managed');
            }
        },
        onError: (err: any) => {
            toast.error("Registration Failed", { 
                description: err.response?.data?.detail?.message || err.message || "An unexpected error occurred.",
                icon: <ShieldAlert className="h-4 w-4 text-destructive" />
            })
        }
    });

    const handleBulkRegister = (mode: 'source' | 'destination' | 'both') => {
        const items = assets.filter(a => selectedForRegistration.has(config.registration.getFqn(a)));
        registerMutation.mutate({ items, mode });
    };

    // --- Filtering Logic ---
    const filterItems = useCallback((items: any[]) => {
        if (!config) return [];
        return items.filter(item => {
            // 1. Search
            const title = (config.card.getTitle(item) || '').toLowerCase();
            const subtitle = (config.card.getSubtitle(item) || '').toLowerCase();
            const search = searchQuery.toLowerCase();
            if (searchQuery && !title.includes(search) && !subtitle.includes(search)) return false;

            // 2. Dynamic Filters
            for (const filter of config.filters) {
                const selectedVal = selectedFilters[filter.id];
                if (selectedVal) {
                    const itemVal = filter.getValue(item);
                    if (itemVal !== selectedVal) return false;
                }
            }

            return true;
        });
    }, [config, searchQuery, selectedFilters]);

    const filteredDiscovery = useMemo(() => {
        if (!config) return [];
        return filterItems(assets);
    }, [assets, filterItems, config]);
    
    const filteredManaged = useMemo(() => {
        if (!config) return [];
        return registeredAssets.filter(asset => {
            // 1. Search
            const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (asset.fully_qualified_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            if (searchQuery && !matchesSearch) return false;

            // 2. Dynamic Filters
            for (const filter of config.filters) {
                const selectedVal = selectedFilters[filter.id];
                if (selectedVal) {
                    let itemVal = asset.schema_metadata?.[filter.id];
                    
                    // Fallback for OSDU kind parsing if metadata fields are missing
                    if (itemVal === undefined && config.connectorType === 'osdu') {
                        const parts = asset.name.split(':');
                        if (filter.id === 'authority') itemVal = parts[0];
                        else if (filter.id === 'source') itemVal = parts[1];
                        else if (filter.id === 'entity_type') {
                            const et = parts[2];
                            itemVal = et?.includes('--') ? et.split('--')[1] : et;
                        }
                    }

                    if (itemVal !== selectedVal) return false;
                }
            }

            return true;
        });
    }, [registeredAssets, searchQuery, selectedFilters, config]);

    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

    const discoveryGroups = useMemo(() => {
        if (!config) return [];
        const groups: Record<string, any[]> = {};
        filteredDiscovery.forEach(item => {
            const g = config.grouping.field(item);
            if (!groups[g]) {
                groups[g] = [];
            }
            groups[g].push(item);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [filteredDiscovery, config]);

    const managedGroups = useMemo(() => {
        if (!config) return [];
        const groups: Record<string, any[]> = {};
        filteredManaged.forEach(asset => {
            const g = asset.schema_metadata?.group || asset.schema_metadata?.module || 'Unknown';
            if (!groups[g]) {
                groups[g] = [];
            }
            groups[g].push(asset);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [filteredManaged, config]);

    useEffect(() => {
        const firstGroup = (activeView === 'discovery' ? discoveryGroups[0]?.[0] : managedGroups[0]?.[0]);
        if (firstGroup) {
            setOpenGroups(new Set([firstGroup]));
        } else {
            setOpenGroups(new Set());
        }
    }, [activeView, discoveryGroups, managedGroups]);
    
    // --- Handlers ---
    const toggleSelection = (id: string) => {
        const next = new Set(selectedForRegistration);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedForRegistration(next);
    };

    const handleSelectGroup = (groupItems: any[], shouldSelect: boolean) => {
        if (!config) return;
        const groupFqns = groupItems.map(i => config.registration.getFqn(i));
        const next = new Set(selectedForRegistration);
        if (shouldSelect) {
            groupFqns.forEach(fqn => next.add(fqn));
        } else {
            groupFqns.forEach(fqn => next.delete(fqn));
        }
        setSelectedForRegistration(next);
    };

    const handleSelectAll = (shouldSelect: boolean) => {
        if (!config) return;
        if (shouldSelect) {
            const allFqns = filteredDiscovery.map(i => config.registration.getFqn(i));
            setSelectedForRegistration(new Set(allFqns));
        } else {
            setSelectedForRegistration(new Set());
        }
    };

    const allFilteredFqns = useMemo(() => {
        if (!config) return new Set();
        return new Set(filteredDiscovery.map(i => config.registration.getFqn(i)));
    }, [filteredDiscovery, config]);
    
    const selectedCount = selectedForRegistration.size;
    const isAllSelected = selectedCount > 0 && selectedCount === allFilteredFqns.size;
    const isSomeSelected = selectedCount > 0 && selectedCount < allFilteredFqns.size;

    // Safety check if no config is found for this connector
    if (!config) {
        return (
            <div className="p-8 text-center">
                <h3 className="text-lg font-bold">Unsupported Domain Connector</h3>
                <p className="text-muted-foreground">No domain configuration found for {connectorType}.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
            {/* --- Toolbar --- */}
            <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border/20">
                        <button 
                            onClick={() => { setActiveView('managed'); setSelectedFilters({}); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                activeView === 'managed' ? "bg-background text-primary shadow-sm shadow-primary/5" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <CheckCircle2 size={12} /> Registry ({registeredAssets.length})
                        </button>
                        <button 
                            onClick={() => { setActiveView('discovery'); setSelectedFilters({}); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                activeView === 'discovery' ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Sparkles size={12} /> {config.displayName} ({assets.length})
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


                    {activeView === 'discovery' ? (
                        <>
                            <AnimatePresence>
                                {selectedForRegistration.size > 0 && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="default" size="sm" disabled={registerMutation.isPending} className="h-9 px-4 gap-2 text-xs font-bold rounded-xl shadow-lg shadow-primary/20">
                                                    {registerMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                    Register {selectedForRegistration.size}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl border-border/60 shadow-xl p-1">
                                                <DropdownMenuItem 
                                                    onClick={() => handleBulkRegister('source')}
                                                    className="rounded-lg text-xs font-medium py-2 gap-2"
                                                >
                                                    <Database className="h-3.5 w-3.5 text-primary" /> Register as Source(s)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleBulkRegister('destination')}
                                                    className="rounded-lg text-xs font-medium py-2 gap-2"
                                                >
                                                    <Save className="h-3.5 w-3.5 text-emerald-500" /> Register as Destination(s)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleBulkRegister('both')}
                                                    className="rounded-lg text-xs font-medium py-2 gap-2"
                                                >
                                                    <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Register as Both
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
                                <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent p-6 space-y-6">
                                    <div className="flex items-center justify-between px-1 border-b border-border/40 pb-4">
                                        <div className="flex items-center gap-4">
                                            {activeView === 'discovery' && filteredDiscovery.length > 0 && (
                                                <div className="flex items-center gap-2 pr-4 border-r border-border/40">
                                                    <Checkbox
                                                        id="select-all"
                                                        checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                    />
                                                    <label htmlFor="select-all" className="text-xs font-medium cursor-pointer">Select All</label>
                                                </div>
                                            )}
                                            <FilterToolbar 
                                                config={config}
                                                items={activeView === 'managed' ? registeredAssets : assets}
                                                selectedFilters={selectedFilters}
                                                onSelectFilter={(id, val) => setSelectedFilters(prev => ({ ...prev, [id]: val }))}
                                                onClearAll={() => setSelectedFilters({})}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-muted-foreground/60">
                                                {(activeView === 'managed' ? filteredManaged.length : filteredDiscovery.length)} items
                                            </span>
                                        </div>
                                    </div>
            
                                    <div className="space-y-3">
                                        {(activeView === 'discovery' ? discoveryGroups : managedGroups).map(([group, items]) => {
                                            const groupFqns = items.map((i:any) => config.registration.getFqn(i));
                                            const selectedInGroup = groupFqns.filter(fqn => selectedForRegistration.has(fqn)).length;
                                            const isAllGroupSelected = selectedInGroup === items.length;
                                            const isSomeGroupSelected = selectedInGroup > 0 && selectedInGroup < items.length;
                                            
                                            return (
                                            <Collapsible
                                                key={group}
                                                open={openGroups.has(group)}
                                                onOpenChange={(isOpen) => {
                                                    const next = new Set(openGroups);
                                                    if (isOpen) next.add(group);
                                                    else next.delete(group);
                                                    setOpenGroups(next);
                                                }}
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/80 transition-colors cursor-pointer">
                                                         {activeView === 'discovery' && (
                                                            <Checkbox
                                                                checked={isAllGroupSelected ? true : isSomeGroupSelected ? 'indeterminate' : false}
                                                                onCheckedChange={(checked) => handleSelectGroup(items, !!checked)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        )}
                                                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                            <LayoutGrid size={16} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-md capitalize">{group}</h3>
                                                        </div>
                                                        <Badge variant="secondary" className="font-mono font-bold text-xs">{items.length}</Badge>
                                                    </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pt-4">
                                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                        {items.map((item: any) => {
                                                            const isDiscovery = activeView === 'discovery';
                                                            const fqn = isDiscovery ? config.registration.getFqn(item) : item.fully_qualified_name;

                                                            return (
                                                                <GenericEntityCard 
                                                                    key={fqn} 
                                                                    item={item} 
                                                                    config={config}
                                                                    connectionId={connectionId}
                                                                    selected={isDiscovery && selectedForRegistration.has(fqn)} 
                                                                    onSelect={() => isDiscovery && toggleSelection(fqn)}
                                                                    onClick={() => pushToStack(item)}
                                                                    isManaged={!isDiscovery}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        )})}
                                    </div>
                                </main>
                            )}
                        </div>

            <CreateAssetsDialog 
                connectionId={connectionId} connectorType={connectorType as any}
                open={isCreateOpen} onOpenChange={setIsCreateOpen}
            />

            <Sheet open={entityStack.length > 0} onOpenChange={(open) => !open && setEntityStack([])}>
                <SheetContent side="right" className="sm:max-w-3xl p-0 flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl">
                    {inspectingItem && (
                        <DomainEntityDetails
                            item={inspectingItem}
                            config={config}
                            connectionId={connectionId}
                            onClose={popFromStack}
                            navigationStack={entityStack}
                            onNavigate={(rel: any) => {
                                // Smart resolution for both Object (Schema list) and String (Graph node) inputs
                                const targetKind = typeof rel === 'string' ? rel : rel.targetKind;
                                const entityType = typeof rel === 'string' ? rel.split(':').pop()?.split('--').pop() : rel.entityType;

                                const found = assets.find(a => 
                                    a.name === targetKind || 
                                    (entityType && config.registration.getName(a).includes(entityType))
                                ) || registeredAssets.find(a => 
                                    a.name === targetKind ||
                                    (entityType && a.name.includes(entityType))
                                );

                                if (found) pushToStack(found);
                                else {
                                    toast.error("Entity not found", { 
                                        description: `Could not find '${entityType || targetKind}' in the current catalog.` 
                                    });
                                }
                            }}
                            isNested={entityStack.length > 1}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};