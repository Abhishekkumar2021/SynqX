/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
    CheckCircle2, Clock, Database, Zap,
    Activity, Terminal, AlertCircle,
    RefreshCw, Cpu, HardDrive, XCircle,
    ArrowDownToLine, ArrowUpFromLine, ShieldAlert,
    Server, Box, TrendingUp
} from 'lucide-react';
import { cn, formatNumber, formatDurationMs, formatBytes } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StepRunInspector } from './StepRunInspector';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface JobSummaryProps {
    job: any;
    run: any;
}

const PerformanceAnalytics = ({ steps }: { steps: any[] }) => {
    const data = steps.map((s, i) => ({
        name: s.node?.name || `Step ${i+1}`,
        duration: s.duration_seconds || 0,
        throughput: (s.records_out || 0) / (s.duration_seconds || 1),
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 rounded-[2rem] border border-border/40 bg-card/30 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Latency Distribution (s)</span>
                    </div>
                </div>
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.duration > 60 ? 'oklch(0.62 0.19 25)' : 'oklch(0.7 0.18 55)'} fillOpacity={0.4} stroke={entry.duration > 60 ? 'oklch(0.62 0.19 25)' : 'oklch(0.7 0.18 55)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="p-6 rounded-[2rem] border border-border/40 bg-card/30 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Throughput Velocity (rps)</span>
                    </div>
                </div>
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="oklch(0.62 0.19 145)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="oklch(0.62 0.19 145)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="throughput" stroke="oklch(0.62 0.19 145)" fillOpacity={1} fill="url(#colorThroughput)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export const JobSummary: React.FC<JobSummaryProps> = ({ job, run }) => {
    const [inspectingStep, setInspectingStep] = React.useState<any | null>(null);
    const isSuccess = job.status === 'success';
    const isFailed = job.status === 'failed';
    const isQueued = job.status === 'queued';
    const isRunning = job.status === 'running' || job.status === 'pending' || isQueued;
    const isCancelled = job.status === 'cancelled';

    const steps = run?.step_runs || [];
    const totalNodes = run?.total_nodes || steps.length || 0;
    const completedSteps = steps.filter((s: any) => s.status === 'success' || s.status === 'completed' || s.status === 'warning').length;
    const progress = totalNodes > 0 ? (completedSteps / totalNodes) * 100 : 0;

    return (
        <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 animate-in fade-in duration-700 bg-background/20">
                {/* --- Status & Progress Section --- */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className={cn(
                        "xl:col-span-8 relative overflow-hidden rounded-[2rem] border p-6 md:p-8 transition-all duration-500",
                        isSuccess ? "bg-emerald-500/3 border-emerald-500/20" :
                        isFailed ? "bg-destructive/3 border-destructive/20" :
                        isCancelled ? "bg-amber-500/3 border-amber-500/20" :
                        isQueued ? "bg-purple-500/3 border-purple-500/20" :
                        "bg-primary/3 border-primary/20"
                    )}>
                        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn(
                                        "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border",
                                        isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        isFailed ? "bg-destructive/10 text-destructive border-destructive/20" :
                                        isCancelled ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                        isQueued ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                        "bg-primary/10 text-primary border-primary/20"
                                    )}>
                                        {job.status}
                                    </Badge>
                                    {run?.run_number && (
                                        <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground border-none">
                                            #{run.run_number}
                                        </Badge>
                                    )}
                                    {job.queue_name ? (
                                        <Badge variant="outline" className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-primary/5 border-primary/20 text-primary flex items-center gap-1.5">
                                            <Server className="h-2.5 w-2.5" /> {job.queue_name}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-blue-500/5 border-blue-500/20 text-blue-600 flex items-center gap-1.5">
                                            <Box className="h-2.5 w-2.5" /> Internal Cloud
                                        </Badge>
                                    )}
                                    {isRunning && !isQueued && (
                                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                                            </span>
                                            <span className="text-[9px] font-bold text-primary/80 uppercase tracking-widest">Active</span>
                                        </div>
                                    )}
                                    {isQueued && (
                                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-purple-500/5 border border-purple-500/10">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="absolute inset-0 rounded-full bg-purple-400 animate-pulse" />
                                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500" />
                                            </span>
                                            <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">Waiting</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground uppercase">Run Summary</h2>
                                    <p className="text-xs md:text-sm font-medium text-muted-foreground max-w-md leading-relaxed opacity-70">
                                        {isSuccess ? "Orchestration finalized. All data packets processed and target states synchronized." :
                                         isFailed ? `Orchestration halted due to a terminal error: ${run?.error_message || "System failure."}` :
                                         isCancelled ? "Orchestration terminated by operator intervention." :
                                         isQueued ? `Standing by. Awaiting connection from an agent in the '${job.queue_name}' group.` :
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
                                            <span className="text-lg font-bold tracking-tighter">{Math.round(progress)}%</span>
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
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Nodes</span>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-foreground">{completedSteps}<span className="text-sm opacity-30 mx-1">/</span>{totalNodes}</span>
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-primary" />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 rounded-[1.5rem] border border-border/40 bg-card/30 backdrop-blur-md flex flex-col justify-between flex-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Total Time</span>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-foreground">{formatDurationMs(job.execution_time_ms)}</span>
                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-purple-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Performance Analytics --- */}
                {steps.length > 0 && <PerformanceAnalytics steps={steps} />}

                {/* --- Metrics Highlights --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                            <ArrowDownToLine className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Extracted</p>
                            <p className="text-xl font-bold tracking-tighter text-foreground truncate">{formatNumber(run?.total_extracted || 0)}</p>
                        </div>
                    </div>
                    <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                            <ArrowUpFromLine className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Loaded</p>
                            <p className="text-xl font-bold tracking-tighter text-foreground truncate">{formatNumber(run?.total_loaded || 0)}</p>
                        </div>
                    </div>
                    <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Quarantined</p>
                            <p className="text-xl font-bold tracking-tighter text-amber-600 truncate">{formatNumber(steps.reduce((sum: number, s: any) => sum + (s.records_error || 0), 0))}</p>
                        </div>
                    </div>
                    <div className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20 shrink-0">
                            <XCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Failures</p>
                            <p className="text-xl font-bold tracking-tighter text-destructive truncate">{formatNumber(run?.total_failed || 0)}</p>
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
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">Execution Trace</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{completedSteps} OK</span>
                            </div>
                            {steps.some((s: any) => (s.records_error || 0) > 0) && (
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-amber-600 uppercase">Violations detected</span>
                                </div>
                            )}
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
                            const hasViolations = (step.records_error || 0) > 0;

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
                                            sIsSuccess ? (hasViolations ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30") :
                                            sIsFailed ? "bg-destructive/10 text-destructive border border-destructive/30" :
                                            sIsRunning ? "bg-primary/10 text-primary border border-primary/30 animate-pulse" :
                                            "bg-muted/30 text-muted-foreground border border-border/40"
                                        )}>
                                            {sIsSuccess ? (hasViolations ? <ShieldAlert size={16} strokeWidth={3} /> : <CheckCircle2 size={16} strokeWidth={3} />) :
                                             sIsFailed ? <AlertCircle size={16} strokeWidth={3} /> :
                                             sIsRunning ? <RefreshCw size={16} strokeWidth={3} className="animate-spin" /> :
                                             <span className="text-[10px] font-bold">{idx + 1}</span>}
                                        </div>
                                    </div>

                                    {/* Content Card */}
                                    <div 
                                        onClick={() => setInspectingStep(step)}
                                        className={cn(
                                            "flex-1 p-5 rounded-[1.5rem] border transition-all duration-300 hover:shadow-md cursor-pointer",
                                            sIsRunning ? "bg-primary/4 border-primary/30" : 
                                            hasViolations ? "bg-amber-500/2 border-amber-500/20 shadow-inner" : "bg-card/40 border-border/40"
                                        )}
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-1",
                                                    hasViolations ? "bg-amber-500/10 text-amber-600" : "bg-muted/20 text-muted-foreground"
                                                )}>
                                                    {step.operator_type === 'extract' ? <Database size={18} /> :
                                                     step.operator_type === 'load' ? <ArrowUpFromLine size={18} /> : 
                                                     hasViolations ? <ShieldAlert size={18} /> : <Zap size={18} />}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm tracking-tight uppercase text-foreground">{step.node?.name || step.operator_type || 'Node'}</span>
                                                        <Badge variant="outline" className="px-1.5 py-0 rounded text-[8px] font-mono opacity-40 border-border/40">ID:{step.node_id}</Badge>
                                                        {hasViolations && (
                                                            <Badge className="px-1.5 py-0 rounded text-[8px] font-bold uppercase tracking-widest bg-amber-500 text-white border-none shadow-sm">Violations</Badge>
                                                        )}
                                                        {step.retry_count > 0 && (
                                                            <Badge variant="destructive" className="px-1.5 py-0 rounded text-[8px] font-bold uppercase tracking-widest animate-pulse">Retry: {step.retry_count}</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <span className={cn(sIsRunning && "text-primary")}>{step.status}</span>
                                                                                                                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                                                                                                                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/5 border border-amber-500/10">
                                                                                                                            <Clock size={10} className="text-amber-500/60" />
                                                                                                                            <span className="text-amber-600/80">{formatDurationMs(step.duration_seconds * 1000)}</span>
                                                                                                                        </div>
                                                                                                                    </div>                                                        
                                                        {step.records_out > 0 && (
                                                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                                                                <Activity size={10} className="text-emerald-500/60" />
                                                                <span className="text-emerald-600/80">{((step.records_out || 0) / (step.duration_seconds || 1)).toFixed(1)} rps</span>
                                                            </div>
                                                        )}

                                                        {(step.cpu_percent > 0 || step.memory_mb > 0) && (
                                                            <div className="flex items-center gap-3 px-2 py-0.5 rounded-md bg-muted/20 border border-border/10">
                                                                <span className="flex items-center gap-1"><Cpu size={10} className="text-muted-foreground/30" /> {step.cpu_percent?.toFixed(0)}%</span>
                                                                <span className="h-3 w-px bg-border/40" />
                                                                <span className="flex items-center gap-1"><HardDrive size={10} className="text-muted-foreground/30" /> {step.memory_mb?.toFixed(0)}MB</span>
                                                            </div>
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
                                                        <div className="text-[8px] font-bold uppercase text-muted-foreground/40 flex items-center gap-1">
                                                            <ArrowDownToLine size={10} /> In
                                                        </div>
                                                        <div className="text-xs font-bold">{formatNumber(step.records_in || 0)}</div>
                                                    </div>
                                                    <div className="h-6 w-px bg-border/20" />
                                                    <div className="space-y-1 min-w-[50px]">
                                                        <div className="text-[8px] font-bold uppercase text-muted-foreground/40 flex items-center gap-1">
                                                            <ArrowUpFromLine size={10} /> Out
                                                        </div>
                                                        <div className="text-xs font-bold text-primary">{formatNumber(step.records_out || 0)}</div>
                                                    </div>
                                                    {(step.records_filtered > 0 || step.records_error > 0) && (
                                                        <>
                                                            <div className="h-6 w-px bg-border/20" />
                                                            {step.records_filtered > 0 && (
                                                                <div className="space-y-1 min-w-[50px]">
                                                                    <div className="text-[8px] font-bold uppercase text-muted-foreground/40">Filtered</div>
                                                                    <div className="text-xs font-bold text-amber-500/80">{formatNumber(step.records_filtered || 0)}</div>
                                                                </div>
                                                            )}
                                                            {step.records_error > 0 && (
                                                                <div className="space-y-1 min-w-[50px]">
                                                                    <div className="text-[8px] font-bold uppercase text-muted-foreground/40">Errors</div>
                                                                    <div className="text-xs font-bold text-destructive/80">{formatNumber(step.records_error || 0)}</div>
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
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">{step.error_type || 'Execution Fault'}</span>
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

            {/* Side Inspector */}
            <div className={cn(
                "absolute inset-0 z-50 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)",
                inspectingStep ? "translate-x-0" : "translate-x-full"
            )}>
                {inspectingStep && (
                    <StepRunInspector 
                        step={inspectingStep}
                        run={run}
                        nodeLabel={inspectingStep.node?.name || inspectingStep.operator_type || 'Node'}
                        onClose={() => setInspectingStep(null)}
                    />
                )}
            </div>
        </div>
    );
};
