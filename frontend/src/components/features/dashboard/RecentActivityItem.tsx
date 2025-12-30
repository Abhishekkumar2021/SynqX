/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
    MoreVertical, FileText, RefreshCw, Terminal, 
    Workflow
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

interface RecentActivityItemProps {
    job: any;
}

const formatDuration = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
};

export const RecentActivityItem: React.FC<RecentActivityItemProps> = ({ job }) => {
    const navigate = useNavigate();

    return (
        <div
            className={cn(
                "group grid grid-cols-12 gap-4 items-center px-6 py-4 transition-all duration-200 cursor-pointer relative",
                "border-b border-border/30 last:border-0 hover:bg-muted/40",
                "hover:pl-7 transition-[padding] duration-200" // Subtle shift interaction
            )}
            onClick={() => navigate(`/jobs/${job.id}`)}
        >
            {/* Identity */}
            <div className="col-span-12 md:col-span-5 flex items-center gap-4 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/5 border border-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm group-hover:bg-primary/10 transition-colors">
                    <Workflow className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {job.pipeline_name || `Pipeline ${job.pipeline_id}`}
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60">Job #{job.id}</span>
                </div>
            </div>

            {/* Status */}
            <div className="col-span-6 md:col-span-2">
                <StatusBadge status={job.status} className="h-6 px-2.5 text-[10px] font-bold uppercase tracking-wider" />
            </div>

            {/* Duration */}
            <div className="col-span-6 md:col-span-2 flex flex-col justify-center">
                <span className="text-xs font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {formatDuration(job.execution_time_ms)}
                </span>
            </div>

            {/* Timestamp */}
            <div className="col-span-6 md:col-span-2 flex flex-col justify-center">
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
                </span>
            </div>

            {/* Actions */}
            <div className="col-span-12 md:col-span-1 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-xl p-1">
                        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => navigate(`/jobs/${job.id}`)}>
                            <Terminal className="h-3.5 w-3.5 opacity-70" /> Inspect Logic
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2" onClick={() => navigate(`/jobs/${job.id}/logs`)}>
                            <FileText className="h-3.5 w-3.5 opacity-70" /> Audit Logs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/40 my-1" />
                        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg font-medium text-xs py-2">
                            <RefreshCw className="h-3.5 w-3.5 opacity-70" /> Re-execute
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
