import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { 
  Database, FileText, Globe, Table, Server, 
  HardDrive, Cloud, LayoutGrid, Code, MoreHorizontal,
  Clock,
  Search
} from 'lucide-react';
import { cn, formatNumber, formatBytes } from '@/lib/utils';
import type { LineageNode } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const AssetIcon = ({ type, className }: { type: string, className?: string }) => {
  const t = type.toLowerCase();
  
  // Cloud / Warehouses
  if (t.includes('snowflake')) return <Cloud className={cn("text-blue-400", className)} />;
  if (t.includes('bigquery')) return <Search className={cn("text-green-500", className)} />; // Placeholder
  if (t.includes('redshift')) return <Database className={cn("text-purple-500", className)} />;
  
  // Databases
  if (t.includes('postgres')) return <Database className={cn("text-blue-500", className)} />;
  if (t.includes('mysql')) return <Database className={cn("text-orange-500", className)} />;
  if (t.includes('mongo')) return <Database className={cn("text-green-600", className)} />;
  
  // Files
  if (t.includes('s3') || t.includes('aws')) return <HardDrive className={cn("text-orange-400", className)} />;
  if (t.includes('gcs') || t.includes('google')) return <HardDrive className={cn("text-blue-500", className)} />;
  if (t.includes('csv')) return <FileText className={cn("text-green-500", className)} />;
  if (t.includes('json')) return <Code className={cn("text-yellow-500", className)} />;
  if (t.includes('parquet')) return <LayoutGrid className={cn("text-blue-400", className)} />;
  
  // APIs
  if (t.includes('api') || t.includes('http')) return <Globe className={cn("text-primary", className)} />;
  
  return <Table className={cn("text-muted-foreground", className)} />;
};

import { formatDistanceToNow } from 'date-fns';

// ... (AssetIcon definition remains same)

export const AssetNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as LineageNode['data'] & { label: string };
  const { label, connection_type, fqn, last_updated } = nodeData;
  
  // Safely parse numbers, preserving 0
  const row_count = (nodeData.row_count !== undefined && nodeData.row_count !== null) ? Number(nodeData.row_count) : null;
  const size_bytes = (nodeData.size_bytes !== undefined && nodeData.size_bytes !== null) ? Number(nodeData.size_bytes) : null;
  
  // Placeholder status logic (would come from real data in production)
  const status = 'active'; // 'active' | 'stale' | 'error'

  return (
    <div className={cn(
      "group relative min-w-[280px] max-w-[320px] rounded-xl border transition-all duration-300 backdrop-blur-2xl overflow-hidden",
      selected 
        ? "bg-background/80 border-primary ring-1 ring-primary/30 shadow-2xl shadow-primary/10 scale-105 z-50" 
        : "bg-card/40 border-border/40 hover:border-border/80 hover:bg-card/60 hover:shadow-lg hover:-translate-y-1"
    )}>
      {/* Selection Glow */}
      {selected && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      )}

      {/* Connection Handles - Custom Styled */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className={cn(
          "!h-3.5 !w-3.5 !-left-[9px] !bg-muted-foreground !border-4 !border-background transition-all duration-300",
          selected ? "!bg-primary !border-primary/20" : "group-hover:!bg-primary"
        )} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className={cn(
          "!h-3.5 !w-3.5 !-right-[9px] !bg-muted-foreground !border-4 !border-background transition-all duration-300",
          selected ? "!bg-primary !border-primary/20" : "group-hover:!bg-primary"
        )} 
      />

      {/* Header Section */}
      <div className="p-3.5 flex items-start gap-3 border-b border-border/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className={cn(
          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border shadow-sm transition-colors bg-background/50",
          selected ? "border-primary/30" : "border-border/40 group-hover:border-primary/20"
        )}>
          <AssetIcon type={connection_type || 'generic'} className="h-5 w-5" />
        </div>
        
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 truncate">
              {connection_type || 'Unknown Source'}
            </span>
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === 'active' ? "bg-emerald-500 shadow-[0_0_4px_currentColor]" : "bg-muted-foreground"
            )} />
          </div>
          <div className="font-bold text-sm text-foreground truncate leading-tight" title={label as string}>
            {label as string}
          </div>
        </div>
      </div>

      {/* Metadata Body */}
      <div className="p-3.5 space-y-3">
        {fqn && (
           <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 border border-border/20 text-xs text-muted-foreground/80 group-hover:bg-muted/50 transition-colors">
             <Server className="h-3 w-3 opacity-60 shrink-0" />
             <span className="truncate font-mono text-[10px]" title={fqn}>{fqn}</span>
           </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
           <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-muted/20 border border-border/10">
             <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Size</span>
             <div className="flex items-center gap-1.5">
               <HardDrive className="h-3 w-3 text-primary/70" /> 
               <span className="text-xs font-semibold capitalize truncate">
                 {size_bytes !== undefined && size_bytes !== null ? formatBytes(size_bytes) : '—'}
               </span>
             </div>
           </div>
           
           <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-muted/20 border border-border/10">
             <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Rows</span>
             <div className="flex items-center gap-1.5">
               <Table className="h-3 w-3 text-primary/70" />
               <span className="text-xs font-mono font-semibold truncate">
                 {row_count !== undefined && row_count !== null ? formatNumber(row_count) : '—'}
               </span>
             </div>
           </div>
        </div>
      </div>

      {/* Footer Actions (Visible on Hover/Select) */}
      <div className={cn(
        "px-3.5 pb-3.5 pt-0 flex items-center justify-between transition-all duration-300",
        selected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 h-0 overflow-hidden pb-0 group-hover:opacity-100 group-hover:translate-y-0 group-hover:h-auto group-hover:pb-3.5"
      )}>
        {last_updated ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-background/50 border-border/40 text-muted-foreground">
            <Clock className="h-2.5 w-2.5 mr-1" /> {formatDistanceToNow(new Date(last_updated), { addSuffix: true })}
            </Badge>
        ) : (
            <span /> 
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
