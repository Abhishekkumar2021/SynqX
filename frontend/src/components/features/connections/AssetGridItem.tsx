/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Table as TableIcon, Eye, MoreHorizontal, RefreshCw, FileJson, Terminal,
    FileText, Database, Code, FileCode, Workflow, Layers, 
    Calendar, HardDrive, Shield, Activity, Copy, Check, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import { motion } from 'framer-motion';

interface AssetGridItemProps {
    asset: Asset;
    connectionId: number;
}

const getAssetIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('table')) return <TableIcon className="h-5 w-5" />;
    if (t.includes('view')) return <Eye className="h-5 w-5" />;
    if (t.includes('collection')) return <Layers className="h-5 w-5" />;
    if (t.includes('file') || t.includes('csv') || t.includes('json')) return <FileText className="h-5 w-5" />;
    if (t.includes('query')) return <Code className="h-5 w-5" />;
    if (t.includes('script') || t.includes('python') || t.includes('javascript') || t.includes('ruby') || t.includes('perl')) return <FileCode className="h-5 w-5" />;
    if (t.includes('powershell')) return <Terminal className="h-5 w-5" />;
    if (t.includes('stream') || t.includes('kafka') || t.includes('rabbitmq')) return <Workflow className="h-5 w-5" />;
    return <Database className="h-5 w-5" />;
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

export const AssetGridItem: React.FC<AssetGridItemProps> = ({ 
    asset, 
    connectionId,
}) => {
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
            toast.success("Schema Updated");
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
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 flex flex-col gap-4"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-110">
                        {getAssetIcon(asset.asset_type || 'table')}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {asset.name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            {asset.asset_type}
                        </span>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-xl">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="gap-2 text-xs">
                            <Activity className="h-3.5 w-3.5 text-primary" /> Edit Config
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsSampleDialogOpen(true)} className="gap-2 text-xs">
                            <TableIcon className="h-3.5 w-3.5 text-emerald-500" /> View Data
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsSchemaDialogOpen(true)} className="gap-2 text-xs">
                            <Eye className="h-3.5 w-3.5 text-blue-500" /> View Schema
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => inferMutation.mutate()} className="gap-2 text-xs">
                            <RefreshCw className={cn("h-3.5 w-3.5", inferMutation.isPending && "animate-spin")} /> Refresh Schema
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={() => setIsDeleteAlertOpen(true)} 
                            className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                            <Terminal className="h-3.5 w-3.5" /> Delete Asset
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-muted/30 border border-border/20">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" /> Schema
                    </span>
                    <span className="text-[10px] font-bold text-foreground">
                        {asset.current_schema_version ? `Version ${asset.current_schema_version}` : 'v0.0.1'}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-muted/30 border border-border/20">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" /> Updated
                    </span>
                    <span className="text-[10px] font-bold text-foreground">
                        {asset.updated_at ? formatDistanceToNow(new Date(asset.updated_at), { addSuffix: true }) : '-'}
                    </span>
                </div>
            </div>

            {asset.fully_qualified_name && asset.fully_qualified_name !== asset.name && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/10 border border-border/10">
                    <HardDrive className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <span className="text-[9px] text-muted-foreground/60 font-mono truncate">
                        {asset.fully_qualified_name}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg border-border/40 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                    onClick={() => setIsSampleDialogOpen(true)}
                >
                    Explore
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg border-border/40 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                    onClick={() => setIsSchemaDialogOpen(true)}
                >
                    Schema
                </Button>
            </div>

            {/* --- Dialogs (Same as AssetTableRow) --- */}
            <EditAssetDialog 
                connectionId={connectionId} 
                asset={asset} 
                open={isEditOpen} 
                onOpenChange={setIsEditOpen} 
            />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the asset "{asset.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            Delete Asset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isSchemaDialogOpen} onOpenChange={setIsSchemaDialogOpen}>
                <DialogContent className="max-w-5xl h-[75vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-[1.5rem] border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl">
                    <div className="flex h-full">
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
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="flex-1 flex flex-col min-w-0 bg-card">
                            <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                                        <FileJson className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-semibold text-foreground">{asset.name}</DialogTitle>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleCopyJson} className="h-8 gap-2 mr-8">
                                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? "Copied" : "Copy JSON"}
                                </Button>
                            </DialogHeader>
                            <div className="flex-1 overflow-auto p-0 bg-[#09090b]">
                                {selectedSchema ? (
                                    <pre className="p-6 text-xs font-mono text-blue-300">
                                        {JSON.stringify(selectedSchema.json_schema, null, 2)}
                                    </pre>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">Select a version</div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSampleDialogOpen} onOpenChange={(open) => {
                setIsSampleDialogOpen(open);
                if (!open) setIsMaximized(false);
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
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Data Explorer: {asset.name}</DialogTitle>
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9 mr-8" onClick={() => setIsMaximized(!isMaximized)}>
                            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 relative">
                        <ResultsGrid data={formattedSampleData} isLoading={loadingSample} onSelectRows={setSelectedRows} selectedRows={selectedRows} />
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};