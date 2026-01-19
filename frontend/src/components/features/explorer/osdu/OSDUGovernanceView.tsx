/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Users, ShieldCheck, Search, RefreshCw, 
    MoreHorizontal, Copy, Trash2, UserPlus, 
    Shield, Globe, Key, AlertCircle, Info,
    ChevronRight, Check, ListChecks, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { cn, formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnectionMetadata } from '@/lib/api/connections';

interface OSDUGovernanceViewProps {
    connectionId: number;
    initialMode: 'identity' | 'compliance';
}

export const OSDUGovernanceView: React.FC<OSDUGovernanceViewProps> = ({ 
    connectionId, 
    initialMode 
}) => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // --- Data Queries ---
    const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
        queryKey: ['osdu', 'groups', connectionId],
        queryFn: () => getConnectionMetadata(connectionId, 'get_groups', {}),
        enabled: initialMode === 'identity'
    });

    const { data: legalTags = [], isLoading: isLoadingLegal } = useQuery({
        queryKey: ['osdu', 'legal', connectionId],
        queryFn: () => getConnectionMetadata(connectionId, 'get_legal_tags', {}),
        enabled: initialMode === 'compliance'
    });

    const items = useMemo(() => {
        const list = initialMode === 'identity' ? groups : legalTags;
        return list.filter((i: any) => {
            const name = i.name || i.email || "";
            return name.toLowerCase().includes(search.toLowerCase());
        });
    }, [initialMode, groups, legalTags, search]);

    // --- Actions ---
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        const allIds = items.map((i: any) => i.id || i.name || i.email);
        if (selectedIds.size === items.length && items.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(allIds));
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-muted/5 animate-in fade-in duration-500">
            {/* GOVERNANCE HUB BAR - HIGH CONTRAST COMPACT */}
            <div className="h-16 px-8 border-b border-border/40 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner",
                        initialMode === 'identity' ? "bg-indigo-500/15 text-indigo-600 border-indigo-500/30" : "bg-rose-500/15 text-rose-600 border-rose-500/30"
                    )}>
                        {initialMode === 'identity' ? <Users size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-foreground leading-none">
                            {initialMode === 'identity' ? 'Identity Hub' : 'Compliance Suite'}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">
                            {initialMode === 'identity' ? 'Entitlement Management' : 'Legal Framework'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group w-full md:w-96">
                        <Search className="z-20 absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input 
                            placeholder={initialMode === 'identity' ? "Find security domains..." : "Find legal tags..."}
                            className="h-10 pl-12 pr-4 rounded-xl bg-background border-border/40 focus:border-border/60 transition-all text-sm font-bold shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* MAIN LIST DISCOVERY */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div className="px-10 py-3 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4">
                            <Checkbox 
                                checked={items.length > 0 && selectedIds.size === items.length}
                                onCheckedChange={toggleSelectAll}
                                className="h-5 w-5 rounded-lg border-border/40 bg-background shadow-sm"
                            />
                            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                <ListChecks size={16} /> Registry Records
                            </span>
                        </div>
                        <Badge variant="outline" className="h-6 px-3 border-border/40 bg-background text-xs font-black text-foreground/80 shadow-sm">
                            {initialMode === 'identity' ? formatNumber(groups.length) : formatNumber(legalTags.length)} DEFINITIONS
                        </Badge>
                    </div>

                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3">
                                <span className="text-xs font-black uppercase tracking-widest text-primary">{selectedIds.size} Selected</span>
                                <div className="h-6 w-px bg-border/20 mx-2" />
                                <Button variant="default" size="sm" className="h-9 px-5 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                                    <Globe size={14} /> Bulk Provision
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted" onClick={() => setSelectedIds(new Set())}>
                                    <X size={16} />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 min-h-0 relative overflow-hidden">
                    {/* Empty State */}
                    {!isLoadingGroups && !isLoadingLegal && items.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8 opacity-40 z-10">
                            <div className="h-32 w-32 rounded-[3.5rem] border-2 border-dashed border-muted-foreground flex items-center justify-center shadow-inner">
                                <Key size={64} strokeWidth={1} />
                            </div>
                            <div className="space-y-2">
                                <p className="font-black text-3xl tracking-tighter uppercase text-foreground">Registry Dormant</p>
                                <p className="text-sm font-bold uppercase tracking-[0.2em] max-w-sm text-muted-foreground">No governance records resolved. Update your technical scope or refresh the hub.</p>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="h-full">
                        <div className="p-10 max-w-7xl mx-auto w-full">
                            {(isLoadingGroups || isLoadingLegal) ? (
                                <div className="flex flex-col items-center justify-center py-48 gap-8 opacity-40">
                                    <RefreshCw className="h-16 w-16 text-primary animate-spin" />
                                    <span className="text-sm font-black uppercase tracking-[0.5em]">Materializing security context...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-32">
                                    {items.map((i: any) => {
                                        const id = i.id || i.name || i.email;
                                        const isSelected = selectedIds.has(id);
                                        return (
                                            <motion.div 
                                                key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                className={cn(
                                                    "group p-6 rounded-[2.5rem] border transition-all cursor-default flex flex-col gap-5 relative overflow-hidden shadow-md ring-1 ring-white/5",
                                                    isSelected 
                                                        ? "bg-primary/5 border-primary/40 shadow-2xl scale-[1.02]" 
                                                        : "bg-card border-border/40 hover:border-primary/30 hover:shadow-xl"
                                                )}
                                            >
                                                <div className="absolute top-5 left-5 z-30 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(id)} className="h-5 w-5 rounded-lg border-border/40" />
                                                </div>

                                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-[-4px] group-hover:translate-y-[4px]">
                                                    <ArrowUpRight size={20} className="text-primary" />
                                                </div>
                                                
                                                <div className="flex items-start gap-5 pt-2">
                                                    <div className={cn(
                                                        "h-14 w-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform",
                                                        initialMode === 'identity' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600" : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                                                    )}>
                                                        {initialMode === 'identity' ? <Users size={28} /> : <ShieldCheck size={28} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-black text-lg truncate text-foreground tracking-tight leading-none mb-2">
                                                            {i.displayName || i.name || i.email.split('@')[0]}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase border-border/60 bg-muted/30 h-5 px-2 tracking-widest text-foreground">
                                                                {initialMode === 'identity' ? 'Domain' : 'Legal_Tag'}
                                                            </Badge>
                                                            <span className="text-[11px] font-mono text-muted-foreground/60 truncate" title={id}>{id}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-muted/30 rounded-[1.5rem] p-5 border border-border/10 shadow-inner space-y-3">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-[9px] font-black uppercase opacity-40 tracking-widest">Global Status</span>
                                                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none text-[9px] font-black h-5 uppercase">Verified_Active</Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-[9px] font-black uppercase opacity-40 tracking-widest">Last Sync</span>
                                                        <span className="text-[11px] font-bold text-foreground/60 uppercase">{new Date().toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => copyToClipboard(id, "Entry ID")}>
                                                            <Copy size={14} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                                                            <Info size={14} />
                                                        </Button>
                                                    </div>
                                                    <div className="text-[11px] font-black text-primary uppercase tracking-[0.2em] group-hover:translate-x-1 transition-all cursor-pointer">Configure Hub</div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Unified Footer */}
                <div className="px-10 py-6 border-t border-border/10 bg-background/40 backdrop-blur-md flex items-center justify-between shrink-0 relative z-20 shadow-inner">
                    <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 leading-none">technical Registry</span>
                            <span className="text-base font-black text-foreground mt-1.5 tracking-tighter uppercase">
                                Showing {formatNumber(items.length)} <span className="opacity-20 mx-2 text-xs">BUFFER TOTAL</span> {formatNumber(items.length)}
                            </span>
                        </div>
                        <div className="h-10 w-px bg-border/10" />
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Pulse</span>
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-none font-black h-6 shadow-sm">SYSTEM_LOCKED</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="h-11 px-8 gap-2 text-[11px] font-black uppercase tracking-widest rounded-2xl border-border/40 hover:bg-muted shadow-sm transition-all" onClick={() => queryClient.invalidateQueries()}>
                            <RefreshCw size={18} className="mr-1" /> Re-Sync Hub
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
