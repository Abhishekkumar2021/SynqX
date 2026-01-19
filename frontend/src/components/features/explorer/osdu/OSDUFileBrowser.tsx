/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
    File, Upload, Download, Search, 
    RefreshCw, HardDrive, FileText, 
    FileArchive, Image, FileCode, MoreHorizontal,
    ExternalLink, Info, Trash2, X, Copy, ChevronRight,
    FileSearch, Box, Database, Clock, FileType, 
    GitBranch, History, Share2, AlertCircle, ShieldCheck,
    Globe, Server, Calendar, Tag, ChevronLeft, FileDown,
    Package, ArrowUpRight, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { cn, formatNumber, formatBytes } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnectionMetadata } from '@/lib/api/connections';
import { CodeBlock } from '@/components/ui/docs/CodeBlock';

interface OSDUFileBrowserProps {
    connectionId: number;
}

export const OSDUFileBrowser: React.FC<OSDUFileBrowserProps> = ({ connectionId }) => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // --- URL State Management ---
    const search = searchParams.get('q') || "";
    const activeFileId = searchParams.get('fileId') || null;
    const pageOffset = parseInt(searchParams.get('offset') || '0');
    const limit = 50;

    const [isUploading, setIsUploading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const updateParams = (updates: Record<string, string | null>) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(updates).forEach(([key, val]) => {
                if (val === null) next.delete(key);
                else next.set(key, val);
            });
            return next;
        });
    };

    const setSearch = (q: string) => updateParams({ q: q || null, offset: '0' });
    const setOffset = (o: number) => updateParams({ offset: String(o) });
    const setActiveFileId = (id: string | null) => updateParams({ fileId: id });

    // --- File Type Recognition ---
    const getFileIcon = (name: string = "") => {
        const ext = name.split('.').pop()?.toLowerCase();
        if (['zip', 'tar', 'gz', '7z'].includes(ext || '')) return <FileArchive className="text-orange-500" />;
        if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || '')) return <Image className="text-pink-500" />;
        if (['json', 'yaml', 'xml', 'csv', 'sql'].includes(ext || '')) return <FileCode className="text-blue-500" />;
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText className="text-rose-500" />;
        return <File className="text-amber-500" />;
    };

    // --- Data Queries ---
    const { data: fileResponse, isLoading } = useQuery({
        queryKey: ['osdu', 'files', connectionId, pageOffset, limit],
        queryFn: () => getConnectionMetadata(connectionId, 'execute_query', { 
            kind: "*:*:dataset--File.*:*", 
            limit, 
            offset: pageOffset 
        }),
    });

    const results = useMemo(() => fileResponse?.results || [], [fileResponse]);
    const totalAvailable = useMemo(() => fileResponse?.total_count ?? results.length, [fileResponse, results]);

    const { data: fileDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['osdu', 'file-details', connectionId, activeFileId],
        queryFn: async () => {
            const [record, versions, ancestry] = await Promise.all([
                getConnectionMetadata(connectionId, 'get_record', { record_id: activeFileId }),
                getConnectionMetadata(connectionId, 'get_record_versions', { record_id: activeFileId }),
                getConnectionMetadata(connectionId, 'get_ancestry', { record_id: activeFileId })
            ]);
            return { record, versions, ancestry };
        },
        enabled: !!activeFileId
    });

    // --- Mutations ---
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            setIsUploading(true);
            const buffer = await file.arrayBuffer();
            const content = new Uint8Array(buffer);
            const fileId = await getConnectionMetadata(connectionId, 'upload_file', { 
                content: Array.from(content), 
                filename: file.name,
                content_type: file.type || 'application/octet-stream'
            });
            return fileId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['osdu', 'files'] });
            toast.success("File uploaded successfully");
        },
        onSettled: () => setIsUploading(false)
    });

    const downloadFileAction = async (id: string, name: string) => {
        try {
            const data = await getConnectionMetadata(connectionId, 'download_file', { file_id: id });
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = name;
            link.click();
            window.URL.revokeObjectURL(link.href);
        } catch (err: any) {
            toast.error(`Failed to download ${name}`);
        }
    };

    const handleBulkDownload = async () => {
        const toDownload = flattenedFiles.filter(f => selectedIds.has(f.id));
        toast.promise(
            Promise.all(toDownload.map(f => downloadFileAction(f.id, f.name))),
            {
                loading: `Downloading ${toDownload.length} files...`,
                success: 'Bulk download started',
                error: 'Bulk download failed'
            }
        );
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            toast.promise(uploadMutation.mutateAsync(file), {
                loading: `Uploading ${file.name}...`,
                success: 'Registered in OSDU',
                error: 'Upload failed'
            });
        }
    };

    // --- Selection Logic ---
    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === results.length && results.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(results.map((r: any) => r.id)));
    };

    // --- Data Processing ---
    const flattenedFiles = useMemo(() => {
        return results.map((f: any) => ({
            id: f.id,
            kind: f.kind,
            name: f.data?.DatasetProperties?.FileSourceInfo?.Name || f.id.split(':').pop(),
            size: f.data?.DatasetProperties?.FileSourceInfo?.FileSize || "0",
            source: f.data?.DatasetProperties?.FileSourceInfo?.FileSource || "Cloud Storage",
            createdAt: f.createTime || "N/A",
            category: f.kind.split(':').slice(-2, -1)[0].split('--')[0] || 'dataset',
            raw: f
        }));
    }, [results]);

    const filteredFiles = useMemo(() => {
        return flattenedFiles.filter(f => 
            f.name.toLowerCase().includes(search.toLowerCase()) || 
            f.kind.toLowerCase().includes(search.toLowerCase())
        );
    }, [flattenedFiles, search]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const activeFile = useMemo(() => flattenedFiles.find(f => f.id === activeFileId), [flattenedFiles, activeFileId]);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background/5 animate-in fade-in duration-500 relative">
            
            {/* --- PRIMARY HUB HEADER --- */}
            <div className="h-16 px-8 border-b border-border/40 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 border border-amber-500/30 shrink-0">
                        <HardDrive size={20} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-black tracking-tight text-foreground leading-none truncate">Storage Hub</h2>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 leading-none opacity-60">Technical Partition Discovery</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group w-full md:w-80">
                        <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                        <Input 
                            placeholder="Discover files by name or ID..." 
                            className="h-10 pl-10 rounded-xl bg-background border-border/40 focus:border-amber-500/60 transition-all text-xs font-bold shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <input type="file" id="osdu-upload-v16" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    <Button 
                        size="sm"
                        onClick={() => document.getElementById('osdu-upload-v16')?.click()}
                        disabled={isUploading}
                        className="h-10 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20"
                    >
                        {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
                {/* TOOLBAR */}
                <div className="px-8 py-2 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <Checkbox 
                                checked={results.length > 0 && selectedIds.size === results.length}
                                onCheckedChange={toggleSelectAll}
                                className="h-4 w-4 rounded border-border/40 bg-background"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                <FileSearch size={12} /> Registry Index
                            </span>
                        </div>
                        <Badge variant="outline" className="h-5 px-2 border-border/40 bg-background text-[10px] font-black text-amber-600 shadow-sm">
                            {isLoading ? '...' : formatNumber(totalAvailable)} AVAILABLE
                        </Badge>
                    </div>

                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">{selectedIds.size} SELECTED</span>
                                <div className="h-5 w-px bg-border/20 mx-1" />
                                <Button 
                                    variant="default" size="sm" className="h-7 px-4 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                                    onClick={handleBulkDownload}
                                >
                                    <Download size={12} /> Bulk Fetch
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-muted" onClick={() => setSelectedIds(new Set())}>
                                    <X size={14} />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 min-h-0 relative overflow-hidden">
                    {/* EMPTY STATE */}
                    {!isLoading && flattenedFiles.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-40 z-10">
                            <div className="h-20 w-20 rounded-[2.5rem] border-2 border-dashed border-muted-foreground flex items-center justify-center shadow-inner">
                                <Package size={40} strokeWidth={1} />
                            </div>
                            <div className="space-y-1">
                                <p className="font-black text-2xl tracking-tighter uppercase text-foreground">Registry Idle</p>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] max-w-xs text-muted-foreground">No file records resolved for this technical scope.</p>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="h-full">
                        <div className="p-6 max-w-7xl mx-auto w-full">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-48 gap-6 opacity-40">
                                    <RefreshCw className="h-12 w-12 text-amber-500 animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Materializing storage frame...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                                    {flattenedFiles.map((f) => (
                                        <motion.div 
                                            key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "group p-5 rounded-[1.75rem] bg-card border transition-all cursor-default flex flex-col gap-4 relative overflow-hidden shadow-md ring-1 ring-white/5",
                                                selectedIds.has(f.id) 
                                                    ? "border-amber-500/40 shadow-xl ring-amber-500/10 scale-[1.01] z-10" 
                                                    : "border-border/40 hover:border-amber-500/30 hover:shadow-lg"
                                            )}
                                        >
                                            <div className="absolute top-4 left-4 z-30 opacity-0 group-hover:opacity-100 transition-all">
                                                <Checkbox checked={selectedIds.has(f.id)} onCheckedChange={() => toggleSelection(f.id)} className="h-4.5 w-4.5 rounded-md border-border/40 bg-background" />
                                            </div>

                                            <div className="flex items-start gap-4 pt-1 min-w-0">
                                                <div className="h-10 w-10 rounded-2xl bg-muted/20 border border-border/10 flex items-center justify-center text-muted-foreground shrink-0 transition-colors shadow-inner">
                                                    {getFileIcon(f.name)}
                                                </div>
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <h4 className="font-black text-[13px] truncate text-foreground/90 tracking-tight leading-none uppercase pr-8" title={f.name}>{f.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1.5 min-w-0">
                                                        <Badge variant="secondary" className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-600 border-none px-1.5 h-4 tracking-widest shrink-0">
                                                            {f.category}
                                                        </Badge>
                                                        <span className="text-[9px] font-mono text-muted-foreground/40 truncate" title={f.id}>{f.id}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-muted/30 rounded-xl p-3.5 border border-border/10 shadow-inner">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black uppercase opacity-30 tracking-widest mb-1 leading-none">Volume</span>
                                                        <span className="text-[10px] font-bold text-amber-600/70">{formatBytes(parseInt(f.size))}</span>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black uppercase opacity-30 tracking-widest mb-1 leading-none">Indexed</span>
                                                        <span className="text-[10px] font-bold text-foreground/60">{new Date(f.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-border/10 flex items-center justify-between px-1">
                                                <span className="text-[9px] font-mono text-muted-foreground/40 flex items-center gap-1.5 italic shrink-0">
                                                    <Globe size={10} /> {f.source.split('/').pop() || 'Persistent'}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-amber-500/10 hover:text-amber-600" onClick={() => setActiveFileId(f.id)}>
                                                        <Eye size={14} />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted"><MoreHorizontal size={14} /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/40 shadow-2xl p-2">
                                                            <DropdownMenuItem className="text-xs font-bold gap-3 py-2.5 rounded-lg" onClick={() => downloadFileAction(f.id, f.name)}>
                                                                <FileDown size={14} /> Download Binary
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-xs font-bold gap-3 py-2.5 rounded-lg" onClick={() => copyToClipboard(f.id, "Registry ID")}>
                                                                <Copy size={14} /> Copy Registry ID
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="my-2 opacity-5" />
                                                            <DropdownMenuItem className="text-xs font-bold gap-3 py-2.5 rounded-lg text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10">
                                                                <Trash2 size={14} /> Delete Record
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* NAVIGATION FOOTER */}
                <div className="px-8 py-3 border-t border-border/10 bg-background/40 backdrop-blur-md flex items-center justify-between shrink-0 relative z-20 shadow-inner">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none">technical registry frame</span>
                            <span className="text-sm font-black text-foreground mt-1 tracking-tighter uppercase">
                                {formatNumber(pageOffset + 1)} — {formatNumber(pageOffset + results.length)} <span className="opacity-20 mx-2 text-[10px]">TOTAL IN PARTITION</span> {formatNumber(totalAvailable)}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-border/10" />
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Density</span>
                            <Badge className="bg-amber-500/5 text-amber-600 border-amber-500/20 font-black h-6 text-[9px]">{limit} BUFF</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-4 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/40 hover:bg-muted shadow-sm" onClick={() => setOffset(Math.max(0, pageOffset - limit))} disabled={pageOffset === 0 || isLoading}>
                            <ChevronLeft size={16} /> Previous
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/40 hover:bg-muted shadow-sm" onClick={() => setOffset(pageOffset + limit)} disabled={pageOffset + limit >= totalAvailable || isLoading}>
                            Next Discover <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* DETAILS HUB DIALOG */}
            <Dialog open={!!activeFileId} onOpenChange={(open) => !open && setActiveFileId(null)}>
                <DialogContent className="max-w-4xl h-[82vh] p-0 gap-0 border border-border/40 overflow-hidden flex flex-col bg-background/95 backdrop-blur-3xl shadow-[0_40px_120px_rgba(0,0,0,0.5)] rounded-[2.5rem]">
                    <div className="h-full flex flex-col min-w-0 overflow-hidden">
                        <div className="p-8 px-10 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0 min-w-0 relative">
                            <div className="flex items-center gap-6 min-w-0 flex-1 pr-12">
                                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-xl shrink-0">
                                    {activeFile && React.cloneElement(getFileIcon(activeFile.name) as any, { size: 32 })}
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <Badge className="bg-amber-500 text-white border-none text-[9px] font-black uppercase px-2 h-4.5 tracking-widest shadow-lg">DATASET_V2</Badge>
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40 truncate">
                                            <span className="truncate">{activeFileId}</span>
                                            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-40 hover:opacity-100" onClick={() => copyToClipboard(activeFileId || '', "ID")}><Copy size={12} /></Button>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tighter truncate text-foreground leading-none uppercase">
                                        {activeFile?.name}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 bg-muted/5">
                            <div className="p-10 space-y-10 max-w-4xl mx-auto w-full overflow-hidden">
                                <div className="flex items-center gap-3">
                                    <Button className="flex-1 rounded-xl h-12 gap-3 font-black uppercase text-[11px] tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-500/20" onClick={() => activeFileId && downloadFileAction(activeFileId, activeFile?.name || 'download')}>
                                        <FileDown size={18} /> Request Binary Stream
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/40 hover:bg-muted shadow-sm"><Share2 size={18} /></Button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-[2rem] border border-border/10 bg-background/40 shadow-inner">
                                    {[
                                        { label: 'KIND', value: activeFile?.category || 'File', icon: Box, color: 'text-orange-500' },
                                        { label: 'SIZE', value: activeFile ? formatBytes(parseInt(activeFile.size)) : '0 B', icon: Database, color: 'text-blue-500' },
                                        { label: 'SOURCE', value: activeFile?.source || 'Persistent', icon: Globe, color: 'text-rose-500' },
                                        { label: 'STAMP', value: activeFile ? new Date(activeFile.createdAt).toLocaleDateString() : 'N/A', icon: Clock, color: 'text-emerald-500' }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col gap-1.5 min-w-0">
                                            <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1.5"><stat.icon size={10} className={stat.color} /> {stat.label}</span>
                                            <p className="text-sm font-black truncate text-foreground/90 tracking-tight uppercase">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 overflow-hidden">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2"><FileCode size={16} /> Registry Manifest</h3>
                                        <Badge variant="outline" className="text-[9px] font-black border-border/40 bg-muted/20 px-2.5 h-5">PROTOCOL_JSON</Badge>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-border/40 overflow-hidden bg-background shadow-lg">
                                        {isLoadingDetails ? (
                                            <div className="h-48 flex items-center justify-center"><RefreshCw size={24} className="animate-spin text-primary/20" /></div>
                                        ) : (
                                            <CodeBlock code={JSON.stringify(fileDetails?.record || {}, null, 2)} language="json" maxHeight="350px" rounded={false} className="border-none" />
                                        )}
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-6 shadow-xl">
                                    <AlertCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Governance Context</p>
                                        <p className="text-sm text-amber-600/70 leading-relaxed font-bold">
                                            Governed by <strong>{fileDetails?.record?.legal?.legaltags?.[0] || 'DEFAULT'}</strong> context. Data sovereignty residency rules apply.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="p-5 px-10 border-t border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 leading-none">OSDU Technical Storage Hub v2.5.3</span>
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-border/40 opacity-40 px-3 h-6">Verified_Admin</Badge>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};