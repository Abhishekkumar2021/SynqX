import React, { useState, useMemo } from 'react';
import { Layers, Search, Database, Globe, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KindSidebarProps {
    kinds: any[];
    selectedKind: string | null;
    onSelectKind: (kind: string | null) => void;
    isLoading: boolean;
    onRefresh: () => void;
}

export const KindSidebar: React.FC<KindSidebarProps> = ({
    kinds,
    selectedKind,
    onSelectKind,
    isLoading,
    onRefresh
}) => {
    const [search, setSearch] = useState('');

    const filteredKinds = useMemo(() => {
        return kinds.filter(k => 
            k.full_kind.toLowerCase().includes(search.toLowerCase()) ||
            k.entity_name.toLowerCase().includes(search.toLowerCase())
        );
    }, [kinds, search]);

    return (
        <div className="h-full flex flex-col bg-muted/5">
            <div className="p-5 border-b border-border/10 bg-muted/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                        <Layers size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 leading-none">Catalog</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Registry</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
                    <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                </Button>
            </div>

            <div className="p-4 shrink-0">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                    <Input 
                        placeholder="Search kinds..." 
                        className="h-10 pl-10 text-xs bg-background/50 border-border/40 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 px-3 pb-6">
                <div className="space-y-1">
                    <button 
                        onClick={() => onSelectKind(null)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group border mb-2",
                            !selectedKind ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "hover:bg-muted border-transparent"
                        )}
                    >
                        <Globe size={14} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Universal Search</span>
                    </button>

                    {filteredKinds.map((kind) => (
                        <button 
                            key={kind.full_kind} 
                            onClick={() => onSelectKind(kind.full_kind)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left mb-1 transition-all border",
                                selectedKind === kind.full_kind ? "bg-primary text-primary-foreground shadow-lg border-primary shadow-primary/20" : "hover:bg-muted border-transparent group"
                            )}
                        >
                            <Database size={14} className={selectedKind === kind.full_kind ? "text-primary-foreground" : "text-muted-foreground opacity-40"} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold truncate">{kind.entity_name}</span>
                                <span className={cn("text-[8px] font-black uppercase opacity-40 tracking-tighter", selectedKind === kind.full_kind && "text-primary-foreground/60")}>{kind.group}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
