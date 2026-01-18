/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import {
    Table as TableIcon, Eye, RefreshCw, Terminal, Minimize2, Maximize2,
    Download, MoreHorizontal, Activity, Layers, Database, FileText, FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    discoverAssetSchema,
    deleteAsset,
    getAssetSampleData,
    type QueryResponse
} from '@/lib/api';
import { EditAssetDialog } from '../EditAssetDialog';
import { ResultsGrid } from '../../explorer/ResultsGrid';
import { AssetSchemaDialog } from '../AssetSchemaDialog';
import { type DomainConfig } from '@/lib/domain-definitions';

// Helper to choose icon based on asset type
const getAssetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('table') || t.includes('view')) return <TableIcon className="h-4 w-4" />;
    if (t.includes('osdu_kind') || t.includes('kind')) return <Layers className="h-4 w-4" />;
    if (t.includes('domain_entity') || t.includes('entity')) return <Database className="h-4 w-4" />;
    if (t.includes('collection')) return <Layers className="h-4 w-4" />;
    if (t.includes('file')) return <FileText className="h-4 w-4" />;
    if (t.includes('script') || t.includes('python') || t.includes('javascript')) return <FileCode className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
};


interface AssetCardActionsProps {
    item: any; // The original item (discovered or managed)
    config: DomainConfig; // The domain config
    connectionId: number;
    isManaged: boolean; // True if it's a managed asset (type Asset), false if discovered
}

export const AssetCardActions: React.FC<AssetCardActionsProps> = ({ item, config, connectionId, isManaged }) => {
    const [isSchemaDialogOpen, setIsSchemaDialogOpen] = useState(false);
    const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const queryClient = useQueryClient();

    // Determine asset ID and other relevant properties based on whether it's managed or discovered
    const assetId = isManaged ? item.id : undefined; // Discovered items don't have an ID until registered
    const assetName = isManaged ? item.name : config.registration.getName(item);
    const assetFqn = isManaged ? item.fully_qualified_name : config.registration.getFqn(item);
    const assetType = isManaged ? item.asset_type : config.registration.assetType;

    // Fetch Sample Data (only for managed assets or if discovered asset has sufficient info)
    const { data: sampleData, isLoading: loadingSample } = useQuery({
        queryKey: ['sample', assetId], // Use assetId for managed, or fqn for discovered (if appropriate)
        queryFn: () => getAssetSampleData(connectionId, assetId || assetFqn, 50), // Needs to handle both cases
        enabled: Boolean(isSampleDialogOpen && (assetId || assetFqn)), // Only enable if we have an ID/FQN
    });

    // Mutation: Refresh Schema (for managed assets)
    const inferMutation = useMutation({
        mutationFn: () => discoverAssetSchema(connectionId, assetId!), // Only for managed, so assetId is present
        onSuccess: () => {
            toast.success("Schema Updated", { description: "Latest structure has been captured." });
            queryClient.invalidateQueries({ queryKey: ['schema', assetId] });
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
        },
        onError: () => toast.error("Inference failed"),
    });

    // Mutation: Delete Asset (for managed assets)
    const deleteMutation = useMutation({
        mutationFn: () => deleteAsset(connectionId, assetId!), // Only for managed, so assetId is present
        onSuccess: () => {
            toast.success("Asset deleted");
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
        },
        onError: () => toast.error("Delete failed"),
    });

    const formattedSampleData: QueryResponse | null = useMemo(() => {
        if (!sampleData) return null;
        return {
            results: sampleData.rows || [],
            columns: sampleData.rows?.length > 0 ? Object.keys(sampleData.rows[0]) : [],
            count: sampleData.count || 0
        };
    }, [sampleData]);

    const canPerformManagedActions = isManaged; // Actions like Edit, Delete, Refresh Schema
    const canPerformSampleActions = isManaged || (assetFqn && assetType); // Can get sample if FQN exists

    return (
        <>
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/40 shadow-xl backdrop-blur-md p-1">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Entity Management</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/10" />
                        
                        {canPerformSampleActions && (
                            <>
                                <DropdownMenuItem onClick={() => setIsSampleDialogOpen(true)} className="rounded-lg gap-2 cursor-pointer py-2">
                                    <TableIcon className="h-3.5 w-3.5 text-primary" /> 
                                    <span className="text-xs font-medium">Explore Data</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsSchemaDialogOpen(true)} className="rounded-lg gap-2 cursor-pointer py-2">
                                    <Eye className="h-3.5 w-3.5 text-blue-500" />
                                    <span className="text-xs font-medium">View Schema</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                    try {
                                        const data = await getAssetSampleData(connectionId, assetId || assetFqn, 1000);
                                        if (data && data.rows && data.rows.length > 0) {
                                            const headers = Object.keys(data.rows[0]).join(',');
                                            const csv = data.rows.map((row: Record<string, unknown>) => 
                                                Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
                                            ).join('\n');
                                            const blob = new Blob([`${headers}\n${csv}`], { type: 'text/csv' });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${assetName}_sample.csv`;
                                            a.click();
                                            toast.success("Download started");
                                        } else {
                                            toast.error("No data found to download");
                                        }
                                    } catch {
                                        toast.error("Download failed");
                                    }
                                }} className="rounded-lg gap-2 cursor-pointer py-2">
                                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">Export CSV</span>
                                </DropdownMenuItem>
                            </>
                        )}

                        {canPerformManagedActions && (
                            <>
                                <DropdownMenuSeparator className="bg-border/10" />
                                <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="rounded-lg gap-2 cursor-pointer py-2">
                                    <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">Edit Config</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => inferMutation.mutate()} disabled={inferMutation.isPending} className="rounded-lg gap-2 cursor-pointer py-2">
                                    <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-500", inferMutation.isPending && "animate-spin")} />
                                    <span className="text-xs font-medium">Sync Metadata</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border/10" />
                                <DropdownMenuItem 
                                    className="rounded-lg gap-2 cursor-pointer py-2 text-destructive focus:text-destructive focus:bg-destructive/5"
                                    onClick={() => setIsDeleteAlertOpen(true)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Terminal className="h-3.5 w-3.5" />
                                    <span className="text-xs font-bold">Unregister Asset</span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the asset "{assetName}"? This will remove its metadata and history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* --- Schema Dialog --- */}
            {/* The AssetSchemaDialog expects an 'asset' object, so we need to pass the item (if managed)
                or construct a temporary asset object for discovered items */}
            <AssetSchemaDialog 
                asset={isManaged ? item : { id: assetFqn, name: assetName, asset_type: assetType, connection_id: connectionId }}
                connectionId={connectionId}
                open={isSchemaDialogOpen}
                onOpenChange={setIsSchemaDialogOpen}
            />

            {/* --- Sample Data Dialog --- */}
            <Dialog open={isSampleDialogOpen} onOpenChange={(open) => {
                setIsSampleDialogOpen(open);
                if (!open) {
                    setIsMaximized(false);
                    setSelectedRows(new Set());
                }
            }}>
                <DialogContent className={cn(
                    "flex flex-col p-0 gap-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur-3xl shadow-2xl transition-all duration-300",
                    isMaximized ? "max-w-[100vw] h-screen sm:rounded-none" : "max-w-7xl h-[85vh] sm:rounded-[2rem]"
                )} onClick={(e) => e.stopPropagation()}>
                    <DialogHeader className="px-8 py-6 border-b border-border/40 bg-muted/20 shrink-0">
                        <div className="flex flex-row items-center justify-between w-full space-y-0">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 ring-1 ring-emerald-500/20 shadow-sm">
                                    {getAssetIcon(assetType)}
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                        Data Explorer: {assetName}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        Exploration & Export Suite
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <Badge variant="outline" className="h-5 text-[9px] font-bold bg-background/50 border-emerald-500/20 text-emerald-600 uppercase tracking-widest px-2">
                                            {selectedRows.size > 0 ? `${selectedRows.size}SELECTED` : `${sampleData?.count || 0} TOTAL`}
                                        </Badge>
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pr-8">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl border-border/40 bg-background/50 shadow-sm transition-all hover:bg-muted"
                                    onClick={() => setIsMaximized(!isMaximized)}
                                >
                                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 relative">
                        <ResultsGrid 
                            data={formattedSampleData} 
                            isLoading={loadingSample}
                            onSelectRows={setSelectedRows}
                            selectedRows={selectedRows}
                            hideHeader={false}
                            title={isMaximized ? "Sample Data Preview" : undefined}
                            variant="embedded"
                            noBorder
                            noBackground
                        />
                    </div>
                </DialogContent>
            </Dialog>
            {canPerformManagedActions && (
                <EditAssetDialog 
                    connectionId={connectionId} 
                    asset={item} // item is guaranteed to be Asset type here
                    open={isEditOpen} 
                    onOpenChange={setIsEditOpen} 
                />
            )}
        </>
    );
};
