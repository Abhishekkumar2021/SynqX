import React, { useState, useMemo } from 'react';
import {
    Table, Layers, FileText, FileCode, Activity,
    MoreHorizontal, Table as TableIcon, Eye, RefreshCw, FileJson, Terminal, Minimize2, Maximize2,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
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
import { cn, formatNumber } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    discoverAssetSchema,
    deleteAsset,
    getAssetSampleData,
    type Asset,
    type QueryResponse
} from '@/lib/api';
import { EditAssetDialog } from './EditAssetDialog';
import { ResultsGrid } from '../explorer/ResultsGrid';
import { AssetSchemaDialog } from './AssetSchemaDialog';

interface AssetTableRowProps {
    asset: Asset;
    connectionId: number;
}

// Helper to choose icon based on asset type
const getAssetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('table') || t.includes('view')) return <Table className="h-4 w-4" />;
    if (t.includes('collection')) return <Layers className="h-4 w-4" />;
    if (t.includes('file')) return <FileText className="h-4 w-4" />;
    if (t.includes('script') || t.includes('python') || t.includes('javascript')) return <FileCode className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
};

export const AssetTableRow: React.FC<AssetTableRowProps> = ({ asset, connectionId }) => {
    const [isSchemaDialogOpen, setIsSchemaDialogOpen] = useState(false);
    const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const queryClient = useQueryClient();

    // Fetch Sample Data
    const { data: sampleData, isLoading: loadingSample } = useQuery({
        queryKey: ['sample', asset.id],
        queryFn: () => getAssetSampleData(connectionId, asset.id, 50),
        enabled: isSampleDialogOpen,
    });

    // Mutation: Refresh Schema
    const inferMutation = useMutation({
        mutationFn: () => discoverAssetSchema(connectionId, asset.id),
        onSuccess: () => {
            toast.success("Schema Updated", { description: "Latest structure has been captured." });
            queryClient.invalidateQueries({ queryKey: ['schema', asset.id] });
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
        },
        onError: () => toast.error("Inference failed")
    });

    // Mutation: Delete Asset
    const deleteMutation = useMutation({
        mutationFn: () => deleteAsset(connectionId, asset.id),
        onSuccess: () => {
            toast.success("Asset deleted");
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
        },
        onError: () => toast.error("Delete failed")
    });

    const formattedSampleData: QueryResponse | null = useMemo(() => {
        if (!sampleData) return null;
        return {
            results: sampleData.rows || [],
            columns: sampleData.rows?.length > 0 ? Object.keys(sampleData.rows[0]) : [],
            count: sampleData.count || 0
        };
    }, [sampleData]);

    return (
        <TableRow className="group transition-colors border-b border-border/40 hover:bg-muted/30">
            <TableCell className="pl-6 py-2.5 font-medium">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-muted/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm ring-1 ring-border/20">
                        {getAssetIcon(asset.asset_type || 'table')}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-foreground font-semibold">{asset.name}</span>
                        {asset.fully_qualified_name && asset.fully_qualified_name !== asset.name && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-50">
                                {asset.fully_qualified_name}
                            </span>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="px-6 py-2.5 capitalize text-muted-foreground text-xs font-medium">{asset.asset_type}</TableCell>
            <TableCell className="px-6 py-2.5">
                {asset.current_schema_version ? (
                    <Badge variant="secondary" className="font-mono text-[10px] bg-muted text-muted-foreground border-border/50">
                        v{asset.current_schema_version}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground/50  flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Pending
                    </span>
                )}
            </TableCell>
            <TableCell className="px-6 py-2.5 text-foreground font-bold text-xs tabular-nums">
                {asset.row_count_estimate ? formatNumber(asset.row_count_estimate) : '—'}
            </TableCell>
            <TableCell className="px-6 py-2.5 text-muted-foreground text-xs tabular-nums">
                {asset.size_bytes_estimate ? (asset.size_bytes_estimate / 1024).toFixed(1) + ' KB' : '—'}
            </TableCell>
            <TableCell className="px-6 py-2.5 text-muted-foreground text-[10px] font-mono uppercase tracking-tighter">
                {asset.updated_at ? formatDistanceToNow(new Date(asset.updated_at), { addSuffix: true }) : '-'}
            </TableCell>
            <TableCell className="text-right pr-6 py-2.5">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-background hover:text-primary hover:border hover:border-border"
                        onClick={() => setIsSampleDialogOpen(true)}
                        title="View Sample Data"
                    >
                        <TableIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-background hover:text-primary hover:border hover:border-border"
                        onClick={() => setIsSchemaDialogOpen(true)}
                        title="View Schema"
                    >
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background hover:border hover:border-border">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-xl backdrop-blur-md">
                            <DropdownMenuLabel>Asset Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                                <MoreHorizontal className="mr-2 h-3.5 w-3.5" /> Edit Configuration
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsSampleDialogOpen(true)}>
                                <TableIcon className="mr-2 h-3.5 w-3.5" /> View Sample Data
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                                try {
                                    const data = await getAssetSampleData(connectionId, asset.id, 1000);
                                    if (data && data.rows && data.rows.length > 0) {
                                        const headers = Object.keys(data.rows[0]).join(',');
                                        const csv = data.rows.map((row: Record<string, unknown>) => 
                                            Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
                                        ).join('\n');
                                        const blob = new Blob([`${headers}\n${csv}`], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${asset.name}_sample.csv`;
                                        a.click();
                                        toast.success("Download started");
                                    } else {
                                        toast.error("No data found to download");
                                    }
                                } catch {
                                    toast.error("Download failed");
                                }
                            }}>
                                <Download className="mr-2 h-3.5 w-3.5" /> Download Sample
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => inferMutation.mutate()} disabled={inferMutation.isPending}>
                                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", inferMutation.isPending && "animate-spin")} />
                                Refresh Schema
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsSchemaDialogOpen(true)}>
                                <FileJson className="mr-2 h-3.5 w-3.5" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                onClick={() => setIsDeleteAlertOpen(true)}
                                disabled={deleteMutation.isPending}
                            >
                                <Terminal className="mr-2 h-3.5 w-3.5" /> Delete Asset
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete the asset "{asset.name}"? This will remove its metadata and history.
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
                </div>

                <AssetSchemaDialog 
                    asset={asset}
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
                    )}>
                        <DialogHeader className="px-8 py-6 border-b border-border/40 bg-muted/20 shrink-0 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 ring-1 ring-emerald-500/20 shadow-sm">
                                    <TableIcon className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                        Data Explorer: {asset.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        Exploration & Export Suite
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <Badge variant="outline" className="h-5 text-[9px] font-bold bg-background/50 border-emerald-500/20 text-emerald-600 uppercase tracking-widest px-2">
                                            {selectedRows.size > 0 ? `${selectedRows.size} SELECTED` : `${sampleData?.count || 0} TOTAL`}
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
                        </DialogHeader>

                        <div className="flex-1 min-h-0 relative">
                            <ResultsGrid 
                                data={formattedSampleData} 
                                isLoading={loadingSample}
                                onSelectRows={setSelectedRows}
                                selectedRows={selectedRows}
                                hideHeader={false}
                                title={isMaximized ? "Sample Data Preview" : undefined}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
                <EditAssetDialog 
                    connectionId={connectionId} 
                    asset={asset} 
                    open={isEditOpen} 
                    onOpenChange={setIsEditOpen} 
                />
            </TableCell>
        </TableRow>
    );
};