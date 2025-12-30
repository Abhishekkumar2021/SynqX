/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Database, Zap, ArrowRight, Activity, 
    Clock, Cpu, AlertCircle, RefreshCcw,
    Table, Filter, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
    Maximize2, Minimize2
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

interface StepRunInspectorProps {
    step: any;
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
        <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Table size={20} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-xl font-black uppercase tracking-tight leading-none">{title}</h3>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{subtitle}</span>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClose}
                    className="h-10 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-muted/50 hover:bg-destructive/10 hover:text-destructive transition-all px-4"
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
    step, nodeLabel, onClose
}) => {
    const [activeTab, setActiveTab] = useState('telemetry');
    const [maximizedDirection, setMaximizedDirection] = useState<'in' | 'out' | null>(null);

    const isSource = step?.operator_type?.toLowerCase() === 'extract';

    // Query for Ingress Data
    const { data: inData, isLoading: isLoadingIn } = useQuery({
        queryKey: ['step-data', step?.pipeline_run_id, step?.id, 'in'],
        queryFn: async () => {
            const resp = await getStepData(step.pipeline_run_id, step.id, 'in', 100, 0);
            return {
                results: resp.data.rows,
                columns: resp.data.columns,
                count: resp.data.total_cached,
                found: resp.data.found
            };
        },
        enabled: !!step && activeTab === 'data' && !isSource,
        retry: false
    });

    // Query for Egress Data
    const { data: outData, isLoading: isLoadingOut } = useQuery({
        queryKey: ['step-data', step?.pipeline_run_id, step?.id, 'out'],
        queryFn: async () => {
            const resp = await getStepData(step.pipeline_run_id, step.id, 'out', 100, 0);
            return {
                results: resp.data.rows,
                columns: resp.data.columns,
                count: resp.data.total_cached,
                found: resp.data.found
            };
        },
        enabled: !!step && activeTab === 'data',
        retry: false
    });

    if (!step) return null;

    // Advanced Data Fallback Logic
    // 1. Prefer Buffer (Parquet) if it was found (even if 0 rows)
    // 2. Fall back to Sample (JSON in DB) if buffer is missing
    const displayOutData = (outData?.found) 
        ? outData 
        : (step.sample_data ? {
            results: step.sample_data.rows || [],
            columns: step.sample_data.columns || [],
            count: step.sample_data.total_rows || 0
        } : null);

    const displayInData = inData?.found ? inData : null;

    const isSuccess = step.status === 'success' || step.status === 'completed';
    const isFailed = step.status === 'failed';
    const isRunning = step.status === 'running';

    const recordsFiltered = step.records_filtered || 0;
    const recordsError = step.records_error || 0;

    return (
        <TooltipProvider>
            <div className="h-full flex flex-col bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl animate-in slide-in-from-right duration-500 cubic-bezier(0.32, 0.72, 0, 1) overflow-hidden isolate">
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
                                <Activity size={28} strokeWidth={1.5} />}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-xl tracking-tighter text-foreground leading-none uppercase">{nodeLabel}</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-0 bg-background/50",
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
                        <TabsList className="w-full grid grid-cols-2 h-12 bg-muted/50">
                            <TabsTrigger value="telemetry" className="gap-2">
                                <Activity size={12} /> Telemetry
                            </TabsTrigger>
                            <TabsTrigger value="data" className="gap-2">
                                <Table size={12} /> Buffer Sniff
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
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Data Lifecycle</Label>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-5 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1 shadow-sm">
                                            <div className="flex items-center gap-2 text-blue-500/60 mb-1">
                                                <ArrowDownToLine size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Ingress</span>
                                            </div>
                                            <p className="text-3xl font-black tracking-tighter text-blue-500">{formatNumber(step.records_in || 0)}</p>
                                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Total Records In</span>
                                        </div>
                                        <div className="p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1 shadow-sm">
                                            <div className="flex items-center gap-2 text-emerald-500/60 mb-1">
                                                <ArrowUpFromLine size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Egress</span>
                                            </div>
                                            <p className="text-3xl font-black tracking-tighter text-emerald-500">{formatNumber(step.records_out || 0)}</p>
                                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Successfully Processed</span>
                                        </div>
                                    </div>

                                    {(recordsFiltered > 0 || recordsError > 0) && (
                                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                            <div className="px-5 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-amber-500/60">
                                                    <Filter size={12} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Filtered</span>
                                                </div>
                                                <span className="text-sm font-black font-mono text-amber-600">{formatNumber(recordsFiltered)}</span>
                                            </div>
                                            <div className="px-5 py-3 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-destructive/60">
                                                    <AlertTriangle size={12} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Errors</span>
                                                </div>
                                                <span className="text-sm font-black font-mono text-destructive">{formatNumber(recordsError)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator className="opacity-10" />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Clock size={14} className="text-primary/60" />
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Performance Profile</Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-muted/10 border border-border/20 space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Execution Latency</span>
                                            <p className="text-xl font-black tracking-tight text-foreground">{formatDuration(step.duration_seconds * 1000)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/10 border border-border/20 space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Data Volume</span>
                                            <p className="text-xl font-black tracking-tight text-foreground">{formatBytes(step.bytes_processed)}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="opacity-10" />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Cpu size={14} className="text-primary/60" />
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Worker Resources</Label>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-5 rounded-[2rem] bg-muted/5 border border-border/20 space-y-5">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Processor Load</span>
                                                    <span className="text-xs font-black font-mono text-primary">{step.cpu_percent || 0}%</span>
                                                </div>
                                                <Progress value={step.cpu_percent || 0} className="h-1 bg-primary/10" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Memory Usage</span>
                                                    <span className="text-xs font-black font-mono text-blue-500">{step.memory_mb || 0} MB</span>
                                                </div>
                                                <Progress value={Math.min(((step.memory_mb || 0) / 8192) * 100, 100)} className="h-1 bg-blue-500/10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isFailed && step.error_message && (
                                    <div className="space-y-4 animate-in zoom-in-95">
                                        <div className="flex items-center gap-2 px-1 text-destructive">
                                            <AlertCircle size={14} />
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em]">Critical Fault Trace</Label>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-destructive/5 border border-destructive/20 shadow-xl">
                                            <pre className="text-[10px] font-bold text-destructive/90 leading-relaxed font-mono whitespace-pre-wrap break-all bg-black/20 p-4 rounded-xl shadow-inner border border-destructive/10">
                                                {step.error_message}
                                            </pre>
                                            <div className="mt-4 flex items-center gap-2 text-destructive/60">
                                                <RefreshCcw size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Retried {step.retry_count || 0} times</span>
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
                                <TabsList className="h-10 bg-background/50 p-1 rounded-xl">
                                    {!isSource && (
                                        <TabsTrigger value="ingress" className="text-[9px] h-8 px-4 gap-2">
                                            <ArrowDownToLine size={12} /> Ingress
                                        </TabsTrigger>
                                    )}
                                    <TabsTrigger value="egress" className="text-[9px] h-8 px-4 gap-2">
                                        <ArrowUpFromLine size={12} /> Egress
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex items-center gap-2">
                                    <TabsContent value="ingress" className="m-0 p-0 border-0 shadow-none bg-transparent">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 transition-all" 
                                            onClick={() => setMaximizedDirection('in')}
                                        >
                                            <Maximize2 size={12} /> Maximize
                                        </Button>
                                    </TabsContent>
                                    <TabsContent value="egress" className="m-0 p-0 border-0 shadow-none bg-transparent">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 transition-all" 
                                            onClick={() => setMaximizedDirection('out')}
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
                                            isLoading={isLoadingIn} 
                                            title="Ingress Buffer"
                                            description="First 100 records retrieved from source"
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="egress" className="absolute inset-0 m-0 flex flex-col overflow-hidden">
                                    <div className="flex-1 min-h-0 relative overflow-hidden">
                                        <ResultsGrid 
                                            data={displayOutData} 
                                            isLoading={isLoadingOut && !step.sample_data} 
                                            title="Egress Buffer"
                                            description="First 100 records emitted to downstream"
                                        />
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </TabsContent>
                </Tabs>

                {/* --- FULL SCREEN PORTAL --- */}
                {maximizedDirection && (
                    <MaximizePortal 
                        title={nodeLabel} 
                        subtitle={maximizedDirection === 'in' ? 'Ingress Stream' : 'Egress Stream'}
                        onClose={() => setMaximizedDirection(null)}
                    >
                        <ResultsGrid 
                            data={maximizedDirection === 'in' ? displayInData : displayOutData} 
                            isLoading={maximizedDirection === 'in' ? isLoadingIn : (isLoadingOut && !step.sample_data)} 
                            title={maximizedDirection === 'in' ? "Ingress Data Stream" : "Egress Data Stream"}
                            description={`Full buffer inspection for ${nodeLabel}`}
                        />
                    </MaximizePortal>
                )}
            </div>
        </TooltipProvider>
    );
};