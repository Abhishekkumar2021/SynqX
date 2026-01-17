/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    Search, ChevronRight, 
    Table, RefreshCw, HelpCircle, CheckSquare, Square, Save, Loader2} from 'lucide-react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCreateAssets } from '@/lib/api/connections';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Shared Components
import { ExplorerContentHeader } from '../../../explorer/components/ExplorerContentHeader';
import { DiscoverySkeleton } from '../../../explorer/components/DiscoverySkeleton';
import { ProSourceEntityDetails } from './components/ProSourceEntityDetails';
import { ViewToggle, type ViewMode } from '@/components/common/ViewToggle';

// --- Types ---

interface ProSourceEntity {
    name: string;
    type: string;
    schema: string;
    metadata?: {
        module: string;
        table: string;
        icon: string;
        is_seabed_standard: boolean;
    };
}

interface ProSourceBrowserProps {
    connectionId: number;
    connectionName: string;
    assets: ProSourceEntity[];
    isLoading: boolean;
    onDiscover: () => void;
    mode?: 'management' | 'exploration';
}

// --- Sub-components ---

const ModuleSidebar: React.FC<{
    activeModule: string;
    setActiveModule: (mod: string) => void;
    modules: string[];
    assets: ProSourceEntity[];
    filteredAssets: ProSourceEntity[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}> = ({ activeModule, setActiveModule, modules, assets, filteredAssets, searchQuery, setSearchQuery }) => (
    <aside className="w-72 flex flex-col border-r border-border/40 bg-muted/5 shrink-0">
        <div className="p-6 border-b border-border/20 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600/60 dark:text-indigo-400/60">
                Subsurface Modules
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent">
                                <HelpCircle className="h-3.5 w-3.5 cursor-help" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px] uppercase font-bold tracking-tight">PPDM/Seabed logical modules.</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="relative group">
                <Search className="z-20 absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                <Input 
                    placeholder="Search Seabed..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 rounded-xl bg-background border-border/40 text-xs shadow-none pl-9"
                />
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
                {modules.map(mod => (
                    <button
                        key={mod} onClick={() => setActiveModule(mod)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all",
                            activeModule === mod ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("h-1.5 w-1.5 rounded-full transition-all", activeModule === mod ? "bg-white scale-125" : "bg-border/60")} />
                            <span className="truncate font-bold">{mod}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] font-mono border-none h-5 px-1.5", activeModule === mod ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                            {assets.filter(a => a.metadata?.module === mod || mod === 'All').length}
                        </Badge>
                    </button>
                ))}
            </div>
        </ScrollArea>
    </aside>
);

const EntityCard: React.FC<{
    asset: ProSourceEntity;
    onSelect: () => void;
    onToggleRegistration: () => void;
    isRegistered: boolean;
    viewMode: ViewMode;
    mode: 'management' | 'exploration';
}> = ({ asset, onSelect, onToggleRegistration, isRegistered, viewMode, mode }) => {
    if (viewMode === 'grid') {
        return (
            <div className="relative group">
                <button
                    onClick={onSelect}
                    className={cn(
                        "w-full flex flex-col items-start p-6 rounded-[2.5rem] border border-border/40 bg-card/40 hover:bg-indigo-500/5 hover:border-indigo-500/40 hover:shadow-2xl transition-all text-left relative overflow-hidden",
                        (mode === 'management' && isRegistered) && "border-indigo-500/60 bg-indigo-500/5 shadow-inner"
                    )}
                >
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-all bg-background border border-border/40 shadow-sm text-muted-foreground group-hover:text-indigo-600">
                        <Table className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1 group-hover:text-indigo-600 transition-colors">{asset.name}</h4>
                    <p className="text-[10px] font-mono text-muted-foreground font-medium mb-6 opacity-70 uppercase tracking-tighter">{asset.metadata?.table}</p>
                    <div className="mt-auto pt-4 border-t border-border/20 w-full flex items-center justify-between">
                        <Badge variant="secondary" className="text-[9px] bg-muted/50 text-muted-foreground font-bold border-none uppercase">{asset.metadata?.module}</Badge>
                        <div className="h-7 w-7 rounded-xl bg-indigo-500/0 group-hover:bg-indigo-500/10 flex items-center justify-center transition-all">
                            <ChevronRight className="h-4 w-4 text-indigo-600" />
                        </div>
                    </div>
                </button>
                {mode === 'management' && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleRegistration(); }}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all"
                    >
                        {isRegistered ? (
                            <CheckSquare className="h-5 w-5 text-indigo-600 fill-indigo-600/10" />
                        ) : (
                            <Square className="h-5 w-5 text-muted-foreground/30 hover:text-indigo-600 opacity-0 group-hover:opacity-100" />
                        )}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="relative group">
            <button
                onClick={onSelect}
                className={cn(
                    "w-full group flex items-center gap-6 p-4 rounded-2xl border border-border/40 bg-card/40 hover:bg-indigo-500/5 hover:border-indigo-500/40 transition-all text-left",
                    (mode === 'management' && isRegistered) && "border-indigo-500/60 bg-indigo-500/5 shadow-inner"
                )}
            >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center border border-border/40 bg-background shadow-sm text-muted-foreground group-hover:text-indigo-600 transition-all">
                    <Table className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-600 transition-colors truncate">{asset.name}</h4>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-60">{asset.metadata?.table}</p>
                </div>
                <Badge variant="outline" className="h-6 text-[9px] font-bold text-muted-foreground/70 border-border/40 uppercase">
                    {asset.metadata?.module}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-600 transition-colors" />
            </button>
            {mode === 'management' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleRegistration(); }}
                    className="absolute top-1/2 -translate-y-1/2 -left-12 p-2 rounded-full transition-all"
                >
                    {isRegistered ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600 fill-indigo-600/10" />
                    ) : (
                        <Square className="h-5 w-5 text-muted-foreground/30 hover:text-indigo-600" />
                    )}
                </button>
            )}
        </div>
    );
};

// --- Main Component ---

export const ProSourceBrowser: React.FC<ProSourceBrowserProps> = ({ 
    connectionId,
    connectionName,
    assets, 
    isLoading, 
    onDiscover,
    mode = 'management'
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<ProSourceEntity | null>(null);
    const [activeModule, setActiveModule] = useState<string>('All');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedForRegistration, setSelectedForRegistration] = useState<Set<string>>(new Set());

    const queryClient = useQueryClient();

    const registerMutation = useMutation({
        mutationFn: (entities: ProSourceEntity[]) => bulkCreateAssets(connectionId, {
            assets: entities.map(e => ({
                name: e.name,
                asset_type: 'table',
                fully_qualified_name: `${e.schema}.${e.metadata?.table}`,
                is_source: true,
                is_destination: false,
                schema_metadata: {
                    module: e.metadata?.module,
                    table: e.metadata?.table,
                    is_seabed_standard: e.metadata?.is_seabed_standard
                }
            }))
        }),
        onSuccess: (data) => {
            toast.success("Assets Registered", { description: `Successfully registered ${data.successful_creates} Seabed assets.` });
            setSelectedForRegistration(new Set());
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
        },
        onError: (err: any) => toast.error("Registration Failed", { description: err.message })
    });

    const modules = useMemo(() => {
        const uniqueModules = new Set<string>(['All']);
        assets.forEach(a => {
            if (a.metadata?.module) uniqueModules.add(a.metadata.module);
        });
        return Array.from(uniqueModules).sort();
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 a.metadata?.table.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesModule = activeModule === 'All' || a.metadata?.module === activeModule;
            return matchesSearch && matchesModule;
        });
    }, [assets, searchQuery, activeModule]);

    const toggleSelection = (name: string) => {
        const next = new Set(selectedForRegistration);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelectedForRegistration(next);
    };

    const handleBulkRegister = () => {
        const selected = assets.filter(a => selectedForRegistration.has(a.name));
        registerMutation.mutate(selected);
    };

    if (isLoading && assets.length === 0) {
        return <DiscoverySkeleton />;
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Unified Context Header */}
            <ExplorerContentHeader 
                name={connectionName} 
                type={mode === 'exploration' ? "PROSOURCE EXPLORER" : "SLB PROSOURCE (SEABED)"}
                actions={
                    <div className="flex items-center gap-3">
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
                                        className="rounded-xl h-8 px-4 gap-2 text-[10px] font-bold shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {registerMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        <span>REGISTER {selectedForRegistration.size} ENTITIES</span>
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onDiscover} 
                            disabled={isLoading}
                            className="rounded-xl h-8 px-4 gap-2 text-[10px] font-bold border-border/40 bg-background/50 transition-all hover:bg-indigo-500/5"
                        >
                            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} /> 
                            <span>{isLoading ? 'DISCOVERING...' : 'DISCOVERY'}</span>
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 flex overflow-hidden">
                <ModuleSidebar
                    activeModule={activeModule}
                    setActiveModule={setActiveModule}
                    modules={modules}
                    assets={assets}
                    filteredAssets={filteredAssets}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-background/20 relative">
                    {selectedEntity ? (
                        <ProSourceEntityDetails 
                            entity={selectedEntity} 
                            connectionId={connectionId}
                            onBack={() => setSelectedEntity(null)} 
                            initialTab={mode === 'exploration' ? 'data' : 'overview'}
                        />
                    ) : (
                        <ScrollArea className="flex-1">
                            <div className="p-8 pb-20">
                                <div className={cn(
                                    viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-2 max-w-5xl mx-auto"
                                )}>
                                    {filteredAssets.map(asset => (
                                        <EntityCard
                                            key={asset.name}
                                            asset={asset}
                                            viewMode={viewMode}
                                            onSelect={() => setSelectedEntity(asset)}
                                            onToggleRegistration={() => toggleSelection(asset.name)}
                                            isRegistered={selectedForRegistration.has(asset.name)}
                                            mode={mode}
                                        />
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </main>
            </div>
        </div>
    );
};
