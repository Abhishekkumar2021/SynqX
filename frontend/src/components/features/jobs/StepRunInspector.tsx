/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Database, Zap, ArrowRight, Activity, 
    Clock, Cpu, AlertCircle, RefreshCcw,
    Table, Filter, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
    Maximize2, Minimize2, ShieldAlert, Copy, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn, formatNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { getStepData } from '@/lib/api';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';
import {
    TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

interface StepRunInspectorProps {
    step: any;
    run?: any;
    nodeLabel: string;
    onClose: () => void;
}

// --- Premium Color Palette Matching System Standard ---
const getThemeColors = (theme: string | undefined) => {
    const isDark = theme === 'dark';
    return {
        SUCCESS: isDark ? '#10b981' : '#059669', // Emerald
        FAILED: isDark ? '#f43f5e' : '#dc2626',  // Rose/Red
        PRIMARY: isDark ? '#68a0ff' : '#0055ff', // Blue
        GRID: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        TEXT: isDark ? '#94a3b8' : '#64748b',
    };
};

/**
 * Visual Micro-Chart for Column Distribution
 */
const ColumnMicroChart = ({ nullCount, total, colors }: { nullCount: number, total: number, colors: any }) => {
    const data = [
        { name: 'Valid', value: total - nullCount, fill: colors.SUCCESS },
        { name: 'Null', value: nullCount, fill: colors.FAILED },
    ].filter(d => d.value > 0);

    return (
        <div className="h-12 w-12 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={14}
                        outerRadius={22}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="transparent"
                        animationBegin={0}
                        animationDuration={1000}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};


interface StepRunInspectorProps {
    step: any;
    run?: any;
    nodeLabel: string;
    onClose: () => void;
}

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

/**
 * Full-screen Portal for Data Maximization
 */
const MaximizePortal = ({ children, onClose, title, subtitle }: { children: React.ReactNode, onClose: () => void, title: string, subtitle: string }) => {
    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Table size={20} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold uppercase tracking-tight leading-none">{title}</h3>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{subtitle}</span>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClose}
                    className="h-10 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-muted/50 hover:bg-destructive/10 hover:text-destructive transition-all px-4"
                >
                    <Minimize2 size={16} /> Exit Full Screen
                </Button>
            </div>
            <div className="flex-1 min-h-0 relative">
                {children}
            </div>
        </div>,
        document.body
    );
};

export const StepRunInspector: React.FC<StepRunInspectorProps> = ({ 
    step: initialStep, run, nodeLabel, onClose
}) => {
    const { theme } = useTheme();
    const colors = React.useMemo(() => getThemeColors(theme), [theme]);
    const [activeTab, setActiveTab] = useState('telemetry');
    const [maximizedDirection, setMaximizedDirection] = useState<'in' | 'out' | 'quarantine' | null>(null);

    // Sync with latest step data from parent run if available
    const step = useMemo(() => {
        const stepRuns = run?.step_runs;
        if (!stepRuns || !initialStep) return initialStep;
        return stepRuns.find((s: any) => s.id === initialStep.id) || initialStep;
    }, [run, initialStep]);

    const isSource = step?.operator_type?.toLowerCase() === 'extract';
    const hasQuarantine = step?.records_error > 0 || step?.operator_class === 'validate' || !!step?.sample_data?.quarantine;

    const runId = run?.id || step?.pipeline_run_id;

    // Query for Ingress Data
    const { data: inData, isLoading: isLoadingIn } = useQuery({
        queryKey: ['step-data', runId, step?.id, 'in'],
        queryFn: async () => {
            const resp = await getStepData(runId, step.id, 'in', 100, 0);
            return {
                results: resp.data.rows,
                columns: resp.data.columns,
                count: resp.data.total_cached,
                found: resp.data.found
            };
        },
        enabled: !!runId && !!step?.id && !isSource,
        retry: false
    });

    // Query for Egress Data
    const { data: outData, isLoading: isLoadingOut } = useQuery({
        queryKey: ['step-data', runId, step?.id, 'out'],
        queryFn: async () => {
            const resp = await getStepData(runId, step.id, 'out', 100, 0);
            return {
                results: resp.data.rows,
                columns: resp.data.columns,
                count: resp.data.total_cached,
                found: resp.data.found
            };
        },
        enabled: !!runId && !!step?.id,
        retry: false
    });

    // Query for Quarantine Data
    const { data: quarantineData, isLoading: isLoadingQuarantine } = useQuery({
        queryKey: ['step-data', runId, step?.id, 'quarantine'],
        queryFn: async () => {
            const resp = await getStepData(runId, step.id, 'quarantine', 100, 0);
            return {
                results: resp.data.rows,
                columns: resp.data.columns,
                count: resp.data.total_cached,
                found: resp.data.found
            };
        },
        enabled: !!runId && !!step?.id && hasQuarantine,
        retry: false
    });

    // Advanced Data Fallback Logic
    // 1. Prefer Buffer (Parquet) if it was found (even if 0 rows)
    // 2. Fall back to Sample (JSON in DB) if buffer is missing
    const displayOutData = useMemo(() => {
        if (outData?.found) return outData;
        const sample = step?.sample_data?.out || (Array.isArray(step?.sample_data) ? { rows: step.sample_data, columns: step.sample_data[0] ? Object.keys(step.sample_data[0]) : [], total_rows: step.sample_data.length } : null);
        if (!sample) return null;
        return {
            results: sample.rows || [],
            columns: sample.columns || [],
            count: sample.total_rows || 0
        };
    }, [outData, step]);

    const displayInData = useMemo(() => {
        if (inData?.found) return inData;
        const sample = step?.sample_data?.in;
        if (!sample) return null;
        return {
            results: sample.rows || [],
            columns: sample.columns || [],
            count: sample.total_rows || 0
        };
    }, [inData, step]);

    const displayQuarantineData = useMemo(() => {
        if (quarantineData?.found) return quarantineData;
        const sample = step?.sample_data?.quarantine;
        if (!sample) return null;
        return {
            results: sample.rows || [],
            columns: sample.columns || [],
            count: sample.total_rows || 0
        };
    }, [quarantineData, step]);

    if (!step) {
        return (
            <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden">
                <div className="p-6 border-b border-border/10 flex items-center justify-between">
                    <h3 className="font-bold text-xl tracking-tighter uppercase">{nodeLabel}</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl h-10 w-10">
                        <X size={20} />
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                        <div className="relative h-20 w-20 rounded-3xl glass-card flex items-center justify-center mx-auto border-2 border-primary/20 shadow-xl">
                            <Clock className="h-10 w-10 text-primary animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-2 max-w-xs">
                        <h4 className="text-lg font-bold text-foreground">Awaiting Execution</h4>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            This node is standing by. Telemetry and buffer sniffing will be available once the agent begins processing.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const isSuccess = step.status === 'success' || step.status === 'completed';
    const isFailed = step.status === 'failed';
    const isRunning = step.status === 'running';

    const recordsFiltered = step.records_filtered || 0;
    const recordsError = step.records_error || 0;

    return (
        <TooltipProvider>
            <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl animate-in slide-in-from-right duration-500 cubic-bezier(0.32, 0.72, 0, 1) overflow-hidden isolate">
                {/* --- Header --- */}
                <div className="p-6 border-b border-border/10 bg-muted/5 relative overflow-hidden shrink-0">
                    <div className={cn(
                        "absolute -right-20 -top-20 h-40 w-40 blur-[80px] opacity-20 transition-colors duration-1000",
                        isSuccess ? "bg-emerald-500" : isFailed ? "bg-destructive" : isRunning ? "bg-primary" : "bg-muted"
                    )} />

                    <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-xl transition-all duration-500",
                                isSuccess ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                isFailed ? "bg-destructive/10 text-destructive border-destructive/20" :
                                isRunning ? "bg-primary/10 text-primary border-primary/20 animate-pulse ring-4 ring-primary/5" :
                                "bg-muted/20 text-muted-foreground border-border/40"
                            )}>
                                {isSource ? <Database size={28} strokeWidth={1.5} /> :
                                step.operator_type?.toLowerCase() === 'transform' ? <Zap size={28} strokeWidth={1.5} /> :
                                step.operator_type?.toLowerCase() === 'load' ? <ArrowRight size={28} strokeWidth={1.5} /> :
                                step.operator_type?.toLowerCase() === 'validate' ? <ShieldAlert size={28} strokeWidth={1.5} /> :
                                <Activity size={28} strokeWidth={1.5} />}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl tracking-tighter text-foreground leading-none uppercase">{nodeLabel}</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border-0 bg-background/50",
                                        isSuccess ? "text-emerald-500" :
                                        isFailed ? "text-destructive" :
                                        isRunning ? "text-primary" :
                                        "text-muted-foreground"
                                    )}>
                                        {step.status}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-muted-foreground/40 font-bold tracking-tighter">NODE_ID: {step.node_id}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all">
                                <X size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="px-6 pt-4 shrink-0">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="telemetry" className="gap-2">
                                <Activity size={14} /> Telemetry
                            </TabsTrigger>
                            <TabsTrigger value="data" className="gap-2">
                                <Table size={14} /> Buffer Sniff
                            </TabsTrigger>
                            <TabsTrigger value="quality" className="gap-2">
                                <ShieldAlert size={14} /> Quality Profile
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* --- TELEMETRY VIEW --- */}
                    <TabsContent value="telemetry" className="flex-1 min-h-0 m-0 focus-visible:outline-none animate-in fade-in duration-500 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-8 pb-32">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <ArrowRight size={14} className="text-primary/60" />
                                        <div className="flex flex-col">
                                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Data Flow Analytics</Label>
                                            <span className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">Throughput & Integrity</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group relative p-6 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1 shadow-sm hover:bg-blue-500/10 transition-all duration-500">
                                            <div className="absolute top-6 right-6 h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                                <ArrowDownToLine size={20} />
                                            </div>
                                            <div className="flex items-center gap-2 text-blue-500/60 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Ingress</span>
                                            </div>
                                            <p className="text-4xl font-bold tracking-tighter text-blue-500 drop-shadow-sm">{formatNumber(step.records_in || 0)}</p>
                                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Total Signals Received</span>
                                        </div>
                                        <div className="group relative p-6 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1 shadow-sm hover:bg-emerald-500/10 transition-all duration-500">
                                            <div className="absolute top-6 right-6 h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                                <ArrowUpFromLine size={20} />
                                            </div>
                                            <div className="flex items-center gap-2 text-emerald-500/60 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Egress</span>
                                            </div>
                                            <p className="text-4xl font-bold tracking-tighter text-emerald-500 drop-shadow-sm">{formatNumber(step.records_out || 0)}</p>
                                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Processed & Emitted</span>
                                        </div>
                                    </div>

                                    {(recordsFiltered > 0 || recordsError > 0) && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-700">
                                            <div className="px-6 py-4 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between group hover:bg-amber-500/10 transition-all">
                                                <div className="flex items-center gap-3 text-amber-500/60">
                                                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                        <Filter size={14} />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Filtered Out</span>
                                                </div>
                                                <span className="text-lg font-bold font-mono text-amber-600 tracking-tighter">{formatNumber(recordsFiltered)}</span>
                                            </div>
                                            <div className="px-6 py-4 rounded-3xl bg-destructive/5 border border-destructive/10 flex items-center justify-between group hover:bg-destructive/10 transition-all">
                                                <div className="flex items-center gap-3 text-destructive/60">
                                                    <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                                                        <AlertTriangle size={14} />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Quarantined</span>
                                                </div>
                                                <span className="text-lg font-bold font-mono text-destructive tracking-tighter">{formatNumber(recordsError)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator className="opacity-10" />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Clock size={14} className="text-primary/60" />
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Execution Performance</Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-[2rem] bg-muted/10 border border-border/20 space-y-1 hover:border-primary/20 transition-all">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Temporal Latency</span>
                                            <p className="text-2xl font-bold tracking-tight text-foreground">{formatDuration(step.duration_seconds * 1000)}</p>
                                        </div>
                                        <div className="p-5 rounded-[2rem] bg-muted/10 border border-border/20 space-y-1 hover:border-primary/20 transition-all">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Hydrated Volume</span>
                                            <p className="text-2xl font-bold tracking-tight text-foreground">{formatBytes(step.bytes_processed)}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="opacity-10" />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Cpu size={14} className="text-primary/60" />
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Compute Resource Footprint</Label>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-6 rounded-[2.5rem] bg-muted/5 border border-border/20 space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">CPU Utilization</span>
                                                    </div>
                                                    <span className="text-xs font-bold font-mono text-primary">{step.cpu_percent || 0}%</span>
                                                </div>
                                                <Progress value={step.cpu_percent || 0} className="h-1.5 bg-primary/10" />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Memory Allocation</span>
                                                    </div>
                                                    <span className="text-xs font-bold font-mono text-blue-500">{step.memory_mb || 0} MB</span>
                                                </div>
                                                <Progress value={Math.min(((step.memory_mb || 0) / 8192) * 100, 100)} className="h-1.5 bg-blue-500/10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isFailed && step.error_message && (
                                    <div className="space-y-4 animate-in zoom-in-95">
                                        <div className="flex items-center gap-2 px-1 text-destructive">
                                            <AlertCircle size={14} />
                                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em]">Critical Fault Trace</Label>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-destructive/5 border border-destructive/20 shadow-xl">
                                            <pre className="text-[10px] font-bold text-destructive/90 leading-relaxed font-mono whitespace-pre-wrap break-all bg-black/20 p-4 rounded-xl shadow-inner border border-destructive/10">
                                                {step.error_message}
                                            </pre>
                                            <div className="mt-4 flex items-center gap-2 text-destructive/60">
                                                <RefreshCcw size={12} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Retried {step.retry_count || 0} times</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* --- DATA SNIFF VIEW --- */}
                    <TabsContent value="data" className="flex-1 min-h-0 m-0 focus-visible:outline-none animate-in fade-in duration-500 flex flex-col overflow-hidden">
                        <Tabs defaultValue="egress" className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 py-2 bg-muted/10 border-b border-border/10 shrink-0 flex items-center justify-between">
                                <TabsList className="gap-1">
                                    {!isSource && (
                                        <TabsTrigger value="ingress" className="gap-2">
                                            <ArrowDownToLine size={12} /> Ingress
                                        </TabsTrigger>
                                    )}
                                    <TabsTrigger value="egress" className="gap-2">
                                        <ArrowUpFromLine size={12} /> Egress
                                    </TabsTrigger>
                                    {hasQuarantine && (
                                        <TabsTrigger value="quarantine" className="gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                                            <ShieldAlert size={12} /> Rejected
                                        </TabsTrigger>
                                    )}
                                </TabsList>

                                <div className="flex items-center gap-2">
                                    <TabsContent value="ingress" className="m-0 p-0 border-0 shadow-none bg-transparent">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 rounded-lg gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 transition-all" 
                                            onClick={() => setMaximizedDirection('in')}
                                        >
                                            <Maximize2 size={12} /> Maximize
                                        </Button>
                                    </TabsContent>
                                    <TabsContent value="egress" className="m-0 p-0 border-0 shadow-none bg-transparent">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 rounded-lg gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 transition-all" 
                                            onClick={() => setMaximizedDirection('out')}
                                        >
                                            <Maximize2 size={12} /> Maximize
                                        </Button>
                                    </TabsContent>
                                    <TabsContent value="quarantine" className="m-0 p-0 border-0 shadow-none bg-transparent">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 rounded-lg gap-2 text-[10px] font-bold uppercase tracking-widest text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all" 
                                            onClick={() => setMaximizedDirection('quarantine')}
                                        >
                                            <Maximize2 size={12} /> Maximize
                                        </Button>
                                    </TabsContent>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 relative">
                                <TabsContent value="ingress" className="absolute inset-0 m-0 flex flex-col overflow-hidden">
                                    <div className="flex-1 min-h-0 relative overflow-hidden">
                                        <ResultsGrid 
                                            data={displayInData} 
                                            isLoading={isLoadingIn && !step?.sample_data?.in} 
                                            title="Ingress Buffer"
                                            description="First 100 records retrieved from source"
                                            variant="embedded"
                                            noBorder
                                            noBackground
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="egress" className="absolute inset-0 m-0 flex flex-col overflow-hidden">
                                    <div className="flex-1 min-h-0 relative overflow-hidden">
                                        <ResultsGrid 
                                            data={displayOutData} 
                                            isLoading={isLoadingOut && !(step?.sample_data?.out || Array.isArray(step?.sample_data))} 
                                            title="Egress Buffer"
                                            description="First 100 records emitted to downstream"
                                            variant="embedded"
                                            noBorder
                                            noBackground
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="quarantine" className="absolute inset-0 m-0 flex flex-col overflow-hidden">
                                    <div className="flex-1 min-h-0 relative overflow-hidden">
                                        <ResultsGrid 
                                            data={displayQuarantineData} 
                                            isLoading={isLoadingQuarantine && !step?.sample_data?.quarantine} 
                                            title="Quarantine Buffer"
                                            description="Violations captured during validation"
                                            variant="embedded"
                                            noBorder
                                            noBackground
                                        />
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </TabsContent>

                    {/* --- QUALITY PROFILE VIEW --- */}
                    <TabsContent value="quality" className="flex-1 min-h-0 m-0 focus-visible:outline-none animate-in fade-in duration-500 overflow-hidden flex flex-col">
                        {!step.quality_profile ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                                <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground/40">
                                    <ShieldAlert size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-foreground">No Profile Data</h4>
                                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">Data quality profiling is only available for successful or running stream nodes.</p>
                                </div>
                            </div>
                        ) : (
                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8 pb-32">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 size={16} className="text-emerald-500" />
                                                <div className="flex flex-col">
                                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Deep Inspection</Label>
                                                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Statistical Column Signatures</span>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 rounded-xl gap-2 text-[9px] font-bold uppercase tracking-widest"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(JSON.stringify(step.quality_profile, null, 2));
                                                    toast.success("Profile JSON copied");
                                                }}
                                            >
                                                <Copy size={12} /> Copy JSON
                                            </Button>
                                        </div>

                                        {/* Aggregate Profile Chart */}
                                        <div className="p-6 rounded-[2.5rem] bg-muted/10 border border-border/40 shadow-inner">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Aggregate Null Distribution</span>
                                                    <span className="text-xs font-bold text-foreground">Percentage of missing values per column</span>
                                                </div>
                                            </div>
                                            <div className="h-48 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={Object.entries(step.quality_profile).map(([name, s]: [string, any]) => ({ 
                                                        name, 
                                                        nulls: ((s.null_count / (step.records_out || 1)) * 100) 
                                                    }))}>
                                                        <XAxis 
                                                            dataKey="name" 
                                                            hide 
                                                        />
                                                        <YAxis 
                                                            hide 
                                                            domain={[0, 100]} 
                                                        />
                                                        <Tooltip 
                                                            cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    return (
                                                                        <div className="bg-background/95 backdrop-blur-xl border border-border/40 p-2 rounded-xl shadow-2xl">
                                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{payload[0].payload.name}</p>
                                                                            <p className="text-xs font-mono font-bold">{payload[0].value.toFixed(2)}% NULL</p>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                                                                                                                                        <Bar 
                                                                                                                                                                            dataKey="nulls" 
                                                                                                                                                                            radius={[6, 6, 0, 0]}
                                                                                                                                                                            animationDuration={1500}
                                                                                                                                                                        >
                                                                                                                                                                            {Object.entries(step.quality_profile).map(([, s]: [string, any], index) => (
                                                                                                                                                                                <Cell 
                                                                                                                                                                                    key={`cell-${index}`} 
                                                                                                                                                                                    fill={s.null_count > 0 ? colors.FAILED : colors.SUCCESS} 
                                                                                                                                                                                    fillOpacity={0.6}
                                                                                                                                                                                />
                                                                                                                                                                            ))}
                                                                                                                                                                        </Bar>
                                                                                                                                                                    </BarChart>
                                                                                                                                                                </ResponsiveContainer>
                                                                                                                                                            </div>
                                                                                                                                                        </div>
                                                                                                                
                                                                                                                                                        <div className="grid grid-cols-1 gap-4">
                                                                                                                                                            {Object.entries(step.quality_profile).map(([col, stats]: [string, any]) => {
                                                                                                                                                                const total = step.records_out || 1;
                                                                                                                                                                const nullPct = (stats.null_count / total) * 100;
                                                                                                                                                                const isValid = nullPct === 0;
                                                                                                                
                                                                                                                                                                return (
                                                                                                                                                                    <div key={col} className="group p-5 rounded-[2.5rem] bg-muted/5 border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
                                                                                                                                                                        <div className="flex items-center gap-4">
                                                                                                                                                                            <ColumnMicroChart nullCount={stats.null_count} total={total} colors={colors} />
                                                                                                                                                                            
                                                                                                                                                                            <div className="flex-1 min-w-0">
                                                                                                                
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors truncate">{col}</span>
                                                                        <Badge variant="outline" className="text-[9px] font-mono font-bold bg-background/50 border-0 h-4 px-1.5 opacity-60 shrink-0">
                                                                            {stats.dtype}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className={cn(
                                                                        "text-sm font-mono font-bold tracking-tighter",
                                                                        isValid ? "text-emerald-500" : "text-amber-500"
                                                                    )}>
                                                                        {nullPct.toFixed(1)}%
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_4px]", isValid ? "bg-emerald-500 shadow-emerald-500/40" : "bg-amber-500 shadow-amber-500/40")} />
                                                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                                            {isValid ? 'Pristine Data Signature' : 'Variance Detected'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Range / Numeric Stats */}
                                                        {stats.min !== undefined && (
                                                            <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex-1 h-9 rounded-2xl bg-background/40 border border-border/20 flex items-center px-4 justify-between group-hover:bg-background/60 transition-colors">
                                                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Min Value</span>
                                                                        <span className="text-xs font-mono font-bold text-foreground/80">{stats.min}</span>
                                                                    </div>
                                                                    <ArrowRight size={12} className="text-muted-foreground/20 shrink-0" />
                                                                    <div className="flex-1 h-9 rounded-2xl bg-background/40 border border-border/20 flex items-center px-4 justify-between group-hover:bg-background/60 transition-colors">
                                                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Max Value</span>
                                                                        <span className="text-xs font-mono font-bold text-foreground/80">{stats.max}</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {stats.mean !== undefined && (
                                                                    <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between group-hover:bg-primary/10 transition-colors">
                                                                        <div className="flex items-center gap-2">
                                                                            <Activity size={12} className="text-primary/60" />
                                                                            <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">Mean Centroid</span>
                                                                        </div>
                                                                        <span className="text-xs font-mono font-bold text-primary">{stats.mean.toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>

                {/* --- FULL SCREEN PORTAL --- */}
                {maximizedDirection && (
                    <MaximizePortal 
                        title={nodeLabel} 
                        subtitle={maximizedDirection === 'in' ? 'Ingress Stream' : maximizedDirection === 'out' ? 'Egress Stream' : 'Quarantine Buffer'}
                        onClose={() => setMaximizedDirection(null)}
                    >
                        <ResultsGrid 
                            data={maximizedDirection === 'in' ? displayInData : maximizedDirection === 'out' ? displayOutData : displayQuarantineData} 
                            isLoading={
                                maximizedDirection === 'in' ? (isLoadingIn && !step.sample_data?.in) : 
                                maximizedDirection === 'out' ? (isLoadingOut && !step.sample_data?.out) : 
                                (isLoadingQuarantine && !step.sample_data?.quarantine)
                            } 
                            title={maximizedDirection === 'in' ? "Ingress Data Stream" : maximizedDirection === 'out' ? "Egress Data Stream" : "Quarantine Data Stream"}
                            description={maximizedDirection === 'quarantine' ? "Violations captured during validation" : `Full buffer inspection for ${nodeLabel}`}
                            variant="embedded"
                            noBorder
                            noBackground
                        />
                    </MaximizePortal>
                )}
            </div>
        </TooltipProvider>
    );
};