/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useCallback } from 'react';
import {
    Folder, File, ChevronRight, Home,
    FileJson, FileText, Database, HardDrive,
    Search, ArrowLeft,
    FileSpreadsheet, FileCode, Info,
    LayoutGrid, List,
    SortAsc, SortDesc, Filter,
    Layers, Hash, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface AssetFileExplorerProps {
    assets: any[];
    selectedAssets?: Set<string>;
    onToggleAsset?: (name: string, checked: boolean) => void;
    onToggleAll?: (checked: boolean) => void;
    readOnly?: boolean;
}

type FileSystemNode = {
    name: string;
    path: string;
    type: 'directory' | 'file';
    asset?: any;
    children?: Record<string, FileSystemNode>;
};

type SortField = 'name' | 'size' | 'format';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'type';

export const AssetFileExplorer: React.FC<AssetFileExplorerProps> = ({
    assets,
    selectedAssets = new Set(),
    onToggleAsset,
    onToggleAll,
    readOnly = false
}) => {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Advanced UI State
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [groupBy, setGroupBy] = useState<GroupBy>('type');
    const [filterType] = useState<'all' | 'directory' | 'file'>('all');

    // Build Tree Structure
    const fileSystem = useMemo(() => {
        const root: FileSystemNode = { name: "root", path: "", type: "directory", children: {} };

        assets.forEach(asset => {
            const rawPath = (asset.fully_qualified_name || asset.name).replace(/\\/g, '/');
            const parts = rawPath.split('/').filter(Boolean);

            let currentLevel = root;

            parts.forEach((part: string | number, index: number) => {
                const isLast = index === parts.length - 1;
                const pathSoFar = parts.slice(0, index + 1).join('/');

                if (!currentLevel.children) currentLevel.children = {};

                if (!currentLevel.children[part]) {
                    currentLevel.children[part] = {
                        name: part as string,
                        path: pathSoFar,
                        type: isLast ? 'file' : 'directory',
                        children: isLast ? undefined : {},
                        asset: isLast ? asset : undefined
                    };
                }

                if (!isLast && currentLevel.children[part].type === 'file') {
                    currentLevel.children[part].type = 'directory';
                    currentLevel.children[part].children = currentLevel.children[part].children || {};
                }

                currentLevel = currentLevel.children[part];
            });
        });

        return root;
    }, [assets]);

    const getCurrentNode = (path: string): FileSystemNode | undefined => {
        if (!path) return fileSystem;
        const parts = path.split('/').filter(Boolean);
        let current = fileSystem;
        for (const part of parts) {
            if (current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return undefined;
            }
        }
        return current;
    };

    const currentNode = getCurrentNode(currentPath);

    // Helper to get all file names under a node recursively
    const getAllFilesUnderNode = useCallback((node: FileSystemNode): string[] => {
        let results: string[] = [];
        if (node.type === 'file' && node.asset) {
            results.push(node.asset.name);
        }
        if (node.children) {
            Object.values(node.children).forEach(child => {
                results = results.concat(getAllFilesUnderNode(child));
            });
        }
        return results;
    }, []);

    // Filter and sort items
    const items = useMemo(() => {
        if (!currentNode?.children) return [];
        let allItems = Object.values(currentNode.children);

        // 1. Filter by search query
        if (searchQuery) {
            allItems = allItems.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 2. Filter by type
        if (filterType !== 'all') {
            allItems = allItems.filter(item => item.type === filterType);
        }

        // 3. Sort & Group
        return allItems.sort((a, b) => {
            // Grouping logic
            if (groupBy === 'type') {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
            }

            // Primary sort field
            let comparison = 0;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortField === 'size') {
                comparison = (a.asset?.size_bytes || 0) - (b.asset?.size_bytes || 0);
            } else if (sortField === 'format') {
                comparison = (a.asset?.format || '').localeCompare(b.asset?.format || '');
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [currentNode, searchQuery, sortField, sortOrder, groupBy, filterType]);

    const handleNavigateUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const breadcrumbs = currentPath.split('/').filter(Boolean);

    const getIcon = (item: FileSystemNode) => {
        if (item.type === 'directory') return <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />;
        const ext = item.name.split('.').pop()?.toLowerCase();
        if (['json', 'jsonl'].includes(ext || '')) return <FileJson className="h-4 w-4 text-amber-500" />;
        if (['csv', 'tsv', 'txt'].includes(ext || '')) return <FileText className="h-4 w-4 text-emerald-500" />;
        if (['parquet', 'avro'].includes(ext || '')) return <Database className="h-4 w-4 text-purple-500" />;
        if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
        if (['xml'].includes(ext || '')) return <FileCode className="h-4 w-4 text-orange-500" />;
        return <File className="h-4 w-4 text-slate-400" />;
    };

    // Selection Logic
    const allFilesUnderCurrent = useMemo(() =>
        currentNode ? getAllFilesUnderNode(currentNode) : []
        , [currentNode, getAllFilesUnderNode]);

    const selectedFilesUnderCurrent = allFilesUnderCurrent.filter(name => selectedAssets.has(name));

    const isAllSelected = allFilesUnderCurrent.length > 0 && selectedFilesUnderCurrent.length === allFilesUnderCurrent.length;
    const isIndeterminate = selectedFilesUnderCurrent.length > 0 && selectedFilesUnderCurrent.length < allFilesUnderCurrent.length;

    const handleToggleCurrentFolder = (checked: boolean) => {
        allFilesUnderCurrent.forEach(name => {
            onToggleAsset?.(name, checked);
        });
    };

    const handleToggleGlobal = () => {
        const allAssetNames = assets.map(a => a.name);
        const shouldSelectAll = selectedAssets.size < allAssetNames.length;
        onToggleAll?.(shouldSelectAll);
    };

    const handleToggleFolderRecursive = (e: React.MouseEvent, node: FileSystemNode) => {
        e.stopPropagation();
        if (readOnly || !onToggleAsset) return;
        const files = getAllFilesUnderNode(node);
        const folderSelectedFiles = files.filter(f => selectedAssets.has(f));
        const shouldSelect = folderSelectedFiles.length < files.length;
        files.forEach(f => onToggleAsset(f, shouldSelect));
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full border-none rounded-none overflow-hidden bg-background/30 backdrop-blur-xl">
                {/* --- Modern Explorer Toolbar --- */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-muted/20 border-b border-border/40 shrink-0">
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
                            disabled={!currentPath}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* --- Breadcrumbs --- */}
                    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 px-2 py-1 bg-background/50 rounded-lg border border-border/40 min-h-9">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-2 shrink-0">Path:</span>
                        {breadcrumbs.length === 0 ? (
                            <span className="text-xs font-bold text-muted-foreground/60 px-1">/ root</span>
                        ) : (
                            breadcrumbs.map((part, index) => {
                                const path = breadcrumbs.slice(0, index + 1).join('/');
                                return (
                                    <React.Fragment key={path}>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                                        <button
                                            onClick={() => setCurrentPath(path)}
                                            className="px-2 py-0.5 rounded-md hover:bg-primary/10 hover:text-primary transition-all text-xs font-bold whitespace-nowrap"
                                        >
                                            {part}
                                        </button>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>

                    {/* --- Search & Action --- */}
                    <div className="flex items-center gap-2">
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
                                <DropdownMenuItem onClick={() => setSortField('format')} className="rounded-lg text-xs font-bold gap-2.5">
                                    <Database className={cn("h-4 w-4", sortField === 'format' ? "text-primary" : "opacity-40")} />
                                    Format
                                    {sortField === 'format' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-auto opacity-40" /> : <SortDesc className="h-3 w-3 ml-auto opacity-40" />)}
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
                        
                        <div className="relative group">
                            <Search className="z-20 absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search current folder..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-8 w-full sm:w-[200px] bg-background/50 border-border/40 focus:ring-primary/20 text-xs font-medium rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPath}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="min-h-full"
                        >
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                    <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                                        <HardDrive className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <h3 className="text-sm font-bold text-foreground">No assets found</h3>
                                    <p className="text-xs text-muted-foreground mt-1">This directory is empty or doesn't match filters.</p>
                                </div>
                            ) : viewMode === 'list' ? (
                                <Table wrapperClassName="rounded-none border-none">
                                    <TableHeader className="bg-muted/10 sticky top-0 z-30 backdrop-blur-md border-b border-border/40">
                                        <TableRow className="hover:bg-transparent border-none">
                                            {!readOnly && (
                                                <TableHead className="w-12 pl-6">
                                                    <Checkbox
                                                        checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                                                        onCheckedChange={(c) => handleToggleCurrentFolder(!!c)}
                                                        disabled={allFilesUnderCurrent.length === 0}
                                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                </TableHead>
                                            )}
                                            <TableHead className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground/60", readOnly && "pl-6")}>Asset Name</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">Format</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right pr-6">Size</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow
                                                key={item.path}
                                                className={cn(
                                                    "group transition-all duration-200 border-b border-border/20 cursor-default h-14",
                                                    item.type === 'directory' ? "cursor-pointer hover:bg-primary/3" : "hover:bg-muted/30"
                                                )}
                                                onClick={() => item.type === 'directory' && setCurrentPath(item.path)}
                                            >
                                                {!readOnly && (
                                                    <TableCell className="pl-6 py-2" onClick={(e) => e.stopPropagation()}>
                                                        {item.type === 'file' ? (
                                                            <Checkbox
                                                                checked={selectedAssets.has(item.asset.name)}
                                                                onCheckedChange={(c) => onToggleAsset?.(item.asset.name, !!c)}
                                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-transform duration-200 group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary transition-all p-0 group/btn"
                                                                        onClick={(e) => handleToggleFolderRecursive(e, item)}
                                                                    >
                                                                        <div className={cn(
                                                                            "w-4 h-4 rounded border border-border flex items-center justify-center transition-all group-hover/btn:border-primary",
                                                                            getAllFilesUnderNode(item).length > 0 && getAllFilesUnderNode(item).every(f => selectedAssets.has(f)) && "bg-primary border-primary"
                                                                        )}>
                                                                            <div className={cn(
                                                                                "w-1 h-1 rounded-full bg-border transition-colors",
                                                                                getAllFilesUnderNode(item).some(f => selectedAssets.has(f)) && "bg-primary-foreground"
                                                                            )} />
                                                                        </div>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" className="text-[9px] font-black uppercase">
                                                                    Toggle All in Folder
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell className={cn("py-2", readOnly && "pl-6")}>
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={cn(
                                                            "p-2 rounded-lg transition-all duration-300 group-hover:shadow-sm",
                                                            item.type === 'directory' ? "bg-blue-500/5 group-hover:bg-blue-500/10" : "bg-muted/30 group-hover:bg-muted/50"
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
                                                            {item.type === 'file' && item.asset.format && (
                                                                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                                                    {item.asset.format} DATA ASSET
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    {item.type === 'directory' ? (
                                                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase tracking-widest border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/5">
                                                            FOLDER
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase tracking-widest bg-muted/50 border-border/40 text-muted-foreground/70">
                                                            {item.name.split('.').pop() || 'FILE'}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-2">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black font-mono text-foreground/70 tracking-tight">
                                                            {item.asset?.size_bytes ? (
                                                                (item.asset.size_bytes / 1024).toFixed(1) + ' KB'
                                                            ) : '-'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {items.map((item) => {
                                        const isSelected = item.type === 'file' ? selectedAssets.has(item.asset.name) : getAllFilesUnderNode(item).every(f => selectedAssets.has(f));
                                        const isPartial = item.type === 'directory' && !isSelected && getAllFilesUnderNode(item).some(f => selectedAssets.has(f));

                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                key={item.path}
                                                className={cn(
                                                    "group relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                                                    item.type === 'directory' ? "hover:bg-primary/5 hover:border-primary/20 border-transparent" : "hover:bg-muted/30 border-transparent",
                                                    isSelected && "bg-primary/5 border-primary/30"
                                                )}
                                                onClick={() => item.type === 'directory' ? setCurrentPath(item.path) : onToggleAsset?.(item.asset.name, !isSelected)}
                                            >
                                                {!readOnly && (
                                                    <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                                                        {item.type === 'file' ? (
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={(c) => onToggleAsset?.(item.asset.name, !!c)}
                                                                className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                            />
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 rounded-md hover:bg-primary/10 p-0"
                                                                onClick={(e) => handleToggleFolderRecursive(e, item)}
                                                            >
                                                                <div className={cn(
                                                                    "w-4 h-4 rounded border border-border flex items-center justify-center transition-all",
                                                                    isSelected && "bg-primary border-primary",
                                                                    isPartial && "border-primary"
                                                                )}>
                                                                    <div className={cn(
                                                                        "w-1 h-1 rounded-full transition-colors",
                                                                        (isSelected || isPartial) ? "bg-primary-foreground" : "bg-border"
                                                                    )} />
                                                                </div>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 shadow-sm",
                                                    item.type === 'directory' ? "bg-blue-500/10 text-blue-600" : "bg-muted/50 text-foreground/60",
                                                    isSelected && "bg-primary/20 text-primary"
                                                )}>
                                                    {React.cloneElement(getIcon(item) as React.ReactElement, { className: "h-8 w-8" })}
                                                </div>
                                                <span className="text-xs font-bold text-center truncate w-full px-1 mb-1">
                                                    {item.name}
                                                </span>
                                                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                                                    {item.type === 'directory' ? 'Folder' : (item.asset?.size_bytes ? (item.asset.size_bytes / 1024).toFixed(1) + ' KB' : '-')}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* --- Status Bar --- */}
                <div className="bg-muted/10 border-t border-border/40 p-2 px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background/50 border border-border/40">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-foreground/70">{items.length} Items</span>
                        </div>
                        <div className="h-3 w-px bg-border/40" />
                        <div className="flex items-center gap-1.5 max-w-[150px] sm:max-w-xs overflow-hidden">
                            <Folder className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            <span className="text-[9px] font-bold text-muted-foreground/60 truncate uppercase tracking-tight">
                                {currentPath || "ROOT"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!readOnly && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[9px] font-bold uppercase tracking-tight hover:bg-primary/5 hover:text-primary transition-all gap-1"
                                    onClick={handleToggleGlobal}
                                >
                                    {selectedAssets.size === assets.length ? 'Clear Selection' : 'Select All'}
                                </Button>
                                <div className="h-5 px-2 flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-tighter">
                                    {selectedAssets.size} Selected
                                </div>
                            </>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-background shadow-none opacity-40 hover:opacity-100 transition-opacity">
                                    <Info className="h-3 w-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[9px] font-bold uppercase tracking-widest p-2 bg-background border-border/60 shadow-xl">
                                Assets are filtered by supported extensions
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};