/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { 
    Grid3X3, Search, RefreshCw, 
    Layers, Database, 
    Filter, ChevronRight, Box, Globe, Tag, FileType, ChevronDown, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OSDURegistryViewProps {
    kinds: any[];
    onSelectKind: (kind: string) => void;
    isLoading: boolean;
    onRefresh: () => void;
}

export const OSDURegistryView: React.FC<OSDURegistryViewProps> = ({ 
    kinds, onSelectKind, isLoading, onRefresh 
}) => {
    const [search, setSearch] = useState("");
    const [selectedAuthorities, setSelectedAuthorities] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

    // --- Facet Extraction ---
    const facets = useMemo(() => {
        const auths = new Set<string>();
        const srcs = new Set<string>();
        const types = new Set<string>();
        
        kinds.forEach(k => {
            if (k.authority) auths.add(k.authority);
            if (k.source) srcs.add(k.source);
            if (k.group) types.add(k.group);
        });
        
        return {
            authorities: Array.from(auths).sort(),
            sources: Array.from(srcs).sort(),
            types: Array.from(types).sort()
        };
    }, [kinds]);

    const filteredKinds = useMemo(() => {
        return kinds.filter(k => {
            const matchesSearch = k.full_kind.toLowerCase().includes(search.toLowerCase());
            const matchesAuth = selectedAuthorities.length === 0 || selectedAuthorities.includes(k.authority);
            const matchesSource = selectedSources.length === 0 || selectedSources.includes(k.source);
            const matchesType = selectedTypes.length === 0 || selectedTypes.includes(k.group);
            return matchesSearch && matchesAuth && matchesSource && matchesType;
        });
    }, [kinds, search, selectedAuthorities, selectedSources, selectedTypes]);

    const groupedKinds = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredKinds.forEach(k => {
            if (!groups[k.group]) groups[k.group] = [];
            groups[k.group].push(k);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [filteredKinds]);

    const toggleFacet = (list: string[], setList: (v: string[]) => void, value: string) => {
        setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    };

    const toggleGroup = (group: string) => {
        setCollapsedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
    };

    return (
        <div className="h-full flex overflow-hidden bg-muted/5 animate-in fade-in duration-500">
            {/* FACET SIDEBAR - HIGH CONTRAST */}
            <aside className="w-72 border-r border-border/40 bg-card flex flex-col shrink-0 shadow-lg z-20">
                <div className="p-6 border-b border-border/10 bg-muted/5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Technical Registry</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={onRefresh}>
                            <RefreshCw size={14} className={cn(isLoading && "animate-spin text-primary")} />
                        </Button>
                    </div>
                    <div className="relative group">
                        <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Filter registry..." 
                            className="h-10 pl-10 pr-3 rounded-xl bg-background border-border/40 focus:border-primary/60 text-[13px] font-medium shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        {/* Authority Facet */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
                                <Globe size={12} /> Authority Domains
                            </h4>
                            <div className="space-y-1.5">
                                {facets.authorities.map(a => (
                                    <div key={a} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted group cursor-pointer transition-all border border-transparent hover:border-border/10" onClick={() => toggleFacet(selectedAuthorities, setSelectedAuthorities, a)}>
                                        <Checkbox checked={selectedAuthorities.includes(a)} className="h-4.5 w-4.5 rounded-md border-border/40" />
                                        <span className={cn("text-[13px] font-bold transition-colors", selectedAuthorities.includes(a) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{a}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator className="opacity-10" />

                        {/* Data Type Facet */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 px-1">
                                <Box size={12} /> Entity Groups
                            </h4>
                            <div className="space-y-1.5">
                                {facets.types.map(t => (
                                    <div key={t} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted group cursor-pointer transition-all border border-transparent hover:border-border/10" onClick={() => toggleFacet(selectedTypes, setSelectedTypes, t)}>
                                        <Checkbox checked={selectedTypes.includes(t)} className="h-4.5 w-4.5 rounded-md border-border/40" />
                                        <span className={cn("text-[13px] font-bold transition-colors truncate", selectedTypes.includes(t) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{t}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {(selectedAuthorities.length > 0 || selectedTypes.length > 0) && (
                    <div className="p-4 border-t border-border/10 bg-primary/5">
                        <Button variant="ghost" size="sm" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 text-primary" onClick={() => { setSelectedAuthorities([]); setSelectedSources([]); setSelectedTypes([]); }}>
                            <X size={14} /> Clear All Facets
                        </Button>
                    </div>
                )}
            </aside>

            {/* MAIN REGISTRY VIEWPORT */}
            <main className="flex-1 flex flex-col min-w-0 bg-background/20 relative">
                <div className="px-10 py-3 border-b border-border/40 bg-card flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-2">
                            <Layers size={16} /> Schema Definition Index
                        </span>
                        <Badge variant="outline" className="h-6 px-3 border-border/60 bg-background text-[11px] font-black text-foreground">
                            {filteredKinds.length} ENTITY TYPES
                        </Badge>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-10 max-w-7xl mx-auto w-full space-y-12 pb-32">
                        {groupedKinds.map(([group, items], idx) => (
                            <div key={group || `group-${idx}`} className="space-y-6">
                                <div className="flex items-center gap-4 px-1 cursor-pointer group select-none" onClick={() => toggleGroup(group)}>
                                    <div className="flex items-center gap-4">
                                        <div className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-foreground border border-border/40 group-hover:border-primary/40 group-hover:text-primary transition-all shadow-md">
                                            {collapsedGroups.includes(group) ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                        <h4 className="text-base font-black uppercase tracking-[0.2em] text-foreground/80 group-hover:text-primary transition-colors">{group}</h4>
                                        <Badge variant="secondary" className="bg-muted text-foreground text-[11px] font-black h-6 px-3 shadow-sm">{items.length}</Badge>
                                    </div>
                                    <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                                </div>

                                <AnimatePresence initial={false}>
                                    {!collapsedGroups.includes(group) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeOut" }} className="overflow-hidden"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                                                {items.map((k) => (
                                                    <motion.div 
                                                        key={k.full_kind} 
                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        onClick={() => onSelectKind(k.full_kind)}
                                                        className="group p-6 rounded-[2.5rem] bg-card border border-border/40 hover:border-primary/40 hover:shadow-2xl transition-all cursor-pointer flex flex-col gap-5 relative overflow-hidden shadow-md ring-1 ring-white/5"
                                                    >
                                                        <div className="flex items-start justify-between gap-6">
                                                            <div className="h-14 w-14 rounded-2xl bg-muted/20 border border-border/10 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                                                                <Database size={28} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h5 className="font-black text-lg truncate text-foreground tracking-tight leading-none mb-2">{k.entity_name}</h5>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[11px] font-mono text-muted-foreground/60 truncate tracking-tight" title={k.full_kind}>{k.full_kind}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className="text-[10px] font-black border-border/60 bg-muted/30 h-6 px-3 uppercase tracking-widest text-foreground">{k.source}</Badge>
                                                                <span className="text-[11px] font-black text-muted-foreground/80 uppercase tracking-widest">v{k.version}</span>
                                                            </div>
                                                            <div className="text-[11px] font-black text-primary uppercase tracking-[0.2em] group-hover:translate-x-1 transition-all flex items-center gap-2">
                                                                Discovery <ChevronRight size={14} />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}

                        {groupedKinds.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center text-center py-48 space-y-8 opacity-40">
                                <div className="h-32 w-32 rounded-[3.5rem] border-2 border-dashed border-muted-foreground flex items-center justify-center shadow-inner">
                                    <FileType size={64} strokeWidth={1} />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-black text-3xl tracking-tighter uppercase text-foreground">Registry Empty</p>
                                    <p className="text-sm font-bold uppercase tracking-[0.2em] max-w-sm text-muted-foreground">No schema definitions match your current partition filters.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
};
