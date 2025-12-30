/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
    CheckCircle2, Clock, Database, Zap,
    Activity, Terminal, AlertCircle,
    RefreshCw, Cpu, HardDrive, History, XCircle,
    ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface JobSummaryProps {
    job: any;
    run: any;
}

const WatermarkBadge = ({ pipelineId, assetId }: { pipelineId: number, assetId?: number }) => {
    const { data: wm, isLoading } = useQuery({
        queryKey: ['watermark', pipelineId, assetId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/pipelines/${pipelineId}/watermarks/${assetId}`);
                return data;
            } catch (e) { return null; }
        },
        enabled: !!assetId && !!pipelineId,
        staleTime: 10000,
    });

    if (isLoading || !wm || !wm.last_value) return null;

    const key = Object.keys(wm.last_value)[0];
    const val = wm.last_value[key];

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group/wm shrink-0">
            <History className="h-3 w-3 text-primary/60 group-hover/wm:text-primary transition-colors shrink-0" />
            <span className="text-[9px] font-black text-primary/70 truncate max-w-[180px] leading-none uppercase tracking-tight group-hover/wm:text-primary">
                {key}: <span className="text-primary font-black italic">{String(val)}</span>
            </span>
        </div>
    );
};

const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDuration = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

export const JobSummary: React.FC<JobSummaryProps> = ({ job, run }) => {
    const isSuccess = job.status === 'success';
    const isFailed = job.status === 'failed';
    const isRunning = job.status === 'running' || job.status === 'pending';
    const isCancelled = job.status === 'cancelled';

    const steps = run?.step_runs || [];
    const totalNodes = run?.total_nodes || steps.length || 0;
    const completedSteps = steps.filter((s: any) => s.status === 'success' || s.status === 'completed' || s.status === 'warning').length;
    const progress = totalNodes > 0 ? (completedSteps / totalNodes) * 100 : 0;

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 animate-in fade-in duration-700 bg-background/20">
            {/* --- Status & Progress Section --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className={cn(
                    "xl:col-span-8 relative overflow-hidden rounded-[2rem] border p-6 md:p-8 transition-all duration-500",
                    isSuccess ? "bg-emerald-500/3 border-emerald-500/20" :
                    isFailed ? "bg-destructive/3 border-destructive/20" :
                    isCancelled ? "bg-amber-500/3 border-amber-500/20" :
                    "bg-primary/3 border-primary/20"
                )}>
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                    isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                    isFailed ? "bg-destructive/10 text-destructive border-destructive/20" :
                                    isCancelled ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                    "bg-primary/10 text-primary border-primary/20"
                                )}>
                                    {job.status}
                                </Badge>
                                {run?.run_number && (
                                    <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-muted/50 text-muted-foreground border-none">
                                        #{run.run_number}
                                    </Badge>
                                )}
                                {isRunning && (
                                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                                        </span>
                                        <span className="text-[9px] font-black text-primary/80 uppercase tracking-widest">Active</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">Run Summary</h2>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground max-w-md leading-relaxed opacity-70">
                                    {isSuccess ? "Orchestration finalized. All data packets processed and target states synchronized." :
                                     isFailed ? `Orchestration halted due to a terminal error: ${run?.error_message || "System failure."}` :
                                     isCancelled ? "Orchestration terminated by operator intervention." :
                                     "Orchestration in progress. Analyzing DAG dependencies and streaming telemetry."}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                            {isRunning ? (
                                <div className="relative h-20 w-20 flex items-center justify-center">
                                    <svg className="h-full w-full -rotate-90">
                                        <circle cx="40" cy="40" r="36" className="stroke-muted/10 fill-none" strokeWidth="6" />
                                        <circle cx="40" cy="40" r="36" className="stroke-primary fill-none transition-all duration-1000" strokeWidth="6" strokeDasharray={226} strokeDashoffset={226 - (226 * progress) / 100} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-black tracking-tighter">{Math.round(progress)}%</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-16 w-16 rounded-3xl bg-background/40 border border-border/40 flex items-center justify-center  backdrop-blur-sm">
                                    {isSuccess ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> :
                                     isFailed ? <XCircle className="h-8 w-8 text-destructive" /> :
                                     <AlertCircle className="h-8 w-8 text-amber-500" />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Status Cards */}
                <div className="xl:col-span-4 flex flex-col gap-4">
                    <div className="p-5 rounded-[1.5rem] border border-border/40 bg-card/30 backdrop-blur-md flex flex-col justify-between flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Nodes</span>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-black text-foreground">{completedSteps}<span className="text-sm opacity-30 mx-1">/</span>{totalNodes}</span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="p-5 rounded-[1.5rem] border border-border/40 bg-card/30 backdrop-blur-md flex flex-col justify-between flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Total Time</span>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-black text-foreground">{formatDuration(job.execution_time_ms)}</span>
                            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-purple-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Metrics Highlights --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                        <ArrowDownToLine className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">Extracted</p>
                        <p className="text-xl font-black tracking-tighter text-foreground truncate">{formatNumber(run?.total_extracted || 0)}</p>
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                        <ArrowUpFromLine className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">Loaded</p>
                        <p className="text-xl font-black tracking-tighter text-foreground truncate">{formatNumber(run?.total_loaded || 0)}</p>
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                    <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">Volume</p>
                        <p className="text-xl font-black tracking-tighter text-foreground truncate">{formatBytes(run?.bytes_processed || 0)}</p>
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20 shrink-0">
                        <XCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">Faults</p>
                        <p className="text-xl font-black tracking-tighter text-foreground truncate">{formatNumber(run?.total_failed || 0)}</p>
                    </div>
                </div>
            </div>

            {/* --- Detailed Trace Timeline --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/10 border border-border/20 flex items-center justify-center">
                            <Terminal className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">Execution Trace</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{completedSteps} OK</span>
                        </div>
                        {run?.total_failed > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                                <span className="text-[10px] font-bold text-destructive/80 uppercase">Fault detected</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {steps.map((step: any, idx: number) => {
                        const sIsRunning = step.status === 'running';
                        const sIsSuccess = step.status === 'success' || step.status === 'completed';
                        const sIsFailed = step.status === 'failed';

                        return (
                            <div key={step.id} className="group relative flex items-stretch gap-4 md:gap-6">
                                {/* Connector Line */}
                                {idx !== steps.length - 1 && (
                                    <div className="absolute left-5 top-10 -bottom-6 w-px bg-border/30 group-hover:bg-primary/20 transition-colors" />
                                )}

                                {/* Status Icon */}
                                <div className="relative z-10 shrink-0 mt-2">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ring-4 ring-background/50",
                                        sIsSuccess ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" :
                                        sIsFailed ? "bg-destructive/10 text-destructive border border-destructive/30" :
                                        sIsRunning ? "bg-primary/10 text-primary border border-primary/30 animate-pulse" :
                                        "bg-muted/30 text-muted-foreground border border-border/40"
                                    )}>
                                        {sIsSuccess ? <CheckCircle2 size={16} strokeWidth={3} /> :
                                         sIsFailed ? <AlertCircle size={16} strokeWidth={3} /> :
                                         sIsRunning ? <RefreshCw size={16} strokeWidth={3} className="animate-spin" /> :
                                         <span className="text-[10px] font-black">{idx + 1}</span>}
                                    </div>
                                </div>

                                {/* Content Card */}
                                <div className={cn(
                                    "flex-1 p-5 rounded-[1.5rem] border transition-all duration-300 hover:shadow-md",
                                    sIsRunning ? "bg-primary/4 border-primary/30" : "bg-card/40 border-border/40"
                                )}>
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-muted/20 flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                                                {step.operator_type === 'extract' ? <Database size={18} /> :
                                                 step.operator_type === 'load' ? <ArrowUpFromLine size={18} /> : <Zap size={18} />}
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm tracking-tight uppercase text-foreground">{step.node?.name || step.operator_type || 'Node'}</span>
                                                    <Badge variant="outline" className="px-1.5 py-0 rounded text-[8px] font-mono opacity-40 border-border/40">ID:{step.node_id}</Badge>
                                                    {step.retry_count > 0 && (
                                                        <Badge variant="destructive" className="px-1.5 py-0 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">Retry: {step.retry_count}</Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(sIsRunning && "text-primary")}>{step.status}</span>
                                                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                                                        <span>{formatDuration(step.duration_seconds * 1000)}</span>
                                                    </div>
                                                    
                                                    {step.source_asset_id && (
                                                        <>
                                                            <span className="h-0.5 w-0.5 rounded-full bg-border hidden sm:block" />
                                                            <WatermarkBadge pipelineId={job.pipeline_id} assetId={step.source_asset_id} />
                                                        </>
                                                    )}

                                                    {(step.cpu_percent > 0 || step.memory_mb > 0) && (
                                                        <>
                                                            <span className="h-0.5 w-0.5 rounded-full bg-border" />
                                                            <span className="flex items-center gap-1"><Cpu size={10} className="text-muted-foreground/30" /> {step.cpu_percent?.toFixed(1)}%</span>
                                                            <span className="h-0.5 w-0.5 rounded-full bg-border" />
                                                            <span className="flex items-center gap-1"><HardDrive size={10} className="text-muted-foreground/30" /> {step.memory_mb?.toFixed(0)}MB</span>
                                                        </>
                                                    )}
                                                    {step.bytes_processed > 0 && (
                                                        <>
                                                            <span className="h-0.5 w-0.5 rounded-full bg-border" />
                                                            <span>{formatBytes(step.bytes_processed)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 xl:gap-6">
                                            {/* Data Multi-Stats */}
                                            <div className="flex items-center gap-5 bg-muted/10 px-4 py-2.5 rounded-2xl border border-border/20">
                                                <div className="space-y-1 min-w-[50px]">
                                                    <div className="text-[8px] font-black uppercase text-muted-foreground/40 flex items-center gap-1">
                                                        <ArrowDownToLine size={10} /> In
                                                    </div>
                                                    <div className="text-xs font-black">{formatNumber(step.records_in || 0)}</div>
                                                </div>
                                                <div className="h-6 w-px bg-border/20" />
                                                <div className="space-y-1 min-w-[50px]">
                                                    <div className="text-[8px] font-black uppercase text-muted-foreground/40 flex items-center gap-1">
                                                        <ArrowUpFromLine size={10} /> Out
                                                    </div>
                                                    <div className="text-xs font-black text-primary">{formatNumber(step.records_out || 0)}</div>
                                                </div>
                                                {(step.records_filtered > 0 || step.records_error > 0) && (
                                                    <>
                                                        <div className="h-6 w-px bg-border/20" />
                                                        {step.records_filtered > 0 && (
                                                            <div className="space-y-1 min-w-[50px]">
                                                                <div className="text-[8px] font-black uppercase text-muted-foreground/40">Filtered</div>
                                                                <div className="text-xs font-black text-amber-500/80">{formatNumber(step.records_filtered || 0)}</div>
                                                            </div>
                                                        )}
                                                        {step.records_error > 0 && (
                                                            <div className="space-y-1 min-w-[50px]">
                                                                <div className="text-[8px] font-black uppercase text-muted-foreground/40">Errors</div>
                                                                <div className="text-xs font-black text-destructive/80">{formatNumber(step.records_error || 0)}</div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {step.error_message && (
                                        <div className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-destructive/80">{step.error_type || 'Execution Fault'}</span>
                                            </div>
                                            <p className="text-[11px] font-medium text-destructive/90 leading-relaxed pl-5">{step.error_message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
