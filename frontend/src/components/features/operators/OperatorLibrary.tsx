import React, { useState, useMemo } from 'react';
import {
    Search, ArrowRightLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type OperatorDef, OPERATORS } from '@/types/operator';
import { OperatorDetailDialog } from './OperatorDetailDialog';

export const OperatorLibrary: React.FC = () => {
    const [selectedOp, setSelectedOp] = useState<OperatorDef | null>(null);
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState<string | null>(null);

    const filtered = useMemo(() => OPERATORS.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory ? t.category === filterCategory : true;
        return matchesSearch && matchesCategory;
    }), [search, filterCategory]);

    const categories = useMemo(() => Array.from(new Set(OPERATORS.map(t => t.category))), []);

    return (
        <div className="flex flex-col h-full w-full">
            {/* --- Toolbar --- */}
            <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                {/* Search */}
                <div className="relative w-full md:max-w-md group">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                    <Input
                        placeholder="Search operators..."
                        className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1 bg-muted/50 border border-border/40 rounded-2xl p-1.5 shadow-inner overflow-x-auto max-w-full scrollbar-none">
                    <Button
                        variant={filterCategory === null ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilterCategory(null)}
                        className={cn(
                            "rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-wider transition-all",
                            filterCategory === null ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        All
                    </Button>
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={filterCategory === cat ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilterCategory(cat)}
                            className={cn(
                                "rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                filterCategory === cat
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* --- Grid Content --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((op, idx) => (
                            <motion.div
                                key={op.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2, delay: idx * 0.01 }}
                                onClick={() => setSelectedOp(op)}
                                className="group relative flex flex-col rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-md p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer h-full"
                            >
                                {/* Hover Glow */}
                                <div className={cn("absolute -right-10 -top-10 h-32 w-32 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500", op.color.split(' ')[0].replace('text-', 'bg-'))} />

                                <div className="flex items-start justify-between mb-5 relative z-10">
                                    <div className={cn("p-3 rounded-2xl border transition-all duration-300 group-hover:scale-110 shadow-sm", op.color)}>
                                        <op.icon size={22} strokeWidth={2.5} />
                                    </div>
                                    <Badge variant="outline" className="rounded-lg text-[9px] px-2 py-0.5 border-border/60 font-black uppercase tracking-widest bg-background/50">
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
                    </AnimatePresence>
                </div>
            </div>

            <OperatorDetailDialog 
                selectedOp={selectedOp} 
                open={!!selectedOp} 
                onOpenChange={(open) => !open && setSelectedOp(null)} 
            />
        </div>
    );
};