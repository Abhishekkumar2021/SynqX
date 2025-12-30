/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Download, Plus, Layers, Sparkles, Database, LayoutGrid, List, Folder, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CreateAssetsDialog } from '@/components/features/connections/CreateAssetsDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { bulkCreateAssets, type Asset } from '@/lib/api';
import { CONNECTOR_META } from '@/lib/connector-definitions';
import { AssetTableRow } from '@/components/features/connections/AssetTableRow';
import { AssetGridItem } from '@/components/features/connections/AssetGridItem';
import { AssetFileExplorer } from '@/components/features/connections/AssetFileExplorer';
import { DiscoveredAssetCard } from '@/components/features/connections/DiscoveredAssetCard';
import { Skeleton } from '@/components/ui/skeleton';

export const AssetsTabContent = ({
    connectionId,
    connectorType,
    assets,
    discoveredAssets,
    isLoading,
    onDiscover,
    setDiscoveredAssets
}: {
    connectionId: number,
    connectorType: any,
    assets: Asset[] | undefined,
    discoveredAssets: any[],
    isLoading: boolean,
    onDiscover: () => void,
    setDiscoveredAssets: (assets: any[]) => void
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedDiscovered, setSelectedDiscovered] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'explorer'>('list');
    
    const queryClient = useQueryClient();

    const isFileBased = useMemo(() => {
        const type = String(connectorType).toLowerCase();
        return CONNECTOR_META[type]?.category === 'File';
    }, [connectorType]);

    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets.filter(asset =>
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.fully_qualified_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.asset_type?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [assets, searchQuery]);

    const filteredDiscovered = useMemo(() => {
        return discoveredAssets.filter(asset =>
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.fully_qualified_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.type || asset.asset_type)?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [discoveredAssets, searchQuery]);

    const handleSelectDiscovered = (name: string, checked: boolean) => {
        setSelectedDiscovered(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(name);
            } else {
                newSet.delete(name);
            }
            return newSet;
        });
    };

    const handleSelectAllDiscovered = (checked: boolean) => {
        if (checked) {
            setSelectedDiscovered(new Set(filteredDiscovered.map(a => a.name)));
        } else {
            setSelectedDiscovered(new Set());
        }
    };

    const bulkImportMutation = useMutation({
        mutationFn: async ({ assetNames, asDestination }: { assetNames: string[], asDestination: boolean }) => {
            const assetsToCreate = assetNames.map(name => {
                const discovered = discoveredAssets.find(a => a.name === name);
                return {
                    name,
                    fully_qualified_name: discovered?.fully_qualified_name || name,
                    asset_type: discovered?.type || discovered?.asset_type || 'table',
                    is_source: !asDestination,
                    is_destination: asDestination,
                };
            });
            return bulkCreateAssets(connectionId, { assets: assetsToCreate });
        },
        onSuccess: (data) => {
            if (data.successful_creates > 0) {
                toast.success("Bulk Import Successful", {
                    description: `${data.successful_creates} of ${data.total_requested} assets were created.`,
                });
            }
            if (data.failed_creates > 0) {
                toast.warning("Some assets failed to import", {
                    description: `${data.failed_creates} assets could not be created.`,
                });
            }
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
            const successfulNames = new Set(
                [...selectedDiscovered].filter(
                    name => !data.failures.some((f: { name: string; reason: string }) => f.name === name)
                )
            );
            setDiscoveredAssets(discoveredAssets.filter(a => !successfulNames.has(a.name)));
            setSelectedDiscovered(new Set());
        },
        onError: (err: any) => {
            toast.error("Bulk Import Failed", {
                description: err.response?.data?.detail?.message || "An unexpected error occurred."
            });
        }
    });


    return (
        <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
            <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                <div className="space-y-0.5 relative z-10">
                    <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Layers className="h-3.5 w-3.5" />
                        </div>
                        Assets Registry
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-tight pl-1">
                        <span className="text-foreground">{assets?.length || 0}</span> MANAGED • <span className="text-amber-600 dark:text-amber-500">{discoveredAssets.length}</span> DISCOVERED
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-56 group">
                        <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                        <Input
                            placeholder="Filter assets..."
                            className="pl-8 h-8 rounded-lg bg-background/50 border-border/40 focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/5 transition-all shadow-none text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5 mr-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <List className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 rounded-md transition-all",
                                    viewMode === 'grid' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </Button>
                            {isFileBased && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-md transition-all",
                                        viewMode === 'explorer' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                                    )}
                                    onClick={() => setViewMode('explorer')}
                                    title="File Explorer View"
                                >
                                    <Folder className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                        <Button
                            onClick={onDiscover}
                            size="icon"
                            variant="outline"
                            className="rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all h-8 w-8 shrink-0 shadow-none"
                            disabled={isLoading}
                            title="Discover new assets"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isLoading && "animate-spin text-primary")} />
                        </Button>
                        <Button 
                            size="sm" 
                            className="rounded-lg shadow-sm h-8 px-3 gap-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95" 
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Asset</span>
                        </Button>
                    </div>
                </div>
            </div>

            <CreateAssetsDialog 
                connectionId={connectionId}
                connectorType={connectorType}
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                <AnimatePresence mode="popLayout">
                    {filteredDiscovered.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-b border-border/40 rounded-none relative z-20"
                        >
                            <div className="px-6 py-2.5 bg-muted/30 border-b border-border/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-500">
                                        <Sparkles className="h-3.5 w-3.5" />
                                    </div>
                                    <h3 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest">
                                        Discovered Potential Assets
                                    </h3>
                                </div>
                                {selectedDiscovered.size > 0 ? (
                                     <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-amber-600/80 uppercase tracking-tighter">
                                            {selectedDiscovered.size} selected
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    size="sm" 
                                                    className="h-7 px-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20 border-none gap-1.5 text-[10px] font-bold" 
                                                    disabled={bulkImportMutation.isPending}
                                                >
                                                    {bulkImportMutation.isPending ? (
                                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Download className="h-3 w-3" />
                                                    )}
                                                    Import
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl border-border/60 shadow-xl p-1">
                                                <DropdownMenuItem 
                                                    onClick={() => bulkImportMutation.mutate({ assetNames: Array.from(selectedDiscovered), asDestination: false })}
                                                    className="rounded-lg text-xs font-medium py-2 gap-2"
                                                >
                                                    <Database className="h-3.5 w-3.5 text-primary" />
                                                    Import as Source(s)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => bulkImportMutation.mutate({ assetNames: Array.from(selectedDiscovered), asDestination: true })}
                                                    className="rounded-lg text-xs font-medium py-2 gap-2"
                                                >
                                                    <Download className="h-3.5 w-3.5 text-emerald-500" />
                                                    Import as Destination(s)
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                     </div>
                                ) : (
                                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-500/10 text-[10px] font-bold">
                                        {filteredDiscovered.length} NEW ITEMS
                                    </Badge>
                                )}
                            </div>
                            {viewMode === 'explorer' && isFileBased ? (
                                <div className="h-[425px] border-b border-border/20">
                                    <AssetFileExplorer 
                                        assets={filteredDiscovered}
                                        selectedAssets={selectedDiscovered}
                                        onToggleAsset={handleSelectDiscovered}
                                        onToggleAll={handleSelectAllDiscovered}
                                    />
                                </div>
                            ) : viewMode === 'list' ? (
                                <Table wrapperClassName="rounded-none border-none shadow-none">
                                    <TableHeader className="bg-muted/30 border-b border-border/20">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="w-12 pl-6">
                                                <Checkbox
                                                    checked={selectedDiscovered.size > 0 && selectedDiscovered.size === filteredDiscovered.length}
                                                    onCheckedChange={(checked) => handleSelectAllDiscovered(Boolean(checked))}
                                                    className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                />
                                            </TableHead>
                                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Asset Name</TableHead>
                                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70 text-right pr-6">Type</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDiscovered.map((asset, idx) => (
                                            <TableRow 
                                                key={idx} 
                                                className={cn(
                                                    "hover:bg-amber-500/5 transition-colors border-b border-amber-500/10 group",
                                                    selectedDiscovered.has(asset.name) && "bg-amber-500/5"
                                                )}
                                            >
                                                <TableCell className="pl-6 py-2.5">
                                                    <Checkbox
                                                        checked={selectedDiscovered.has(asset.name)}
                                                        onCheckedChange={(checked) => handleSelectDiscovered(asset.name, Boolean(checked))}
                                                        className="border-amber-500/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground/80 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                                                            {asset.name}
                                                        </span>
                                                        {asset.fully_qualified_name && asset.fully_qualified_name !== asset.name && (
                                                            <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[300px]">
                                                                {asset.fully_qualified_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-2.5">
                                                    <Badge variant="outline" className="capitalize text-[9px] font-bold tracking-widest bg-muted/50 border-amber-500/20 text-muted-foreground">
                                                        {asset.type || asset.asset_type}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-amber-500/5">
                                    {filteredDiscovered.map((asset, idx) => (
                                        <DiscoveredAssetCard 
                                            key={idx} 
                                            asset={asset} 
                                            selected={selectedDiscovered.has(asset.name)}
                                            onSelect={(checked) => handleSelectDiscovered(asset.name, checked)}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Managed Assets Section */}
                <div className="relative z-10">
                    <div className="px-6 py-2.5 bg-muted/30 border-b border-border/40 font-bold text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Active Managed Assets
                    </div>
                    
                    {isLoading && !assets ? (
                        <div className="divide-y divide-border/20">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex justify-between items-center py-4 px-6">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : filteredAssets.length > 0 ? (
                        viewMode === 'explorer' && isFileBased ? (
                            <div className="h-[425px]">
                                <AssetFileExplorer 
                                    assets={filteredAssets}
                                    readOnly={true}
                                />
                            </div>
                        ) : viewMode === 'list' ? (
                            <Table wrapperClassName="rounded-none border-none shadow-none">
                                <TableHeader className="bg-muted/20 border-b border-border/20">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Asset</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Type</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Schema</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Sync Status</TableHead>
                                        <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-border/30">
                                    {filteredAssets.map((asset) => (
                                        <AssetTableRow key={asset.id} asset={asset} connectionId={connectionId} />
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                {filteredAssets.map((asset) => (
                                    <AssetGridItem key={asset.id} asset={asset} connectionId={connectionId} />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative mb-6"
                            >
                                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                                <div className="relative h-20 w-20 glass-card rounded-3xl border-border/40 flex items-center justify-center shadow-xl">
                                    {searchQuery ? (
                                        <Search className="h-10 w-10 text-muted-foreground/30" />
                                    ) : (
                                        <Database className="h-10 w-10 text-muted-foreground/30" />
                                    )}
                                </div>
                            </motion.div>
                            <h3 className="font-bold text-xl text-foreground">
                                {searchQuery ? "No matching assets found" : "No managed assets yet"}
                            </h3>
                            <p className="text-sm mt-2 max-w-sm leading-relaxed text-muted-foreground font-medium">
                                {searchQuery
                                    ? `We couldn't find any assets matching "${searchQuery}". Try a broader term.`
                                    : "You haven't added any assets to this connection yet. Discover assets or add them manually."}
                            </p>
                            {!searchQuery && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-8 rounded-xl border-dashed border-border/60 bg-background/50 hover:border-primary/50 hover:bg-primary/5 px-6 gap-2 font-bold transition-all shadow-sm" 
                                    onClick={onDiscover}
                                >
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Discover Assets Now
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};