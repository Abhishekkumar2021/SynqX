/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
    Table as TableIcon, Eye, FileText, Database, Code, FileCode, Workflow, Layers, Terminal, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DiscoveredAssetCardProps {
    asset: any;
    selected: boolean;
    onSelect: (checked: boolean) => void;
}

const getAssetIcon = (type: string) => {
    const t = (type || 'table').toLowerCase();
    if (t.includes('table')) return <TableIcon className="h-5 w-5" />;
    if (t.includes('view')) return <Eye className="h-5 w-5" />;
    if (t.includes('collection')) return <Layers className="h-5 w-5" />;
    if (t.includes('file') || t.includes('csv') || t.includes('json')) return <FileText className="h-5 w-5" />;
    if (t.includes('query')) return <Code className="h-5 w-5" />;
    if (t.includes('script') || t.includes('python') || t.includes('javascript') || t.includes('ruby') || t.includes('perl')) return <FileCode className="h-5 w-5" />;
    if (t.includes('powershell')) return <Terminal className="h-5 w-5" />;
    if (t.includes('stream') || t.includes('kafka') || t.includes('rabbitmq')) return <Workflow className="h-5 w-5" />;
    return <Database className="h-5 w-5" />;
};

export const DiscoveredAssetCard: React.FC<DiscoveredAssetCardProps> = ({ 
    asset, 
    selected,
    onSelect
}) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group relative rounded-2xl border p-4 transition-all hover:shadow-lg flex flex-col gap-3 cursor-pointer",
                selected 
                    ? "border-amber-500 bg-amber-500/5 shadow-amber-500/10" 
                    : "border-border/40 bg-background/40 backdrop-blur-xl hover:border-amber-500/40"
            )}
            onClick={() => onSelect(!selected)}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "p-3 rounded-xl ring-1 transition-transform group-hover:scale-110",
                        selected 
                            ? "bg-amber-500/20 text-amber-600 ring-amber-500/30" 
                            : "bg-muted/50 text-muted-foreground ring-border/20 group-hover:bg-amber-500/10 group-hover:text-amber-600 group-hover:ring-amber-500/20"
                    )}>
                        {getAssetIcon(asset.type || asset.asset_type)}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">
                            {asset.name}
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider h-4 px-1 bg-background/50">
                                {asset.type || asset.asset_type || 'table'}
                            </Badge>
                            <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                        </div>
                    </div>
                </div>

                <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => onSelect(Boolean(checked))}
                    className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {asset.fully_qualified_name && asset.fully_qualified_name !== asset.name && (
                <div className="px-2 py-1.5 rounded-lg bg-muted/10 border border-border/10">
                    <span className="text-[9px] text-muted-foreground/60 font-mono truncate block" title={asset.fully_qualified_name}>
                        {asset.fully_qualified_name}
                    </span>
                </div>
            )}
            
            <div className="mt-auto pt-1 flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Discovered</span>
                <span className="text-amber-600">New Potential</span>
            </div>
        </motion.div>
    );
};
