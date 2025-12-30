import React from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, GitBranch, Timer, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { type Job, type Pipeline, cancelJob } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StopCircle } from 'lucide-react';

interface JobsListProps {
    jobs: Job[];
    pipelines: Pipeline[];
    isLoading: boolean;
    selectedJobId: number | null;
    onSelect: (id: number) => void;
    filter: string;
    onFilterChange: (value: string) => void;
}

export const JobsList: React.FC<JobsListProps> = ({
    jobs,
    pipelines,
    isLoading,
    selectedJobId,
    onSelect,
    filter,
    onFilterChange
}) => {
    const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
    const queryClient = useQueryClient();

    const cancelMutation = useMutation({
        mutationFn: cancelJob,
        onSuccess: () => {
            toast.success("Cancellation Requested");
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
        onError: () => toast.error("Failed to cancel job")
    });

    const filteredJobs = React.useMemo(() => {
        let result = jobs;
        if (statusFilter) {
            result = result.filter(j => j.status === statusFilter);
        }
        return result;
    }, [jobs, statusFilter]);

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Search Toolbar */}
            <div className="p-5 border-b border-border/40 bg-muted/10 space-y-4 sticky top-0 z-5">
                <div className="relative group">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                    <Input
                        placeholder="Search by ID or Pipeline..."
                        className="pl-10 h-10 rounded-xl glass-input border-border/20 focus:border-primary/30"
                        value={filter}
                        onChange={(e) => onFilterChange(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {['success', 'failed', 'running', 'pending', 'queued', 'cancelled'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                                    statusFilter === status 
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                                        : "bg-background/50 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1 pt-1">
                    <span>{filteredJobs.length} Executions</span>
                    {statusFilter && (
                        <button 
                            onClick={() => setStatusFilter(null)}
                            className="text-primary hover:underline underline-offset-4 font-black"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="p-5 rounded-2xl border border-border/40 bg-card/40 space-y-4">
                                <div className="flex justify-between"><Skeleton className="h-5 w-24 rounded-lg" /><Skeleton className="h-5 w-16 rounded-lg" /></div>
                                <Skeleton className="h-4 w-48 rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredJobs.map((job: Job) => {
                            const pipelineName = pipelines.find(p => p.id === job.pipeline_id)?.name || `Pipeline #${job.pipeline_id}`;
                            const isSelected = selectedJobId === job.id;

                            return (
                                <div
                                    key={job.id}
                                    onClick={() => onSelect(job.id)}
                                    className={cn(
                                        "group relative flex flex-col gap-3 p-5 transition-all duration-300 cursor-pointer rounded-2xl border",
                                        isSelected
                                            ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10" 
                                            : "bg-card/30 border-border/40 hover:bg-muted/20 hover:border-border/60 hover:translate-x-1"
                                    )}
                                >
                                    {/* Active selection indicator bar */}
                                    {isSelected && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                    )}

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-sm font-black font-mono tracking-tight",
                                                    isSelected ? "text-primary" : "text-foreground"
                                                )}>
                                                    #{job.id}
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors min-w-0">
                                                    <GitBranch className="h-3 w-3 opacity-50 shrink-0" />
                                                    <span className="truncate">{pipelineName}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 opacity-60">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {job.started_at ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true }) : 'Pending'}
                                                </div>
                                                {job.execution_time_ms ? (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground border-l border-border pl-3">
                                                        <Timer className="h-3 w-3" />
                                                        {(job.execution_time_ms / 1000).toFixed(1)}s
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <StatusBadge status={job.status} className="scale-90 origin-top-right shadow-sm" />
                                            {(['running', 'pending', 'queued'].includes(job.status)) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelMutation.mutate(job.id);
                                                    }}
                                                    disabled={cancelMutation.isPending}
                                                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all scale-0 group-hover:scale-100 disabled:opacity-50"
                                                    title="Cancel job"
                                                >
                                                    <StopCircle size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};