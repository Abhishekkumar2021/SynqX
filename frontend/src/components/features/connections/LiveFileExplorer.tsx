/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    Folder, File, Home, 
    FileJson, FileText, Database, 
    Search, ArrowLeft, 
    FileSpreadsheet, FileCode, Info,
    Download, Upload, Trash2, FolderPlus,
    RefreshCw, MoreVertical, HardDrive,
    FileUp, LayoutGrid, List,
    SortAsc, SortDesc, Filter,
    Layers, Calendar, Hash,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
    listRemoteFiles, 
    downloadRemoteFile, 
    downloadRemoteDirectory,
    uploadRemoteFile, 
    deleteRemoteFile, 
    createRemoteDirectory 
} from '@/lib/api';
import { toast } from 'sonner';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from '@/components/ui/label';
import { format, formatDistanceToNow } from 'date-fns';
import { FilePreview } from './FilePreview';

interface LiveFileExplorerProps {
    connectionId: number;
}

type SortField = 'name' | 'size' | 'modified_at';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'type' | 'extension';

export const LiveFileExplorer: React.FC<LiveFileExplorerProps> = ({ connectionId }) => {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isMkdirOpen, setIsMkdirOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [previewFile, setPreviewFile] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    
    // Delete Confirmation State
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    // Advanced UI State
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [groupBy, setGroupBy] = useState<GroupBy>('type');
    const [filterType] = useState<'all' | 'directory' | 'file'>('all');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = useCallback(async (path: string) => {
        setIsLoading(true);
        try {
            const data = await listRemoteFiles(connectionId, path);
            setFiles(data.files || []);
        } catch (error: any) {
            toast.error("Failed to list files", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [connectionId]);

    useEffect(() => {
        fetchFiles(currentPath);
    }, [currentPath, fetchFiles]);

    const handleNavigateUp = () => {
        if (!currentPath || currentPath === "/" || currentPath === ".") return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length === 0 ? "" : parts.join('/'));
    };

    const breadcrumbs = useMemo(() => {
        const parts = currentPath.split('/').filter(Boolean);
        return parts.map((part, index) => ({
            name: part,
            path: parts.slice(0, index + 1).join('/')
        }));
    }, [currentPath]);

    const getIcon = (item: any) => {
        if (item.type === 'directory') return <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />;
        const ext = item.name.split('.').pop()?.toLowerCase();
        if (['json', 'jsonl'].includes(ext || '')) return <FileJson className="h-4 w-4 text-amber-500" />;
        if (['csv', 'tsv', 'txt'].includes(ext || '')) return <FileText className="h-4 w-4 text-emerald-500" />;
        if (['parquet', 'avro'].includes(ext || '')) return <Database className="h-4 w-4 text-purple-500" />;
        if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
        if (['xml'].includes(ext || '')) return <FileCode className="h-4 w-4 text-orange-500" />;
        return <File className="h-4 w-4 text-slate-400" />;
    };

    const handleDownload = async (item: any) => {
        try {
            toast.promise(downloadRemoteFile(connectionId, item.path), {
                loading: 'Preparing download...',
                success: 'Download started',
                error: 'Download failed'
            });
        } catch (error: any) {
            toast.error("Download failed", { description: error.message });
        }
    };

    const handleDownloadDirectory = async (item: any) => {
        try {
            toast.promise(downloadRemoteDirectory(connectionId, item.path), {
                loading: 'Compressing remote directory...',
                success: 'ZIP download started',
                error: 'Compression failed'
            });
        } catch (error: any) {
            toast.error("Download failed", { description: error.message });
        }
    };

    const handleOpenFile = (item: any) => {
        if (item.type === 'directory') {
            setCurrentPath(item.path);
        } else {
            setPreviewFile(item);
        }
    };

    const handleDelete = (item: any) => {
        setItemToDelete(item);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        
        const loadingToast = toast.loading(`Purging ${itemToDelete.name}...`);
        try {
            await deleteRemoteFile(connectionId, itemToDelete.path);
            toast.success("Resource successfully purged", { id: loadingToast });
            fetchFiles(currentPath);
        } catch (error: any) {
            toast.error("Purge failed", { id: loadingToast, description: error.message });
        } finally {
            setItemToDelete(null);
            setIsDeleteAlertOpen(false);
        }
    };

    const handleUploadFiles = async (uploadedFiles: FileList | null) => {
        if (!uploadedFiles?.length) return;
        const file = uploadedFiles[0];
        setIsUploading(true);
        const toastId = toast.loading(`Uploading ${file.name}...`);
        try {
            await uploadRemoteFile(connectionId, currentPath, file);
            toast.success("Upload complete", { id: toastId });
            fetchFiles(currentPath);
        } catch (error: any) {
            toast.error("Upload failed", { id: toastId, description: error.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleMkdir = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName) return;
        try {
            const separator = currentPath.endsWith('/') || !currentPath ? '' : '/';
            await createRemoteDirectory(connectionId, `${currentPath}${separator}${newFolderName}`);
            toast.success("Directory created");
            setNewFolderName("");
            setIsMkdirOpen(false);
            fetchFiles(currentPath);
        } catch (error: any) {
            toast.error("Failed to create directory", { description: error.message });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleUploadFiles(e.dataTransfer.files);
    };

    const filteredItems = useMemo(() => {
        let result = [...files];
        
        // 1. Filter by search query
        if (searchQuery) {
            result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // 2. Filter by type
        if (filterType !== 'all') {
            result = result.filter(f => f.type === filterType);
        }

        // 3. Sort
        result.sort((a, b) => {
            // Grouping logic (always prioritize directories if group by type)
            if (groupBy === 'type') {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
            } else if (groupBy === 'extension') {
                const extA = a.name.split('.').pop() || '';
                const extB = b.name.split('.').pop() || '';
                if (extA !== extB) {
                    return extA.localeCompare(extB);
                }
            }

            // Primary sort field
            let comparison = 0;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortField === 'size') {
                comparison = (a.size || 0) - (b.size || 0);
            } else if (sortField === 'modified_at') {
                comparison = (a.modified_at || 0) - (b.modified_at || 0);
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [files, searchQuery, sortField, sortOrder, groupBy, filterType]);

    return (
        <TooltipProvider>
            <div 
                className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative group/explorer"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* --- Drag Overlay --- */}
                <AnimatePresence>
                    {isDragging && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-100 bg-primary/10 backdrop-blur-md border-2 border-dashed border-primary flex flex-col items-center justify-center gap-4 pointer-events-none"
                        >
                            <div className="p-6 rounded-full bg-primary/20 text-primary animate-bounce">
                                <FileUp className="h-12 w-12" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-primary">Drop to Upload</h3>
                                <p className="text-xs font-bold text-primary/60">Release files to start remote transfer</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- Explorer Toolbar --- */}
                <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setCurrentPath("")}
                            className={cn("h-8 w-8 rounded-lg", !currentPath && "bg-background shadow-sm text-primary")}
                        >
                            <Home className="h-4 w-4" />
                        </Button>
                        <div className="h-4 w-px bg-border/60 mx-1" />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg"
                            onClick={handleNavigateUp}
                            disabled={!currentPath || isLoading}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg"
                            onClick={() => fetchFiles(currentPath)}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>

                    {/* --- Breadcrumbs --- */}
                    <div className="flex-1 px-4 overflow-hidden">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink 
                                        className="cursor-pointer font-bold text-xs uppercase tracking-tight"
                                        onClick={() => setCurrentPath("")}
                                    >
                                        Root
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {breadcrumbs.map((bc, idx) => (
                                    <React.Fragment key={bc.path}>
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem>
                                            {idx === breadcrumbs.length - 1 ? (
                                                <BreadcrumbPage className="font-bold text-xs uppercase tracking-tight text-primary">
                                                    {bc.name}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink 
                                                    className="cursor-pointer font-bold text-xs uppercase tracking-tight"
                                                    onClick={() => setCurrentPath(bc.path)}
                                                >
                                                    {bc.name}
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                    </React.Fragment>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    {/* --- Search & Action --- */}
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search className="z-20 absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Search folder..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-8 w-full sm:w-40 bg-background/50 border-border/40 focus:ring-primary/20 text-xs font-medium rounded-lg shadow-none"
                            />
                        </div>
                        
                        <div className="h-4 w-px bg-border/60 mx-1" />

                        {/* Advanced Filters & Sorting */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 px-3 gap-2 rounded-lg border-border/40 bg-background/50 text-xs font-bold">
                                    <Filter className="h-3.5 w-3.5" />
                                    View
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/60 shadow-xl p-1">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 opacity-50">Sort By</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSortField('name')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <FileText className={cn("h-4 w-4", sortField === 'name' ? "text-primary" : "opacity-40")} />
                                    Name
                                    {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-auto opacity-40" /> : <SortDesc className="h-3 w-3 ml-auto opacity-40" />)}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortField('size')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <Hash className={cn("h-4 w-4", sortField === 'size' ? "text-primary" : "opacity-40")} />
                                    Size
                                    {sortField === 'size' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-auto opacity-40" /> : <SortDesc className="h-3 w-3 ml-auto opacity-40" />)}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortField('modified_at')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <Calendar className={cn("h-4 w-4", sortField === 'modified_at' ? "text-primary" : "opacity-40")} />
                                    Date Modified
                                    {sortField === 'modified_at' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-auto opacity-40" /> : <SortDesc className="h-3 w-3 ml-auto opacity-40" />)}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator className="bg-border/40 my-1" />
                                
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 opacity-50">Order</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSortOrder('asc')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <SortAsc className={cn("h-4 w-4", sortOrder === 'asc' ? "text-primary" : "opacity-40")} />
                                    Ascending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOrder('desc')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <SortDesc className={cn("h-4 w-4", sortOrder === 'desc' ? "text-primary" : "opacity-40")} />
                                    Descending
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-border/40 my-1" />

                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 opacity-50">Group By</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setGroupBy('type')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <Layers className={cn("h-4 w-4", groupBy === 'type' ? "text-primary" : "opacity-40")} />
                                    File Type
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setGroupBy('none')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <X className={cn("h-4 w-4", groupBy === 'none' ? "text-primary" : "opacity-40")} />
                                    None
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="h-4 w-px bg-border/60 mx-1" />

                        <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 rounded-md transition-all", viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 rounded-md transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="h-4 w-px bg-border/60 mx-1" />
                        
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            onChange={(e) => handleUploadFiles(e.target.files)}
                            disabled={isUploading || isLoading}
                        />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-3 gap-2 rounded-lg border-border/40 bg-background/50 text-xs font-bold"
                            disabled={isUploading || isLoading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Upload
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-lg border-border/40 bg-background/50"
                            onClick={() => setIsMkdirOpen(true)}
                            disabled={isLoading}
                            title="New Folder"
                        >
                            <FolderPlus className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                    {isLoading && files.length === 0 ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex items-center gap-4 py-2">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/4 opacity-50" />
                                    </div>
                                    <Skeleton className="h-8 w-20 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative mb-6"
                            >
                                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                                <div className="relative h-24 w-24 glass-card rounded-[2rem] border-border/40 flex items-center justify-center shadow-xl">
                                    <HardDrive className="h-10 w-10 text-muted-foreground/30" />
                                </div>
                            </motion.div>
                            <h3 className="text-base font-black uppercase tracking-widest text-foreground">No Items in Directory</h3>
                            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase opacity-60 tracking-tighter">Directory is empty or filters are too restrictive.</p>
                            <Button variant="outline" size="sm" className="mt-8 gap-2 font-bold rounded-xl" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-3.5 w-3.5" /> Upload First File
                            </Button>
                        </div>
                    ) : viewMode === 'list' ? (
                        <Table wrapperClassName="rounded-none border-none shadow-none">
                            <TableHeader className="bg-muted/10 sticky top-0 z-30 backdrop-blur-md border-b border-border/40">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Name</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Size</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Modified</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">Type</TableHead>
                                    <TableHead className="w-12 pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                        <TableRow 
                                            key={item.path}
                                            className={cn(
                                                "group transition-all duration-200 border-b border-border/20 cursor-default h-16",
                                                item.type === 'directory' ? "cursor-pointer hover:bg-primary/3" : "cursor-pointer hover:bg-muted/30"
                                            )}
                                            onClick={() => handleOpenFile(item)}
                                        >
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-2.5 rounded-xl transition-all duration-300 group-hover:shadow-md",
                                                    item.type === 'directory' ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-muted/50 border border-border/40 text-foreground/60"
                                                )}>
                                                    {getIcon(item)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className={cn(
                                                        "text-sm font-bold tracking-tight transition-colors truncate",
                                                        item.type === 'directory' ? "group-hover:text-primary" : "text-foreground/80"
                                                    )}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                                        {item.type === 'directory' ? 'System Directory' : 'Remote Resource'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-black font-mono text-foreground/70 tracking-tight">
                                                {item.type === 'file' ? (
                                                    item.size > 1024 * 1024 
                                                        ? (item.size / (1024 * 1024)).toFixed(1) + ' MB'
                                                        : (item.size / 1024).toFixed(1) + ' KB'
                                                ) : '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground/70 whitespace-nowrap">
                                                    {item.modified_at ? format(new Date(item.modified_at * 1000), 'MMM dd, yyyy') : '—'}
                                                </span>
                                                <span className="text-[9px] font-black text-muted-foreground/40 uppercase">
                                                    {item.modified_at ? formatDistanceToNow(new Date(item.modified_at * 1000), { addSuffix: true }) : ''}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "h-5 text-[8px] font-black uppercase tracking-widest",
                                                item.type === 'directory' ? "border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10" : "bg-muted/50 border-border/40 text-muted-foreground/70"
                                            )}>
                                                {item.type === 'directory' ? 'DIR' : (item.name.split('.').pop() || 'FILE')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pr-6 py-3" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-xl p-1">
                                                    {item.type === 'directory' ? (
                                                        <>
                                                            <DropdownMenuItem onClick={() => setCurrentPath(item.path)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                                <Folder className="h-4 w-4 text-primary" />
                                                                Open Folder
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDownloadDirectory(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                                <Download className="h-4 w-4 text-primary" />
                                                                Download as ZIP
                                                            </DropdownMenuItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleOpenFile(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                                <FileUp className="h-4 w-4 text-primary" />
                                                                Open / Preview
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDownload(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                                <Download className="h-4 w-4 text-emerald-500" />
                                                                Download File
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <div className="h-px bg-border/40 my-1" />
                                                    <DropdownMenuItem onClick={() => handleDelete(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete Permanently
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredItems.map((item) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={item.path}
                                    className={cn(
                                        "group relative flex flex-col items-center p-4 rounded-2xl border border-transparent transition-all duration-300 hover:border-border/60 hover:bg-muted/30 cursor-pointer",
                                        item.type === 'directory' && "hover:bg-primary/5 hover:border-primary/20"
                                    )}
                                    onClick={() => handleOpenFile(item)}
                                >
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 shadow-sm",
                                        item.type === 'directory' ? "bg-blue-500/10 text-blue-600" : "bg-muted/50 text-foreground/60"
                                    )}>
                                        {React.cloneElement(getIcon(item) as React.ReactElement, { className: "h-8 w-8" })}
                                    </div>
                                    <span className="text-xs font-bold text-center truncate w-full px-1 mb-1">
                                        {item.name}
                                    </span>
                                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                                        {item.type === 'directory' ? 'Folder' : (item.size > 1024 * 1024 
                                            ? (item.size / (1024 * 1024)).toFixed(1) + ' MB'
                                            : (item.size / 1024).toFixed(1) + ' KB')}
                                    </span>

                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm border border-border/40">
                                                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-xl p-1">
                                                {item.type === 'directory' ? (
                                                    <>
                                                        <DropdownMenuItem onClick={() => setCurrentPath(item.path)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                            <Folder className="h-4 w-4 text-primary" />
                                                            Open Folder
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDownloadDirectory(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                            <Download className="h-4 w-4 text-primary" />
                                                            Download as ZIP
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DropdownMenuItem onClick={() => handleOpenFile(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                            <FileUp className="h-4 w-4 text-primary" />
                                                            Open / Preview
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDownload(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5">
                                                            <Download className="h-4 w-4 text-emerald-500" />
                                                            Download File
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                <div className="h-px bg-border/40 my-1" />
                                                <DropdownMenuItem onClick={() => handleDelete(item)} className="rounded-lg text-xs font-bold py-2.5 gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete Permanently
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                        
                                        {/* --- File Preview Overlay --- */}
                                        <AnimatePresence>
                                            {previewFile && (
                                                                        <motion.div 
                                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="absolute inset-0 z-50 p-4 md:p-6 bg-background/20 backdrop-blur-sm"
                                                                        >
                                                                            <FilePreview 
                                                                                connectionId={connectionId} 
                                                                                path={previewFile.path} 
                                                                                filename={previewFile.name} 
                                                                                metadata={previewFile}
                                                                                onClose={() => setPreviewFile(null)}
                                                                            />
                                                                        </motion.div>
                                                
                                            )}
                                        </AnimatePresence>
                                    </div>
                        
                                    {/* --- Create Directory Dialog --- */}
                                    <Dialog open={isMkdirOpen} onOpenChange={setIsMkdirOpen}>
                        
                    <DialogContent className="sm:max-w-md rounded-3xl border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <FolderPlus className="h-5 w-5 text-primary" />
                                Create New Folder
                            </DialogTitle>
                            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase opacity-60">
                                Create a new remote directory in current path
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleMkdir}>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest pl-1">Directory Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. exports_2024"
                                        className="h-11 rounded-xl bg-background/50 border-border/40 focus:ring-primary/20"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsMkdirOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="rounded-xl font-bold px-6 shadow-lg shadow-primary/20" disabled={!newFolderName}>
                                    Create Folder
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* --- Delete Confirmation Alert Dialog --- */}
                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent className="rounded-[2.5rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl p-0 overflow-hidden max-w-md">
                        <div className="p-8 pb-4">
                            <AlertDialogHeader>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-inner">
                                        <Trash2 className="h-6 w-6" />
                                    </div>
                                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">
                                        Irreversible Action
                                    </AlertDialogTitle>
                                </div>
                                <AlertDialogDescription className="text-sm font-bold text-muted-foreground uppercase opacity-70 leading-relaxed">
                                    You are about to permanently delete <span className="text-destructive font-mono lowercase px-1 bg-destructive/5 rounded">{itemToDelete?.name}</span>. This resource cannot be recovered once purged.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                        </div>
                        <AlertDialogFooter className="bg-muted/30 p-6 flex items-center gap-3">
                            <AlertDialogCancel className="rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest border-border/40 bg-background/50 hover:bg-background transition-all mt-0 sm:mt-0">
                                Abort Operation
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={confirmDelete}
                                className="rounded-xl h-11 px-8 font-black text-[10px] uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-white transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-destructive/50 border border-destructive/20"
                            >
                                Confirm Purge
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* --- Status Bar --- */}
                <div className="bg-muted/10 border-t border-border/40 p-3 px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 border border-border/40">
                            <div className={cn("w-1.5 h-1.5 rounded-full", isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
                                {isLoading ? 'Synchronizing...' : `${filteredItems.length} Element${filteredItems.length !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                        <div className="h-3 w-px bg-border/40" />
                        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-md overflow-hidden">
                            <Folder className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                            <span className="text-[10px] font-bold text-muted-foreground/60 truncate uppercase tracking-tighter">
                                {currentPath || "Root Directory"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isUploading && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary animate-pulse">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Uploading...</span>
                            </div>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-2 cursor-help group-hover:text-primary transition-colors">
                                    <Info className="h-3.5 w-3.5" />
                                    Secure Live Management Mode
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold uppercase tracking-widest p-2 bg-background border-border/60 shadow-xl">
                                Direct real-time interaction with the remote filesystem.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};