/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Table as TableIcon, Eye, MoreHorizontal, RefreshCw, FileJson, Terminal,
    FileText, Database, Copy, Check, Maximize2, Minimize2, Search, ArrowUpDown, 
    ChevronDown, Filter, X, Download, Code, FileCode, Workflow, Layers
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getAssetSchemaVersions,
    discoverAssetSchema,
    deleteAsset,
    getAssetSampleData,
    type Asset,
    type QueryResponse
} from '@/lib/api';
import { EditAssetDialog } from './EditAssetDialog';
import { ResultsGrid } from '../explorer/ResultsGrid';

interface AssetTableRowProps {
    asset: Asset;
    connectionId: number;
}

// Helper to choose icon based on asset type
const getAssetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('table')) return <TableIcon className="h-4 w-4" />;
    if (t.includes('view')) return <Eye className="h-4 w-4" />;
    if (t.includes('collection')) return <Layers className="h-4 w-4" />;
    if (t.includes('file') || t.includes('csv') || t.includes('json')) return <FileText className="h-4 w-4" />;
    if (t.includes('query')) return <Code className="h-4 w-4" />;
    if (t.includes('script') || t.includes('python') || t.includes('javascript') || t.includes('ruby') || t.includes('perl')) return <FileCode className="h-4 w-4" />;
    if (t.includes('powershell')) return <Terminal className="h-4 w-4" />;
    if (t.includes('stream') || t.includes('kafka') || t.includes('rabbitmq')) return <Workflow className="h-4 w-4" />;
    return <Database className="h-4 w-4" />;
};

export const AssetTableRow: React.FC<AssetTableRowProps> = ({ asset, connectionId }) => {
    const [isSchemaDialogOpen, setIsSchemaDialogOpen] = useState(false);
    const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const queryClient = useQueryClient();

    // Fetch Schema Versions
    const { data: schemaVersions, isLoading: loadingSchema } = useQuery({
        queryKey: ['schema', asset.id],
        queryFn: () => getAssetSchemaVersions(connectionId, asset.id),
        enabled: isSchemaDialogOpen,
    });

    // Fetch Sample Data
    const { data: sampleData, isLoading: loadingSample } = useQuery({
        queryKey: ['sample', asset.id],
        queryFn: () => getAssetSampleData(connectionId, asset.id, 50),
        enabled: isSampleDialogOpen,
    });

    // Default to latest version when loaded
    useEffect(() => {
        if (schemaVersions && schemaVersions.length > 0 && !selectedVersionId) {
            setSelectedVersionId(schemaVersions[0].id);
        }
    }, [schemaVersions, selectedVersionId]);

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

    const selectedSchema = schemaVersions?.find(v => v.id === selectedVersionId);

    const handleCopyJson = () => {
        if (selectedSchema?.json_schema) {
            navigator.clipboard.writeText(JSON.stringify(selectedSchema.json_schema, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Schema copied to clipboard");
        }
    };

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
                            <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[200px]">
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
                    <span className="text-xs text-muted-foreground/50 italic flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Pending
                    </span>
                )}
            </TableCell>
            <TableCell className="px-6 py-2.5 text-muted-foreground text-xs font-mono">
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

                {/* --- Schema Viewer Dialog --- */}
                <Dialog open={isSchemaDialogOpen} onOpenChange={setIsSchemaDialogOpen}>
                    <DialogContent className="max-w-5xl h-[75vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-[1.5rem] border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl">
                        <div className="flex h-full">

                            {/* Sidebar: History List */}
                            <div className="w-72 bg-muted/20 border-r border-border/50 flex flex-col shrink-0">
                                <div className="p-4 border-b border-border/50 bg-muted/30">
                                    <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <HistoryIcon className="h-3.5 w-3.5" /> Version History
                                    </h4>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="flex flex-col p-3 gap-2">
                                        {loadingSchema ? (
                                            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
                                        ) : schemaVersions?.map((v) => (
                                            <button
                                                key={v.id}
                                                onClick={() => setSelectedVersionId(v.id)}
                                                className={cn(
                                                    "text-left px-4 py-3 rounded-xl text-xs transition-all flex flex-col gap-1 border",
                                                    selectedVersionId === v.id
                                                        ? "bg-background border-primary/20 text-foreground shadow-sm ring-1 ring-primary/10"
                                                        : "border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className={cn("font-bold text-sm", selectedVersionId === v.id ? "text-primary" : "")}>v{v.version}</span>
                                                    <span className="text-[10px] opacity-70 font-mono">{format(new Date(v.discovered_at), 'MMM dd')}</span>
                                                </div>
                                                <span className="truncate opacity-70 text-[10px] flex items-center gap-1">
                                                    <RefreshCw className="h-2.5 w-2.5" /> Auto-detected change
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Main: JSON Viewer */}
                            <div className="flex-1 flex flex-col min-w-0 bg-card">
                                <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                                            <FileJson className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-base font-semibold text-foreground">
                                                {asset.name}
                                            </DialogTitle>
                                            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                Schema Definition
                                                {selectedSchema && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span>Discovered {formatDistanceToNow(new Date(selectedSchema.discovered_at))} ago</span>
                                                    </>
                                                )}
                                            </DialogDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mr-8">
                                        {selectedSchema && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopyJson}
                                                className="h-8 gap-2 text-xs border-border/50 bg-background/50 backdrop-blur-sm"
                                            >
                                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copied ? "Copied" : "Copy JSON"}
                                            </Button>
                                        )}
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 overflow-auto p-0 relative group bg-[#09090b]">
                                    {selectedSchema ? (
                                        <pre className="p-6 text-xs font-mono text-blue-300 leading-relaxed overflow-x-auto">
                                            {JSON.stringify(selectedSchema.json_schema, null, 2)}
                                        </pre>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                                            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Terminal className="h-8 w-8 opacity-20" />
                                            </div>
                                            <span>Select a version to view schema</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

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

// Helper Icon for History Sidebar
const HistoryIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);