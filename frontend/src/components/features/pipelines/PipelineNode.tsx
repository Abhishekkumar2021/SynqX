import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
    Database, ArrowRightLeft, HardDriveUpload, Server,
    Settings2, Loader2, Layers, ShieldCheck, 
    Zap, Activity, Clock, Info, CheckCircle2, AlertCircle,
    ChevronRight, Terminal
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

// --- Visual Mapping ---
const NODE_CONFIG: Record<string, { icon: React.ElementType, colorVar: string, label: string }> = {
    source: { icon: Database, colorVar: "chart-1", label: "Source" },
    transform: { icon: ArrowRightLeft, colorVar: "chart-3", label: "Transform" },
    join: { icon: Layers, colorVar: "chart-5", label: "Join" },
    validate: { icon: ShieldCheck, colorVar: "chart-4", label: "Validate" },
    sink: { icon: HardDriveUpload, colorVar: "chart-2", label: "Sink" },
    api: { icon: Server, colorVar: "chart-4", label: "API" },
    default: { icon: Settings2, colorVar: "primary", label: "Node" },
};

const PipelineNode = ({ data, selected }: NodeProps) => {
    const nodeData = data as any;
    const type = nodeData.type || 'default';
    const config = NODE_CONFIG[type] || NODE_CONFIG.default;
    const Icon = config.icon;

    const status = nodeData.status || 'idle';
    const isRunning = status === 'running';
    const isError = ['failed', 'error'].includes(status);
    const isSuccess = ['success', 'completed'].includes(status);
    const isWarning = status === 'warning';

    // Theme Styles Helper - Simplified
    const getThemeStyles = (colorVar: string) => {
        switch (colorVar) {
            case 'chart-1': return { text: "text-chart-1", bg: "bg-chart-1/10", border: "border-chart-1/20" };
            case 'chart-2': return { text: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/20" };
            case 'chart-3': return { text: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/20" };
            case 'chart-4': return { text: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/20" };
            case 'chart-5': return { text: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/20" };
            default: return { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };
        }
    };

    const themeStyles = getThemeStyles(config.colorVar);

    return (
        <div
            className={cn(
                "group relative flex w-[340px] flex-col rounded-[2.5rem] transition-all duration-500 ease-out border-2",
                "bg-card text-card-foreground shadow-xl",
                selected 
                    ? "ring-2 ring-primary ring-offset-4 ring-offset-background scale-[1.02] z-50 shadow-[0_0_50px_rgba(var(--primary),0.1)] border-primary/50" 
                    : "border-border/40 hover:border-border-strong",
                
                isError && "border-destructive/40",
                isRunning && "border-primary/50 scale-[1.02] z-50",
            )}
        >
            {/* Content Wrapper to maintain internal clipping */}
            <div className="flex flex-col w-full h-full rounded-[2.35rem] overflow-hidden">
                {/* --- Header Section --- */}
                <div className={cn(
                    "flex items-center gap-4 p-6 pb-5 relative z-10 border-b border-border/5",
                    isRunning && "bg-primary/[0.02]"
                )}>
                    <div className="relative shrink-0">
                        <div className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-[1.25rem] border-2 transition-all duration-500 shadow-sm",
                            isRunning ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-110" : 
                                       "bg-muted/30 text-muted-foreground border-border/40 group-hover:border-border-strong",
                            !isRunning && themeStyles.text
                        )}>
                            {isRunning ? <Loader2 className="h-7 w-7 animate-spin" /> : <Icon className="h-7 w-7" />}
                        </div>
                        {isSuccess && (
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-card shadow-lg">
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                        )}
                        {isError && (
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-destructive rounded-full flex items-center justify-center ring-4 ring-card shadow-lg">
                                <AlertCircle className="h-3.5 w-3.5 text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-1 flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border backdrop-blur-md shadow-xs",
                                isRunning ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-border/40 text-muted-foreground"
                            )}>
                                {config.label}
                            </span>
                        </div>
                        <span className="text-[15px] font-bold tracking-tight text-foreground whitespace-normal break-words leading-[1.2]">
                            {nodeData.label}
                        </span>
                    </div>
                </div>

                {/* --- Metrics Section --- */}
                {(!['idle', 'pending'].includes(status) || (nodeData.rowsProcessed && nodeData.rowsProcessed > 0) || (nodeData.duration && nodeData.duration > 0)) ? (
                    <div className="p-6 pt-5 space-y-5 relative z-10">
                        {((nodeData.throughput && nodeData.throughput > 0) || (nodeData.rowsProcessed && nodeData.rowsProcessed > 0)) ? (
                            <div className="grid grid-cols-2 gap-3">
                                {nodeData.throughput && nodeData.throughput > 0 ? (
                                    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-muted/20 border border-border/40 shadow-inner group/metric transition-colors hover:bg-muted/30">
                                        <div className="flex items-center gap-2 text-muted-foreground/60">
                                            <Activity className="h-3 w-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Velocity</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-black tabular-nums text-foreground group-hover/metric:text-primary transition-colors">
                                                {formatNumber(nodeData.throughput)}
                                            </span>
                                            <span className="text-[10px] font-bold opacity-40">ops/s</span>
                                        </div>
                                    </div>
                                ) : null}
                                
                                {nodeData.rowsProcessed && nodeData.rowsProcessed > 0 ? (
                                    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner group/metric transition-colors hover:bg-primary/10">
                                        <div className="flex items-center gap-2 text-primary/60">
                                            <Layers className="h-3 w-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Dataset</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-black tabular-nums text-primary">
                                                {formatNumber(nodeData.rowsProcessed)}
                                            </span>
                                            <span className="text-[10px] font-bold opacity-40 text-primary/60">rows</span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Status Strip */}
                        <div className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-500 shadow-xs",
                            isRunning && "bg-primary/5 border-primary/20 text-primary shadow-inner",
                            isSuccess && "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                            isError && "bg-destructive/5 border-destructive/20 text-destructive",
                            isWarning && "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400",
                            !isRunning && !isSuccess && !isError && !isWarning && "bg-muted/30 border-border/20 text-muted-foreground"
                        )}>
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "h-2 w-2 rounded-full",
                                    isRunning ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" : "bg-current opacity-60"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                                    {isRunning ? "Active" : status}
                                </span>
                            </div>
                            {nodeData.duration && nodeData.duration > 0 ? (
                                <div className="flex items-center gap-1.5 bg-background/40 backdrop-blur-md px-2 py-1 rounded-lg border border-border/5">
                                    <Clock className="h-3 w-3 opacity-40" />
                                    <span className="text-[10px] font-bold tabular-nums opacity-70">
                                        {(nodeData.duration / 1000).toFixed(2)}s
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        {/* Error Box with Smart Truncation */}
                        {isError && nodeData.error && (
                            <div className="p-4 rounded-2xl bg-destructive/5 border-2 border-destructive/10 animate-in slide-in-from-top-2 duration-500 group/error">
                                <div className="flex items-center gap-2 text-destructive mb-2.5">
                                    <Zap className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">Execution Fault</span>
                                </div>
                                
                                {nodeData.error.length > 140 ? (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <pre className="text-[10px] font-mono p-3 bg-black/5 dark:bg-black/40 rounded-xl overflow-x-auto custom-scrollbar max-h-32 whitespace-pre-wrap break-all text-destructive/80 leading-relaxed ring-1 ring-inset ring-destructive/10 font-medium">
                                                {nodeData.error}
                                            </pre>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 py-1">
                                            <Terminal className="h-3 w-3 opacity-40" />
                                            <span className="text-[9px] font-bold opacity-50 uppercase tracking-tight">
                                                Inspect job logs for full trace
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] font-bold leading-relaxed text-destructive/90 break-words pl-1 border-l-2 border-destructive/20 ml-1">
                                        {nodeData.error}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* --- Stylized Connection Handles --- */}
            {type !== 'source' && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-4 !h-12 !rounded-full !bg-background !border-2 !border-border/40 !-left-[10px] hover:!border-primary hover:!scale-110 transition-all shadow-xl z-50"
                />
            )}
            {type !== 'sink' && type !== 'destination' && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-4 !h-12 !rounded-full !bg-background !border-2 !border-border/40 !-right-[10px] hover:!border-primary hover:!scale-110 transition-all shadow-xl z-50"
                />
            )}
        </div>
    );
};

export default memo(PipelineNode);