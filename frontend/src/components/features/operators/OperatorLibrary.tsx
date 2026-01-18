import React, { useMemo } from 'react';
import {
    Search, ArrowRightLeft, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewToggle, type ViewMode } from '@/components/common/ViewToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type OperatorDef, OPERATORS } from '@/types/operator';
import { OperatorDetailDialog } from './OperatorDetailDialog';
import { useSearchParams } from 'react-router-dom';

export const OperatorLibrary: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // URL Synced State
    const search = searchParams.get('q') || '';
    const filterCategory = searchParams.get('category') || 'all';
    const viewMode = (searchParams.get('view') as ViewMode) || 'grid';
    const opParam = searchParams.get('op');

    // Derived State
    const selectedOp = useMemo(() => 
        opParam ? OPERATORS.find(o => o.type === opParam) || null : null
    , [opParam]);

    const setSearch = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('q', val);
            else next.delete('q');
            return next;
        });
    };

    const setFilterCategory = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val && val !== 'all') next.set('category', val);
            else next.delete('category');
            return next;
        });
    };

    const setViewMode = (val: ViewMode) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', val);
            return next;
        });
    };

    const handleSelectOp = (op: OperatorDef | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (op) next.set('op', op.type);
            else next.delete('op');
            return next;
        });
    };

    const filtered = useMemo(() => OPERATORS.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === "all" ? true : t.category === filterCategory;
        return matchesSearch && matchesCategory;
    }), [search, filterCategory]);

    const categories = useMemo(() => ["all", ...Array.from(new Set(OPERATORS.map(t => t.category)))], []);

    return (
        <div className="flex flex-col h-full w-full">
            {/* --- Toolbar --- */}
            <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col gap-4 shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                        <Input
                            placeholder="Search operators..."
                            className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                    </div>
                </div>

                {/* Tabs Filter */}
                <Tabs value={filterCategory} onValueChange={setFilterCategory} className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto no-scrollbar bg-muted/30 border border-border/40 h-10 p-1">
                        {categories.map(cat => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className="px-4 text-[11px] font-bold uppercase tracking-wider"
                            >
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* --- Content Area --- */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20"
                        >
                            {filtered.map((op, idx) => (
                                <motion.div
                                    key={op.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2, delay: idx * 0.01 }}
                                    onClick={() => handleSelectOp(op)}
                                    className="group relative flex flex-col rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-md p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer h-full"
                                >
                                    {/* Hover Glow */}
                                    <div className={cn("absolute -right-10 -top-10 h-32 w-32 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500", op.color.split(' ')[0].replace('text-', 'bg-'))} />

                                    <div className="flex items-start justify-between mb-5 relative z-10">
                                        <div className={cn("p-3 rounded-2xl border transition-all duration-300 group-hover:scale-110 shadow-sm", op.color)}>
                                            <op.icon size={22} strokeWidth={2.5} />
                                        </div>
                                        <Badge variant="outline" className="rounded-lg text-[9px] px-2 py-0.5 border-border/60 font-bold uppercase tracking-widest bg-background/50">
                                            {op.category}
                                        </Badge>
                                    </div>

                                    <div className="relative z-10 flex-1 flex flex-col gap-2">
                                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors tracking-tight">{op.name}</h3>
                                        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3 font-medium">{op.description}</p>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <span>{op.type}</span>
                                        <div className="flex items-center gap-1 text-primary">
                                            Inspect <ArrowRightLeft size={10} className="-rotate-45" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-2 pb-20"
                        >
                            {/* List Header */}
                            <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 bg-muted/10 rounded-t-xl">
                                <div className="col-span-4">Operator</div>
                                <div className="col-span-2 text-center">Category</div>
                                <div className="col-span-2 text-center">Type</div>
                                <div className="col-span-3">Description</div>
                                <div className="col-span-1 text-right">Action</div>
                            </div>
                            
                            {filtered.map((op, idx) => (
                                <motion.div
                                    key={op.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.01 }}
                                    onClick={() => handleSelectOp(op)}
                                    className="grid grid-cols-12 items-center px-6 py-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 transition-all cursor-pointer group"
                                >
                                    <div className="col-span-4 flex items-center gap-4">
                                        <div className={cn("p-1.5 rounded-lg border", op.color)}>
                                            <op.icon size={16} strokeWidth={2.5} />
                                        </div>
                                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{op.name}</span>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <Badge variant="outline" className="rounded-lg text-[9px] px-2 py-0.5 border-border/60 font-bold uppercase tracking-widest bg-background/50">
                                            {op.category}
                                        </Badge>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{op.type}</span>
                                    </div>
                                    <div className="col-span-3">
                                        <p className="text-xs text-muted-foreground font-medium truncate">{op.description}</p>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/10 group-hover:text-primary">
                                            <Info size={16} />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 rounded-full bg-muted/20 mb-4">
                            <Search className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No operators found</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                            We couldn't find any operators matching your current search and filter criteria.
                        </p>
                        <Button 
                            variant="link" 
                            className="mt-4 text-primary font-bold"
                            onClick={() => {
                                setSearch("");
                                setFilterCategory("all");
                            }}
                        >
                            Clear all filters
                        </Button>
                    </div>
                )}
            </div>

            <OperatorDetailDialog 
                selectedOp={selectedOp} 
                open={!!selectedOp} 
                onOpenChange={(open) => !open && handleSelectOp(null)} 
            />
        </div>
    );
};