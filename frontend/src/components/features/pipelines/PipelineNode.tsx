 
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database, ArrowRightLeft, HardDriveUpload, Server,
    Settings2, Loader2, Layers, ShieldCheck, 
    Zap, Activity, Clock, CheckCircle2, AlertCircle,
    Terminal, ZoomIn, MoreVertical, Copy, Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/lib/utils';
import { type AppNode } from '@/types/pipeline';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

const PipelineNode = ({ id, data, selected }: NodeProps<AppNode>) => {
    const navigate = useNavigate();
    const nodeData = data;
    const type = nodeData.type || 'default';
    const config = NODE_CONFIG[type] || NODE_CONFIG.default;
    const Icon = config.icon;
    const isReadOnly = nodeData.readOnly || false;

    const status = nodeData.status || 'idle';
    const isRunning = status === 'running';
    const isError = ['failed', 'error'].includes(status);
    const isSuccess = ['success', 'completed'].includes(status);

    const diffStatus = nodeData.diffStatus || 'none';
    const isAdded = diffStatus === 'added';
    const isRemoved = diffStatus === 'removed';
    const isModified = diffStatus === 'modified';

    // Theme Styles Helper
    const getThemeStyles = (colorVar: string) => {
        switch (colorVar) {
            case 'chart-1': return { text: "text-chart-1", bg: "bg-chart-1/10", border: "border-chart-1/20", glow: "shadow-chart-1/20" };
            case 'chart-2': return { text: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/20", glow: "shadow-chart-2/20" };
            case 'chart-3': return { text: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/20", glow: "shadow-chart-3/20" };
            case 'chart-4': return { text: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/20", glow: "shadow-chart-4/20" };
            case 'chart-5': return { text: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/20", glow: "shadow-chart-5/20" };
            default: return { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", glow: "shadow-primary/20" };
        }
    };

    const themeStyles = getThemeStyles(config.colorVar);

    return (
        <div
            className={cn(
                "group relative flex flex-col rounded-[2.5rem] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-2",
                "bg-card/80 backdrop-blur-2xl text-card-foreground shadow-2xl",
                
                // Base Border & Aura Logic
                !selected && "border-border/40 hover:border-border-strong",
                selected && "ring-1 ring-primary/40 ring-offset-4 ring-offset-background scale-[1.02] z-50 border-primary/60",
                
                // State-aware Shadows (Aura)
                isRunning && "shadow-[0_0_40px_-10px_rgba(var(--primary),0.3)] border-primary/40",
                isError && "shadow-[0_0_40px_-10px_rgba(var(--destructive),0.3)] border-destructive/40",
                isSuccess && "shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)] border-emerald-500/40",

                isAdded && "border-emerald-500/50 shadow-[0_0_30px_-5px_rgba(16,185,129,0.25)]",
                isRemoved && "border-destructive/30 border-dashed opacity-50 grayscale",
                isModified && "border-amber-500/50 shadow-[0_0_30px_-5px_rgba(245,158,11,0.25)]",
            )}
        >
            {/* Subtle Inner Highlight */}
            <div className="absolute inset-0 rounded-[2.35rem] bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

            {/* Content Wrapper */}
            <div className="flex flex-col w-full h-full rounded-[2.35rem] overflow-hidden">
                {/* --- Header Section --- */}
                <div className={cn(
                    "flex items-center gap-4 p-6 pb-5 relative z-10 border-b border-border/5",
                    isRunning && "bg-primary/5"
                )}>
                    <div className="relative shrink-0">
                        <motion.div 
                            animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={cn(
                                "flex h-14 w-14 items-center justify-center rounded-3xl border-2 transition-all duration-500 shadow-xl",
                                isRunning ? "bg-primary text-primary-foreground border-primary shadow-primary/40" : 
                                           "bg-muted/30 text-muted-foreground border-border/40 group-hover:border-border-strong",
                                !isRunning && themeStyles.text
                            )}
                        >
                            {isRunning ? <Loader2 className="h-7 w-7 animate-spin" /> : <Icon className="h-7 w-7" />}
                        </motion.div>
                        
                        <AnimatePresence>
                            {isSuccess && (
                                <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-card shadow-lg z-20"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                </motion.div>
                            )}
                            {isError && (
                                <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="absolute -bottom-1 -right-1 h-6 w-6 bg-destructive rounded-full flex items-center justify-center ring-4 ring-card shadow-lg z-20"
                                >
                                    <AlertCircle className="h-3.5 w-3.5 text-white" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex flex-1 flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-lg border backdrop-blur-md shadow-sm",
                                isRunning ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-border/40 text-muted-foreground"
                            )}>
                                {config.label}
                            </span>
                            
                            {isRunning && (
                                <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                            )}

                            {/* --- Options Menu --- */}
                            <div className="ml-auto flex items-center gap-1">
                                {nodeData.sub_pipeline_id && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-md hover:bg-primary/10 text-primary transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/pipelines/${nodeData.sub_pipeline_id}`);
                                        }}
                                        title="Drill-down into Sub-Pipeline"
                                    >
                                        <ZoomIn size={12} />
                                    </Button>
                                )}
                                {!isReadOnly && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical size={14} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44 rounded-2xl bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl p-1.5 ring-1 ring-white/10">
                                            <DropdownMenuItem 
                                                className="text-[10px] font-bold uppercase tracking-widest gap-3 py-2.5 rounded-xl cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (nodeData.onSettings) nodeData.onSettings(id);
                                                }}
                                            >
                                                <Settings2 size={14} className="opacity-60" /> Node Settings
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                className="text-[10px] font-bold uppercase tracking-widest gap-3 py-2.5 rounded-xl cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (nodeData.onDuplicate) nodeData.onDuplicate(id);
                                                }}
                                            >
                                                <Copy size={14} className="opacity-60" /> Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border/40" />
                                            <DropdownMenuItem 
                                                className="text-[10px] font-bold uppercase tracking-widest gap-3 py-2.5 rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (nodeData.onDelete) nodeData.onDelete(id);
                                                }}
                                            >
                                                <Trash size={14} /> Delete Node
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground/90 whitespace-normal wrap-break-word leading-tight">
                            {nodeData.label}
                        </span>
                    </div>
                </div>

                {/* --- Metrics Section --- */}
                {(!['idle', 'pending'].includes(status) || (nodeData.rowsProcessed && nodeData.rowsProcessed > 0) || (nodeData.duration && nodeData.duration > 0)) ? (
                    <div className="p-6 pt-5 space-y-5 relative z-10 bg-gradient-to-b from-transparent to-muted/10">
                        {((nodeData.throughput && nodeData.throughput > 0) || (nodeData.rowsProcessed && nodeData.rowsProcessed > 0)) ? (
                            <div className="grid grid-cols-2 gap-4">
                                {nodeData.throughput && nodeData.throughput > 0 ? (
                                    <div className={cn(
                                        "flex flex-col gap-1.5 p-3.5 rounded-2xl border transition-all duration-500 shadow-sm",
                                        "bg-background/40 border-border/40 hover:bg-background/60 hover:border-border-strong group/metric"
                                    )}>
                                        <div className="flex items-center gap-2 text-muted-foreground/50">
                                            <Activity className="h-3 w-3 transition-colors group-hover/metric:text-emerald-500" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Velocity</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-base font-bold tabular-nums text-foreground tracking-tighter">
                                                {formatNumber(nodeData.throughput)}
                                            </span>
                                            <span className="text-[9px] font-bold opacity-30 uppercase">ops/s</span>
                                        </div>
                                    </div>
                                ) : null}
                                
                                {nodeData.rowsProcessed && nodeData.rowsProcessed > 0 ? (
                                    <div className={cn(
                                        "flex flex-col gap-1.5 p-3.5 rounded-2xl border transition-all duration-500 shadow-sm",
                                        "bg-primary/[0.03] border-primary/10 hover:bg-primary/[0.06] hover:border-primary/20 group/metric"
                                    )}>
                                        <div className="flex items-center gap-2 text-primary/40">
                                            <Layers className="h-3 w-3 transition-colors group-hover/metric:text-primary" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Dataset</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-base font-bold tabular-nums text-primary tracking-tighter">
                                                {formatNumber(nodeData.rowsProcessed)}
                                            </span>
                                            <span className="text-[9px] font-bold opacity-30 uppercase text-primary/60">rows</span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Status Strip */}
                        <div className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-500",
                            isRunning && "bg-primary/5 border-primary/20 text-primary shadow-inner",
                            isSuccess && "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            isError && "bg-destructive/5 border-destructive/10 text-destructive",
                            !isRunning && !isSuccess && !isError && "bg-muted/20 border-border/40 text-muted-foreground"
                        )}>
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "h-1.5 w-1.5 rounded-full shadow-sm",
                                    isRunning ? "bg-primary animate-pulse shadow-primary/40" : "bg-current opacity-40"
                                )} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none">
                                    {isRunning ? "Running" : status}
                                </span>
                            </div>
                            {nodeData.duration && nodeData.duration > 0 ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/40 backdrop-blur-md border border-white/5 shadow-sm">
                                    <Clock className="h-3 w-3 opacity-30" />
                                    <span className="text-[10px] font-bold tabular-nums opacity-60">
                                        {(nodeData.duration / 1000).toFixed(2)}s
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        {/* Error Box with Smart Truncation */}
                        {isError && nodeData.error && (
                            <div className="p-4 rounded-2xl bg-destructive/5 border-2 border-destructive/10 animate-in slide-in-from-top-2 duration-500 group/error mt-4">
                                <div className="flex items-center gap-2 text-destructive mb-2.5">
                                    <Zap className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Execution Fault</span>
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
                                    <p className="text-[11px] font-bold leading-relaxed text-destructive/90 wrap-break-word pl-1 border-l-2 border-destructive/20 ml-1">
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
                    className="w-2.5! h-10! rounded-full! bg-background! border-2! border-border/60! -left-[7px]! hover:border-primary! hover:h-12! hover:w-3! transition-all shadow-xl z-50 group-hover:border-border-strong"
                />
            )}
            {type !== 'sink' && type !== 'destination' && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="w-2.5! h-10! rounded-full! bg-background! border-2! border-border/60! -right-[7px]! hover:border-primary! hover:h-12! hover:w-3! transition-all shadow-xl z-50 group-hover:border-border-strong"
                />
            )}
        </div>
    );
};

export default memo(PipelineNode);