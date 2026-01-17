import React from 'react';
import { 
    Globe, Shield, Database, ChevronDown, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface FilterToolbarProps {
    sources: string[];
    authorities: string[];
    entityTypes: string[];
    selectedSource: string | null;
    selectedAuthority: string | null;
    selectedEntityType: string | null;
    onSelectSource: (s: string | null) => void;
    onSelectAuthority: (a: string | null) => void;
    onSelectEntityType: (t: string | null) => void;
    onClearAll: () => void;
}

export const FilterToolbar = ({
    sources,
    authorities,
    entityTypes,
    selectedSource,
    selectedAuthority,
    selectedEntityType,
    onSelectSource,
    onSelectAuthority,
    onSelectEntityType,
    onClearAll
}: FilterToolbarProps) => {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 gap-2 rounded-lg border-dashed", selectedSource && "border-primary bg-primary/5 text-primary border-solid")}>
                        <Globe className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{selectedSource || "Source"}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1 max-h-80 overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Filter by Source</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sources.map(s => (
                        <DropdownMenuItem key={s} onClick={() => onSelectSource(s === selectedSource ? null : s)} className="gap-2">
                            <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", s === selectedSource ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                                {s === selectedSource && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <span className="truncate">{s}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 gap-2 rounded-lg border-dashed", selectedAuthority && "border-primary bg-primary/5 text-primary border-solid")}>
                        <Shield className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{selectedAuthority || "Authority"}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1 max-h-80 overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Filter by Authority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {authorities.map(a => (
                        <DropdownMenuItem key={a} onClick={() => onSelectAuthority(a === selectedAuthority ? null : a)} className="gap-2">
                            <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", a === selectedAuthority ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                                {a === selectedAuthority && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <span className="truncate">{a}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 gap-2 rounded-lg border-dashed", selectedEntityType && "border-primary bg-primary/5 text-primary border-solid")}>
                        <Database className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{selectedEntityType || "Entity Type"}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1 max-h-80 overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Filter by Entity Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {entityTypes.map(t => (
                        <DropdownMenuItem key={t} onClick={() => onSelectEntityType(t === selectedEntityType ? null : t)} className="gap-2">
                            <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", t === selectedEntityType ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                                {t === selectedEntityType && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <span className="truncate">{t}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {(selectedSource || selectedAuthority || selectedEntityType) && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClearAll} 
                    className="h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-2"
                >
                    <X className="h-3.5 w-3.5" />
                    <span className="text-xs">Reset</span>
                </Button>
            )}
        </div>
    );
};
