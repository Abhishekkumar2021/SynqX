import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ArrowRight, ListFilter, History, Copy, Check, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { type HistoryItem } from './types';

interface ExecutionHistoryProps {
    history: HistoryItem[];
    onClose: () => void;
    onRestore: (query: string) => void;
    onClear: () => void;
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ history, onClose, onRestore, onClear }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const handleCopy = (e: React.MouseEvent, query: string, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(query);
        setCopiedId(id);
        toast.success("Query copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredHistory = useMemo(() => {
        if (!search) return history;
        const lowSearch = search.toLowerCase();
        return history.filter(item => 
            item.query.toLowerCase().includes(lowSearch) || 
            item.connectionName.toLowerCase().includes(lowSearch)
        );
    }, [history, search]);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 380, damping: 35 }}
            className={cn(
                "absolute right-0 top-0 bottom-0 w-96 z-100 flex flex-col overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.2)] isolate",
                "bg-background/95 backdrop-blur-3xl border-l border-border/40"
            )}
        >
            {/* Header */}
            <header className="p-5 border-b border-border/40 bg-muted/10 shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <History size={16} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                History
                            </h3>
                            <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                                {history.length} Events
                            </span>
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={onClose}
                            >
                                <X size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className='z-200'>Close History</TooltipContent>
                    </Tooltip>
                </div>

                <div className="relative group">
                    <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Filter history..." 
                        className="h-9 pl-9 rounded-xl bg-background/50 border-border/40 text-xs font-medium focus:ring-primary/10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            {/* History List */}
            <ScrollArea className="flex-1 px-4">
                <div className="py-6 space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredHistory.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.04 }}
                                className="group relative p-4 rounded-2xl border border-border/40 bg-card hover:bg-muted/40 hover:border-primary/20 transition-all cursor-pointer overflow-hidden active:scale-[0.98]"
                                onClick={() => onRestore(item.query)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className="text-[9px] font-bold bg-primary/5 text-primary border-primary/10 px-2 h-5 rounded-md">
                                        {item.connectionName}
                                    </Badge>
                                    <div className="flex items-center gap-3">
                                        {item.duration !== undefined && (
                                            <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-muted-foreground/60">
                                                <Zap size={10} className="text-yellow-500/70" />
                                                {item.duration}ms
                                            </div>
                                        )}
                                        <span className="text-[9px] font-mono text-muted-foreground/40">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative group/code mb-3">
                                    <code className={cn(
                                        "block p-3 rounded-xl border border-border/40 bg-muted/20 text-[10px] font-mono leading-relaxed line-clamp-3 transition-colors",
                                        "group-hover:bg-background group-hover:border-border/60"
                                    )}>
                                        {item.query}
                                    </code>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-background/80 backdrop-blur-md rounded-lg shadow-sm"
                                                onClick={(e) => handleCopy(e, item.query, item.id as string)}
                                            >
                                                {copiedId === item.id ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">Copy SQL</TooltipContent>
                                    </Tooltip>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                                        <ListFilter size={10} />
                                        {formatNumber(item.rowCount ?? 0)} Rows
                                    </div>

                                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        Restore <ArrowRight size={10} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredHistory.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-20 flex flex-col items-center justify-center gap-4 text-center"
                        >
                            <div className="p-6 rounded-full bg-muted/30 text-muted-foreground/30">
                                <Search size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-muted-foreground">No events found</p>
                                <p className="text-[10px] text-muted-foreground/50">Try adjusting your filters</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <footer className="p-5 shrink-0 border-t border-border/40 bg-background/50 backdrop-blur-xl">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            disabled={history.length === 0}
                            onClick={onClear}
                            className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all"
                        >
                            <Trash2 size={12} />
                            Clear History
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Purge all execution logs</TooltipContent>
                </Tooltip>
            </footer>
        </motion.div>
    );
};