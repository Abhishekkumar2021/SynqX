/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type Pipeline, type Job, type PipelineStatsResponse, deletePipeline } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    Workflow, Play, MoreVertical, Settings, History, 
    Trash2, CheckCircle2, XCircle, Loader2, Zap
} from 'lucide-react';
import {
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { PipelineStatusBadge } from './PipelineStatusBadge';
import { RunPipelineDialog } from './RunPipelineDialog';

interface PipelineListItemProps {
    pipeline: Pipeline & { lastJob?: Job; stats?: PipelineStatsResponse };
    onRun: (id: number, versionId?: number) => void;
    onOpenSettings: (pipeline: Pipeline) => void;
    onViewVersions: (pipeline: Pipeline) => void;
    isRunningMutation: boolean;
}

const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '—';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
}

export const PipelineListItem: React.FC<PipelineListItemProps> = ({ pipeline, onRun, onOpenSettings, onViewVersions, isRunningMutation }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);

    const lastJob = pipeline.lastJob;
    const isSuccess = lastJob?.status === 'success';
    const isFailed = lastJob?.status === 'failed';
    const isRunning = lastJob?.status === 'running' || lastJob?.status === 'pending';

    const deleteMutation = useMutation({
        mutationFn: () => deletePipeline(pipeline.id),
        onSuccess: () => {
            toast.success("Pipeline deleted");
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            setIsDeleteDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error("Deletion Failed", {
                description: err.response?.data?.detail?.message || "There was an error deleting the pipeline."
            });
        }
    });

    return (
        <>
            <div
                className={cn(
                    "group grid grid-cols-12 gap-4 items-center px-6 py-3.5 transition-all duration-200 cursor-pointer relative",
                    "border-b border-border/30 last:border-0",
                    "hover:bg-muted/40",
                    "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                    "before:bg-primary before:scale-y-0 before:transition-transform before:duration-200",
                    "hover:before:scale-y-100"
                )}
                onClick={() => navigate(`/pipelines/${pipeline.id}`)}
            >
                {/* --- Column 1: Identity --- */}
                <div className="col-span-12 md:col-span-4 flex items-center gap-4">
                    <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-xs shrink-0",
                        isRunning ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : 
                        "bg-muted/40 border-border/40 text-muted-foreground group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5"
                    )}>
                        {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Workflow className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm text-foreground tracking-tight truncate">
                                {pipeline.name}
                            </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[90%] font-medium">
                            {pipeline.description || <span className="italic opacity-50 text-[9px]">No description</span>}
                        </div>
                    </div>
                </div>

                {/* --- Column 2: Status --- */}
                <div className="col-span-6 md:col-span-2 flex items-center pl-2">
                    <PipelineStatusBadge status={pipeline.status} />
                </div>

                {/* --- Column 3: Performance/Stats --- */}
                <div className="col-span-6 md:col-span-2 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground">
                        <span className="text-muted-foreground font-black text-[9px] uppercase">{pipeline.stats?.total_runs ?? '0'}</span>
                        <span className="text-muted-foreground/40 font-medium lowercase">runs</span>
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground font-bold">
                        {formatDuration(pipeline.stats?.average_duration_seconds)} avg
                    </div>
                </div>

                {/* --- Column 4: Last Activity --- */}
                <div className="col-span-6 md:col-span-2 flex flex-col justify-center gap-2">
                    {/* Last Run Info */}
                    {pipeline.stats?.last_run_at ? (
                        <div className="flex flex-col gap-0.5">
                            <div className={cn(
                                "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter",
                                isSuccess ? "text-emerald-500" :
                                isFailed ? "text-destructive" :
                                isRunning ? "text-blue-500" : "text-muted-foreground"
                            )}>
                                {isSuccess ? <CheckCircle2 className="h-2.5 w-2.5" /> :
                                 isFailed ? <XCircle className="h-2.5 w-2.5" /> :
                                 isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
                                <span>{lastJob?.status || 'done'}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest whitespace-nowrap">
                                {formatDistanceToNow(new Date(pipeline.stats.last_run_at), { addSuffix: true })}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">Never Run</span>
                    )}

                    {/* Next Run Info (Subtle) */}
                    {pipeline.schedule_enabled && pipeline.stats?.next_scheduled_run && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/20">
                            <Zap className="h-2.5 w-2.5 text-primary fill-current" />
                            <span className="text-[9px] font-black text-primary/80 uppercase tracking-tighter">
                                Next {formatDistanceToNow(new Date(pipeline.stats.next_scheduled_run), { addSuffix: true })}
                            </span>
                        </div>
                    )}
                </div>

                {/* --- Column 5: Actions --- */}
                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all pr-4">
                    <Button
                        variant="default"
                        size="sm"
                        className="h-8 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 transition-all active:scale-95 shrink-0"
                        onClick={(e) => { e.stopPropagation(); onRun(pipeline.id); }}
                        disabled={isRunningMutation}
                    >
                        {isRunningMutation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
                        Run
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/60 shadow-xl p-1" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => setIsRunDialogOpen(true)}>
                                <Play className="h-3.5 w-3.5 opacity-70" /> Run with Options...
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => onViewVersions(pipeline)}>
                                <History className="h-3.5 w-3.5 opacity-70" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => navigate(`/pipelines/${pipeline.id}`)}>
                                <Settings className="h-3.5 w-3.5 opacity-70" /> Configure Logic
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => onOpenSettings(pipeline)}>
                                <Workflow className="h-3.5 w-3.5 opacity-70" /> Pipeline Settings
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
            </div>

            <RunPipelineDialog 
                pipeline={pipeline} 
                open={isRunDialogOpen} 
                onOpenChange={setIsRunDialogOpen} 
                onRun={onRun} 
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black">Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-medium">
                            Are you sure you want to permanently delete <span className="font-bold text-foreground">"{pipeline.name}"</span>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
                        >
                            Delete Pipeline
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
