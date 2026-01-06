import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Clock, 
    MoreHorizontal, 
    Play, 
    Trash2,
    CheckCircle2,
    Settings,
    ShieldAlert,
    Zap,
    Database,
    Workflow,
    Loader2,
    Calendar,
    History,
    XCircle,
    FileDown
} from 'lucide-react';import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import { cn, formatNumber } from '@/lib/utils';
import { PipelineStatusBadge } from './PipelineStatusBadge';
import { type Pipeline, type Job, getPipelineStats, deletePipeline, exportPipelineYAML } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RunPipelineDialog } from './RunPipelineDialog';

interface PipelineGridItemProps {
    pipeline: Pipeline & { lastJob?: Job };
    onRun?: (id: number, versionId?: number) => void;
    onOpenSettings?: (pipeline: Pipeline) => void;
    onViewVersions: (pipeline: Pipeline) => void;
}

const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '—';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
}

export const PipelineGridItem: React.FC<PipelineGridItemProps> = ({ pipeline, onRun, onOpenSettings, onViewVersions }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const lastJob = pipeline.lastJob;

    // Fetch pipeline stats
    const { data: stats } = useQuery({
        queryKey: ['pipeline-stats', pipeline.id],
        queryFn: () => getPipelineStats(pipeline.id),
        staleTime: 30000
    });

    const deleteMutation = useMutation({
        mutationFn: deletePipeline,
        onSuccess: () => {
            toast.success("Pipeline deleted");
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            setIsDeleteDialogOpen(false);
        },
        onError: () => toast.error("Failed to delete pipeline")
    });

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await exportPipelineYAML(pipeline.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `synqx_${pipeline.name.toLowerCase().replace(/ /g, '_')}.yaml`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Definition Exported", { description: "YAML manifest is ready." });
        } catch {
            toast.error("Export Failed");
        } finally {
            setIsExporting(false);
        }
    };
    
    // Status Logic
    const isRunning = lastJob?.status === 'running' || lastJob?.status === 'pending';
    const isSuccess = lastJob?.status === 'success';
    const isFailed = lastJob?.status === 'failed';

    const successRate = stats && stats.total_runs > 0 
        ? Math.round((stats.successful_runs / stats.total_runs) * 100) 
        : null;

    return (
        <>
            <div 
                className="group relative flex flex-col rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
            >
                {/* --- Header --- */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                        {/* Icon Box */}
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300",
                            isRunning 
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                                : "bg-muted/40 border-border/40 text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 group-hover:border-primary/20"
                        )}>
                            {isRunning ? <Loader2 className="h-6 w-6 animate-spin" /> : <Workflow className="h-6 w-6" />}
                        </div>
                        
                        {/* Title & Badge */}
                        <div className="flex flex-col gap-0.5">
                            <Link 
                                to={`/pipelines/${pipeline.id}`} 
                                className="font-bold text-base text-foreground hover:text-primary transition-colors line-clamp-1 tracking-tight"
                            >
                                {pipeline.name}
                            </Link>
                            <div className="flex items-center gap-2">
                                <PipelineStatusBadge status={pipeline.status} />
                            </div>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/60 shadow-lg p-1">
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => setIsRunDialogOpen(true)} disabled={!onRun}>
                                <Play className="h-3.5 w-3.5 opacity-70" /> Run with Options...
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => onViewVersions(pipeline)}>
                                <History className="h-3.5 w-3.5 opacity-70" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => navigate(`/pipelines/${pipeline.id}`)}>
                                <Settings className="h-3.5 w-3.5 opacity-70" /> Configure Logic
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => onOpenSettings?.(pipeline)} disabled={!onOpenSettings}>
                                <Workflow className="h-3.5 w-3.5 opacity-70" /> Pipeline Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={handleExport} disabled={isExporting}>
                                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 opacity-70" />}
                                Export as YAML
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem 
                                className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10" 
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5 opacity-70" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* --- Body (Description & Stats) --- */}
                <div className="flex-1 flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground line-clamp-2 font-medium leading-relaxed min-h-[2.5em]">
                        {pipeline.description || "No description provided."}
                    </p>
                    
                    <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/20">
                        {/* Row 1: Primary Metrics */}
                        <div className="grid grid-cols-3 gap-2">
                            {/* Success Rate */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                    <Zap className="h-2 w-2 text-amber-500" /> Success
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {successRate !== null ? (
                                        <span className={cn(
                                            "text-xs font-black tabular-nums",
                                            successRate > 90 ? "text-emerald-500" : successRate > 70 ? "text-amber-500" : "text-destructive"
                                        )}>{successRate}%</span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground/60 font-medium">—</span>
                                    )}
                                </div>
                            </div>

                            {/* Total Volume */}
                            <div className="flex flex-col gap-1 border-l border-border/20 pl-2">
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                    <Database className="h-2 w-2 text-blue-500" /> Volume
                                </span>
                                <span className="text-xs font-black tabular-nums truncate">
                                    {stats ? formatNumber(stats.total_records_processed) : "—"}
                                </span>
                            </div>

                            {/* Stability / Rejections */}
                            <div className="flex flex-col gap-1 border-l border-border/20 pl-2">
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                    <ShieldAlert className="h-2 w-2 text-amber-500" /> Stability
                                </span>
                                <span className={cn(
                                    "text-xs font-black tabular-nums",
                                    stats?.total_quarantined === 0 ? "text-emerald-500" : "text-amber-500"
                                )}>
                                    {stats ? formatNumber(stats.total_quarantined) : "—"}
                                </span>
                            </div>
                        </div>

                        {/* Row 2: Secondary Counters */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/10">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                    <span className="text-[9px] font-bold tabular-nums text-foreground/80">{stats?.successful_runs ?? 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <XCircle className="h-2.5 w-2.5 text-destructive" />
                                    <span className="text-[9px] font-bold tabular-nums text-foreground/80">{stats?.failed_runs ?? 0}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 text-muted-foreground/60">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-mono font-bold tracking-tighter">
                                    {formatDuration(stats?.average_duration_seconds)}
                                </span>
                            </div>
                        </div>

                        {/* Row 3: Timeline & Schedule */}
                        <div className="pt-2.5 border-t border-border/10 space-y-2.5">
                            {/* Last Run Info */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 rounded-md bg-muted/50 text-muted-foreground/60">
                                        <History className="h-2.5 w-2.5" />
                                    </div>
                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider">Last Sync</span>
                                </div>
                                {stats?.last_run_at ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn(
                                            "text-[9px] font-black uppercase tracking-tighter flex items-center gap-1",
                                            isSuccess ? "text-emerald-500" : isFailed ? "text-destructive" : "text-amber-500"
                                        )}>
                                            {isSuccess && <CheckCircle2 className="h-2 w-2" />}
                                            {isFailed && <XCircle className="h-2 w-2" />}
                                            {lastJob?.status}
                                        </div>
                                        <span className="text-[10px] font-bold text-foreground/60 tabular-nums">
                                            {formatDistanceToNow(new Date(stats.last_run_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-[9px] font-black text-muted-foreground/30 uppercase">Never</span>
                                )}
                            </div>

                            {/* Next Scheduled Run */}
                            {pipeline.schedule_enabled && stats?.next_scheduled_run && (
                                <div className="flex items-center justify-between bg-primary/5 p-2 rounded-xl border border-primary/10">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-2.5 w-2.5 text-primary" />
                                        <span className="text-[8px] text-primary/70 font-black uppercase tracking-wider">Next Sync</span>
                                    </div>
                                    <span className="text-[9px] font-black text-primary animate-pulse-slow">
                                        {formatDistanceToNow(new Date(stats.next_scheduled_run), { addSuffix: true })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Footer (Actions) --- */}
                <div className="mt-5 pt-0 flex items-center justify-between gap-3">
                    {/* Schedule Badge */}
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/80 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/20">
                        <Calendar className="h-3 w-3 opacity-60" />
                        <span className="truncate max-w-20 font-mono">{pipeline.schedule_cron || 'Manual'}</span>
                    </div>

                    {/* Quick Run Button */}
                    <div className="flex items-center">
                        <Button 
                            size="sm" 
                            className="h-9 rounded-xl pl-4 pr-3 text-xs font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-px transition-all bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                            onClick={() => onRun?.(pipeline.id)}
                            disabled={!onRun}
                        >
                            <Zap className="h-3.5 w-3.5 fill-current" />
                            Run
                        </Button>
                    </div>
                </div>
            </div>

            <RunPipelineDialog 
                pipeline={pipeline} 
                open={isRunDialogOpen} 
                onOpenChange={setIsRunDialogOpen} 
                onRun={onRun ?? (() => {})} 
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Pipeline?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove "{pipeline.name}" and all its history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate(pipeline.id)}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};