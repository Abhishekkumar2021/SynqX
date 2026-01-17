import React from 'react';
import { 
    Shield, Globe, Database, CheckCircle2, Loader2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type Asset } from '@/lib/api';
import { AssetTableRow } from '../../../AssetTableRow';

interface ManagedOSDUCardProps { 
    asset: Asset; 
    connectionId: number;
}

export const ManagedOSDUCard = ({ 
    asset, 
    connectionId
}: ManagedOSDUCardProps) => {
    // Helper to safely access nested metadata
    const meta = asset.schema_metadata || {};
    const kindName = meta.osdu_kind || asset.fully_qualified_name || asset.name;
    const [authority, source, entityType, version] = kindName.split(':').length === 4 
        ? kindName.split(':') 
        : [meta.authority || 'Unknown', meta.source || 'Unknown', meta.entity_type || 'Entity', meta.version || '1.0.0'];

    return (
        <div 
            className="group relative flex items-center gap-4 p-4 rounded-2xl border bg-card/40 border-border/40 hover:bg-muted/10 hover:border-border/80 transition-all"
        >
            {/* Status Indicator Stripe */}
            <div className={cn(
                "absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-all",
                asset.current_schema_version ? "bg-emerald-500/50" : "bg-amber-500/50"
            )} />

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center pl-3">
                {/* Main Identity */}
                <div className="col-span-1 md:col-span-5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {asset.name}
                        </h4>
                        <Badge variant="outline" className="text-[9px] h-5 font-mono px-1.5 bg-background/50 text-muted-foreground border-border/60">
                            v{version}
                        </Badge>
                    </div>
                    <code className="text-[10px] text-muted-foreground/60 bg-muted/20 px-2 py-0.5 rounded-md truncate font-mono w-fit max-w-full">
                        {kindName}
                    </code>
                </div>

                {/* Metadata Column 1 */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Shield className="h-3 w-3 opacity-50" />
                        <span className="truncate">{authority}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Globe className="h-3 w-3 opacity-50" />
                        <span className="truncate">{source}</span>
                    </div>
                </div>

                {/* Metadata Column 2 */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <Badge variant="secondary" className="w-fit text-[10px] font-bold h-5 bg-muted/50 text-muted-foreground">
                        {entityType}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
                        {asset.current_schema_version ? (
                            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Active</span>
                        ) : (
                            <span className="flex items-center gap-1 text-amber-500"><Loader2 className="h-3 w-3 animate-spin" /> Discovery</span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="col-span-1 md:col-span-2 flex flex-col items-end justify-center gap-1">
                    <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-mono font-bold text-sm">
                            {asset.row_count_estimate ? asset.row_count_estimate.toLocaleString() : '—'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">Managed Rows</span>
                </div>
            </div>

            {/* Actions (Reuse AssetTableRow actions logic or simplify) */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <AssetTableRow asset={asset} connectionId={connectionId} minimal />
            </div>
        </div>
    );
};
