import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Terminal, ChevronRight, Copy, Calendar, Timer, 
    RotateCw, Share2, MoreHorizontal, ExternalLink,
    StopCircle, RefreshCw, ClipboardList, GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Job, type Pipeline } from '@/lib/api';

interface JobDetailsHeaderProps {
    job: Job;
    pipeline?: Pipeline;
    elapsed: string;
    view: 'summary' | 'logs' | 'graph';
    setView: (view: 'summary' | 'logs' | 'graph') => void;
    isRefetchingRun: boolean;
    onRefetch: () => void;
    onCancel: () => void;
    onRetry: () => void;
    isCancelPending: boolean;
    isRetryPending: boolean;
    copyToClipboard: (text: string, label: string) => void;
}

export const JobDetailsHeader: React.FC<JobDetailsHeaderProps> = ({
    job,
    pipeline,
    elapsed,
    view,
    setView,
    isRefetchingRun,
    onRefetch,
    onCancel,
    onRetry,
    isCancelPending,
    isRetryPending,
    copyToClipboard
}) => {
    const navigate = useNavigate();

    return (
        <div className="px-4 md:px-6 py-4 border-b border-border/40 bg-muted/5 flex flex-col xl:flex-row xl:items-center justify-between sticky top-0 z-10 shrink-0 backdrop-blur-xl gap-4">
            {/* --- Left: Identity & Metadata --- */}
            <div className="flex items-center gap-4 md:gap-5 min-w-0">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                    <Terminal className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    {/* Breadcrumbs - Hidden on very small screens, truncated on medium */}
                    <div className="hidden sm:flex items-center gap-2 text-[9px] md:text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden">
                        <span className="hover:text-primary cursor-pointer transition-colors shrink-0" onClick={() => navigate('/jobs')}>Executions</span>
                        <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                        <span className="hover:text-primary cursor-pointer transition-colors truncate max-w-[100px] md:max-w-[200px]" onClick={() => navigate(`/pipelines/${job.pipeline_id}`)}>
                            {pipeline?.name || `Pipeline #${job.pipeline_id}`}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 md:gap-2.5 group cursor-pointer min-w-0" onClick={() => copyToClipboard(job.id.toString(), 'Job ID')}>
                            <h3 className="text-lg md:text-xl font-black tracking-tight text-foreground uppercase truncate">
                                Run <span className="text-primary">#{job.id}</span>
                            </h3>
                            <Copy className="h-3 w-3 md:h-3.5 md:w-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                        </div>
                        <StatusBadge status={job.status || 'Unknown'} className="h-5 text-[8px] md:text-[9px] px-2 shrink-0" />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] md:text-[10px] text-muted-foreground/60 font-bold">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="h-3 w-3" />
                            {job.started_at ? new Date(job.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}
                        </span>
                        <span className="hidden sm:block h-1 w-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1.5 text-primary/80 whitespace-nowrap">
                            <Timer className="h-3 w-3" />
                            {elapsed}
                        </span>
                    </div>
                </div>
            </div>

            {/* --- Right: Integrated Toolbar --- */}
            <div className="flex items-center justify-between xl:justify-end gap-3 w-full xl:w-auto bg-muted/20 md:bg-transparent p-1 md:p-0 rounded-2xl md:rounded-none border border-border/20 md:border-0 shadow-inner md:shadow-none">
                {/* View Switcher (Icons Only with Tooltips) */}
                <div className="flex bg-background/40 md:bg-muted/30 p-1 rounded-xl border border-border/40 gap-1 shadow-sm">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setView('summary')}
                                className={cn(
                                    "w-9 h-8 rounded-lg transition-all flex items-center justify-center",
                                    view === 'summary' ? "bg-background text-primary shadow-sm ring-1 ring-black/5" : "text-muted-foreground/60 hover:text-foreground"
                                )}
                            >
                                <ClipboardList className="h-4 w-4" /> 
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest">Execution Summary</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setView('logs')}
                                className={cn(
                                    "w-9 h-8 rounded-lg transition-all flex items-center justify-center",
                                    view === 'logs' ? "bg-background text-primary shadow-sm ring-1 ring-black/5" : "text-muted-foreground/60 hover:text-foreground"
                                )}
                            >
                                <Terminal className="h-4 w-4" /> 
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest">System Logs</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setView('graph')}
                                className={cn(
                                    "w-9 h-8 rounded-lg transition-all flex items-center justify-center",
                                    view === 'graph' ? "bg-background text-primary shadow-sm ring-1 ring-black/5" : "text-muted-foreground/60 hover:text-foreground"
                                )}
                            >
                                <GitBranch className="h-4 w-4" /> 
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest">Visual Trace (Graph)</TooltipContent>
                    </Tooltip>
                </div>

                <div className="hidden md:block h-6 w-px bg-border/40 mx-1" />

                {/* Execution Controls & Dropdown */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        {job.status === 'running' && (
                            <Button 
                                variant="destructive" 
                                size="sm"
                                className="h-8 md:h-9 w-auto rounded-lg md:rounded-xl shadow-md shadow-destructive/10 gap-2 px-3 md:px-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider"
                                onClick={onCancel}
                                disabled={isCancelPending}
                            >
                                <StopCircle className="h-3.5 w-3.5" /> 
                                <span className="hidden sm:inline">Terminate</span>
                                <span className="sm:hidden">Stop</span>
                            </Button>
                        )}
                        
                        {(job.status === 'failed' || job.status === 'cancelled') && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 md:h-9 w-auto rounded-lg md:rounded-xl shadow-sm gap-2 px-3 md:px-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider border-border/60 hover:bg-primary/5 hover:border-primary/30"
                                onClick={onRetry}
                                disabled={isRetryPending}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isRetryPending && "animate-spin")} /> 
                                <span className="hidden sm:inline">Re-Execute</span>
                                <span className="sm:hidden">Retry</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center bg-background/40 md:bg-muted/30 rounded-xl p-1 border border-border/40">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={onRefetch}
                                    disabled={isRefetchingRun}
                                    className="h-7 w-7 md:h-8 md:w-8 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-background shadow-none"
                                >
                                    <RotateCw className={cn("h-3.5 w-3.5", isRefetchingRun && "animate-spin")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest">Sync Telemetry</TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 md:h-8 md:w-8 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-background"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest">More Actions</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 border-border/60 shadow-2xl backdrop-blur-xl bg-background/90">
                                <DropdownMenuItem className="rounded-lg gap-2.5 cursor-pointer font-bold text-[10px] uppercase tracking-wider py-2" onClick={() => copyToClipboard(window.location.href, 'Direct Link')}>
                                    <Share2 className="h-3.5 w-3.5 opacity-70" /> Copy Direct URL
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg gap-2.5 cursor-pointer font-bold text-[10px] uppercase tracking-wider py-2" onClick={() => navigate(`/pipelines/${job.pipeline_id}`)}>
                                    <ExternalLink className="h-3.5 w-3.5 opacity-70" /> Pipeline Designer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
};