import React from 'react';
import { 
    Shield, Globe, Database, History, ArrowRight 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { OSDUKind } from '../types';

interface RichKindCardProps { 
    kind: OSDUKind;
    selected: boolean; 
    onSelect: () => void;
    onClick: () => void;
}

export const RichKindCard = ({ 
    kind, 
    selected, 
    onSelect, 
    onClick 
}: RichKindCardProps) => {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                selected ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-card/40 border-border/40 hover:bg-muted/10 hover:border-border/80"
            )}
        >
            <div className="flex items-center self-stretch" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                    checked={selected}
                    onCheckedChange={() => onSelect()}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
            </div>
            
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Main Identity */}
                <div className="col-span-1 md:col-span-5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {kind.metadata?.entity_name || kind.name}
                        </h4>
                        <Badge variant="outline" className="text-[9px] h-5 font-mono px-1.5 bg-background/50 text-muted-foreground border-border/60">
                            {kind.metadata?.version || '1.0.0'}
                        </Badge>
                    </div>
                    <code className="text-[10px] text-muted-foreground/60 bg-muted/20 px-2 py-0.5 rounded-md truncate font-mono w-fit max-w-full">
                        {kind.name}
                    </code>
                </div>

                {/* Metadata Column 1 */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Shield className="h-3 w-3 opacity-50" />
                        <span className="truncate">{kind.metadata?.authority || 'Unknown Auth'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Globe className="h-3 w-3 opacity-50" />
                        <span className="truncate">{kind.metadata?.source || 'Unknown Source'}</span>
                    </div>
                </div>

                {/* Metadata Column 2 */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <Badge variant="secondary" className="w-fit text-[10px] font-bold h-5 bg-muted/50 text-muted-foreground">
                        {kind.metadata?.entity_type || 'Entity'}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
                        <History className="h-3 w-3" /> Latest
                    </div>
                </div>

                {/* Stats */}
                <div className="col-span-1 md:col-span-2 flex flex-col items-end justify-center gap-1">
                    <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-mono font-bold text-sm">{kind.rows?.toLocaleString() || 0}</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">Records</span>
                </div>
            </div>

            <div className="hidden group-hover:flex absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm p-1 rounded-full shadow-sm border border-border/20">
                <ArrowRight className="h-4 w-4 text-primary" />
            </div>
        </div>
    );
};
