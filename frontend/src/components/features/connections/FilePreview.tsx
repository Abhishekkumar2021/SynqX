/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { 
    FileText, Image as ImageIcon, FileCode, 
    File as FileIcon, Loader2, AlertCircle,
    Download, Maximize2, Minimize2, X, Save,
    GitCompare, Copy, Check,
    Info, Calendar, Hash, FileType as TypeIcon,
    RefreshCw,
    Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRemoteFileBlob, saveRemoteFile } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';

interface FilePreviewProps {
    connectionId: number;
    path: string;
    filename: string;
    onClose: () => void;
    metadata?: any;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ connectionId, path, filename, onClose, metadata }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState<any>(null);
    const [modifiedContent, setModifiedContent] = useState<string>("");
    const [fileType, setFileType] = useState<'text' | 'image' | 'pdf' | 'binary' | 'json'>('text');
    const [isMaximized, setIsMaximized] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(true);

    const objectUrlRef = useRef<string | null>(null);
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    const isEditable = useMemo(() => ['text', 'json'].includes(fileType), [fileType]);
    const hasChanges = useMemo(() => isEditable && content !== modifiedContent, [isEditable, content, modifiedContent]);

    useEffect(() => {
        let isCurrent = true;

        const loadFile = async () => {
            setLoading(true);
            setError(null);
            
            // Cleanup previous object URL if any
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            try {
                const blob = await getRemoteFileBlob(connectionId, path);
                if (!isCurrent) return;

                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
                    setFileType('image');
                    const url = URL.createObjectURL(blob);
                    objectUrlRef.current = url;
                    setContent(url);
                } else if (extension === 'pdf') {
                    setFileType('pdf');
                    // Ensure the blob has the correct MIME type for the PDF viewer
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    const url = URL.createObjectURL(pdfBlob);
                    objectUrlRef.current = url;
                    setContent(url);
                } else {
                    const text = await blob.text();
                    if (!isCurrent) return;

                    // Simple binary check
                    if (text.includes('\u0000') && !['json', 'jsonl', 'xml', 'csv', 'tsv'].includes(extension)) {
                        setFileType('binary');
                        setContent(null);
                    } else {
                        if (extension === 'json' || extension === 'jsonl') {
                            setFileType('json');
                            try {
                                const parsed = JSON.parse(text);
                                const formatted = JSON.stringify(parsed, null, 2);
                                setContent(formatted);
                                setModifiedContent(formatted);
                            } catch {
                                setContent(text);
                                setModifiedContent(text);
                            }
                        } else {
                            setFileType('text');
                            setContent(text);
                            setModifiedContent(text);
                        }
                    }
                }
            } catch (err: any) {
                if (isCurrent) {
                    setError(err.message || "Failed to load file content");
                }
            } finally {
                if (isCurrent) {
                    setLoading(false);
                }
            }
        };

        loadFile();

        return () => {
            isCurrent = false;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, [connectionId, path, extension]);

    const handleSave = async () => {
        if (!isEditable || !hasChanges) return;
        setIsSaving(true);
        const toastId = toast.loading("Saving remote changes...");
        try {
            await saveRemoteFile(connectionId, path, modifiedContent);
            setContent(modifiedContent);
            toast.success("Remote file updated", { id: toastId });
        } catch (err: any) {
            toast.error("Save failed", { id: toastId, description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(modifiedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard");
    };

    const getMonacoLanguage = () => {
        const langMap: Record<string, string> = {
            'js': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'jsx': 'javascript',
            'py': 'python', 'sh': 'shell', 'sql': 'sql', 'json': 'json', 'jsonl': 'json',
            'md': 'markdown', 'html': 'html', 'css': 'css', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
        };
        return langMap[extension] || 'plaintext';
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/5 shrink-0">
            <div className="flex items-center gap-4">
                <div className={cn(
                    "p-2.5 rounded-xl transition-all shadow-sm",
                    fileType === 'image' ? "bg-amber-500/10 text-amber-600" : 
                    fileType === 'pdf' ? "bg-red-500/10 text-red-600" :
                    "bg-primary/10 text-primary"
                )}>
                    {fileType === 'image' ? <ImageIcon className="h-5 w-5" /> : 
                     fileType === 'pdf' ? <FileText className="h-5 w-5" /> :
                     <FileCode className="h-5 w-5" />}
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black tracking-tight truncate max-w-[200px] sm:max-w-md uppercase">{filename}</h3>
                        <Badge variant="outline" className="h-4 text-[8px] font-black uppercase tracking-tighter bg-background/50 border-border/40">
                            {extension || 'FILE'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-medium">
                        <span className="truncate max-w-[300px] font-mono">{path}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isEditable && !loading && !error && (
                    <div className="flex items-center gap-1.5 mr-2 bg-muted/20 p-1 rounded-lg border border-border/40">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] font-bold gap-1.5"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            Copy
                        </Button>
                        <Separator orientation="vertical" className="h-4 bg-border/60" />
                        <Button 
                            variant={showDiff ? "secondary" : "ghost"} 
                            size="sm" 
                            className="h-7 px-2 text-[10px] font-bold gap-1.5"
                            onClick={() => setShowDiff(!showDiff)}
                        >
                            <GitCompare className="h-3 w-3" />
                            {showDiff ? 'Editor' : 'Diff'}
                        </Button>
                        {hasChanges && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-7 px-3 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-1.5 animate-in slide-in-from-right-2"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Save
                            </Button>
                        )}
                    </div>
                )}
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-8 w-8 rounded-lg", showDetails && "bg-muted")} 
                    onClick={() => setShowDetails(!showDetails)}
                    title="Toggle Details"
                >
                    <Info className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-border/40 mx-1" />

                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsMaximized(!isMaximized)}>
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    const renderContentArea = () => {
        if (loading) {
            return (
                <div className="flex flex-col gap-4 p-8 items-center justify-center h-full">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                        Syncing Remote Data...
                    </p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col gap-6 p-12 items-center justify-center h-full text-center">
                    <div className="p-5 rounded-[2rem] bg-destructive/5 border border-destructive/20 text-destructive shadow-inner">
                        <AlertCircle className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-black text-xl uppercase tracking-tight">Stream Interrupted</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{error}</p>
                    </div>
                    <Button variant="outline" className="rounded-xl px-8 h-11 font-bold gap-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all" onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4" /> Re-establish Session
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex-1 flex overflow-hidden bg-muted/5">
                {/* --- Main Viewer --- */}
                <div className="flex-1 overflow-hidden relative">
                    {fileType === 'image' && (
                        <div className="h-full w-full flex items-center justify-center p-12 overflow-auto custom-scrollbar bg-checkered-pattern">
                            <img 
                                src={content} 
                                alt={filename} 
                                className="max-w-full max-h-full object-contain rounded-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-border/40"
                            />
                        </div>
                    )}

                    {fileType === 'pdf' && (
                        <div className="h-full w-full bg-white">
                            <iframe 
                                src={`${content}#toolbar=0&navpanes=0`} 
                                className="h-full w-full border-none"
                                title={filename}
                            />
                        </div>
                    )}

                    {(fileType === 'text' || fileType === 'json') && (
                        <div className="h-full w-full relative">
                            {showDiff ? (
                                <DiffEditor
                                    height="100%"
                                    language={getMonacoLanguage()}
                                    original={content}
                                    modified={modifiedContent}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        renderSideBySide: true,
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        automaticLayout: true,
                                        scrollBeyondLastLine: false,
                                        padding: { top: 20, bottom: 20 },
                                    }}
                                />
                            ) : (
                                <Editor
                                    height="100%"
                                    language={getMonacoLanguage()}
                                    value={modifiedContent}
                                    onChange={(val) => setModifiedContent(val || "")}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: isSaving,
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        lineNumbers: 'on',
                                        roundedSelection: true,
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        padding: { top: 20, bottom: 20 },
                                        contextmenu: true,
                                        domReadOnly: false,
                                        smoothScrolling: true,
                                        cursorSmoothCaretAnimation: true,
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {fileType === 'binary' && (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-8 p-12 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-muted/50 blur-3xl rounded-full" />
                                <div className="relative p-8 rounded-[3rem] bg-muted/20 border border-border/40 shadow-inner">
                                    <FileIcon className="h-20 w-20 text-muted-foreground/30" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black uppercase tracking-tight">Binary Format Detected</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium">
                                    Rich preview is unavailable for this specific format. Download the resource to inspect locally.
                                </p>
                            </div>
                            <Button 
                                className="rounded-2xl gap-2 font-black uppercase tracking-widest px-10 h-12 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = content || '#';
                                    link.download = filename;
                                    link.click();
                                }}
                            >
                                <Download className="h-4 w-4" /> Download Payload
                            </Button>
                        </div>
                    )}
                </div>

                {/* --- Sidebar Details --- */}
                <AnimatePresence>
                    {showDetails && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-l border-border/40 bg-muted/5 overflow-hidden hidden lg:flex flex-col"
                        >
                            <div className="p-6 space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                                        <Info className="h-3 w-3" /> File Specifications
                                    </h4>
                                    <div className="space-y-4">
                                        <DetailItem icon={<TypeIcon className="h-3.5 w-3.5" />} label="Format" value={extension.toUpperCase() || 'Unknown'} />
                                        <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="Size" value={formatSize(metadata?.size || 0)} />
                                        <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Modified" value={metadata?.modified_at ? format(new Date(metadata.modified_at * 1000), 'MMM dd, HH:mm') : '—'} />
                                    </div>
                                </div>

                                <Separator className="bg-border/40" />

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                                        <Database className="h-3 w-3" /> Path context
                                    </h4>
                                    <div className="bg-muted/30 p-3 rounded-xl border border-border/40 overflow-hidden">
                                        <p className="text-[10px] font-mono break-all text-muted-foreground leading-relaxed">
                                            {path}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (isMaximized) {
        return createPortal(
            <div className="fixed inset-0 z-1000 bg-background flex flex-col h-screen w-screen overflow-hidden">
                {renderHeader()}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {renderContentArea()}
                </div>
            </div>,
            document.body
        );
    }

    return (
        <div className="absolute inset-0 z-50 p-4 md:p-10 bg-background/20 backdrop-blur-md flex items-center justify-center">
            <div className="w-full h-full max-w-7xl flex flex-col rounded-[2.5rem] overflow-hidden border border-border/40 shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] bg-background">
                {renderHeader()}
                {renderContentArea()}
            </div>
        </div>
    );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center justify-between group/item">
        <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-1 rounded-md bg-muted group-hover/item:text-primary transition-colors">{icon}</div>
            <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
        </div>
        <span className="text-xs font-black text-foreground">{value}</span>
    </div>
);