import React from 'react';
import { Link } from 'react-router-dom';
import { type Alert, acknowledgeAlert } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    AlertCircle, AlertTriangle, CheckCircle2, Info, 
    Check, MoreVertical, Trash2, ExternalLink, Activity, Workflow
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertListItemProps {
    alert: Alert;
}

const getAlertIcon = (level: string) => {
    switch (level) {
        case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
        case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
        case 'error': 
        case 'critical': return <AlertCircle className="h-5 w-5 text-destructive" />;
        default: return <Info className="h-5 w-5 text-blue-500" />;
    }
};

export const AlertListItem: React.FC<AlertListItemProps> = ({ alert }) => {
    const queryClient = useQueryClient();

    const acknowledgeMutation = useMutation({
        mutationFn: (id: number) => acknowledgeAlert(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts-history'] });
            toast.success('Alert acknowledged');
        },
    });

    return (
        <div
            className={cn(
                "group grid grid-cols-12 gap-4 items-center px-6 py-4 transition-all duration-200 relative",
                "border-b border-border/30 last:border-0",
                "hover:bg-muted/30",
                alert.status === 'pending' && "bg-primary/[0.02]",
                "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                "before:bg-primary before:scale-y-0 before:transition-transform before:duration-200",
                "hover:before:scale-y-100"
            )}
        >
            {/* --- Column 1: Identity & Message (5 cols) --- */}
            <div className="col-span-12 md:col-span-5 flex items-start gap-4">
                <div className={cn(
                    "mt-0.5 p-2 rounded-xl border shrink-0 transition-all duration-300",
                    alert.status === 'pending' ? "bg-background border-border shadow-sm" : "bg-muted/30 border-transparent text-muted-foreground/50"
                )}>
                    {getAlertIcon(alert.level)}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "font-semibold text-sm leading-tight",
                            alert.status === 'pending' ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {alert.message}
                        </span>
                        {alert.status === 'pending' && (
                            <Badge variant="outline" className="text-[9px] font-black text-primary border-primary/20 bg-primary/5 uppercase tracking-wider px-1.5 py-0 h-5">
                                New
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Column 2: Pipeline (2 cols) --- */}
            <div className="col-span-6 md:col-span-2">
                {alert.pipeline_id ? (
                    <Link 
                        to={`/pipelines/${alert.pipeline_id}`} 
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group/link w-fit"
                    >
                        <Workflow className="h-3.5 w-3.5 opacity-70 group-hover/link:opacity-100" />
                        <span className="truncate">Pipeline #{alert.pipeline_id}</span>
                    </Link>
                ) : (
                    <span className="text-xs text-muted-foreground/30 italic flex items-center gap-2">
                        <Workflow className="h-3.5 w-3.5 opacity-30" /> No Pipeline
                    </span>
                )}
            </div>

            {/* --- Column 3: Job (2 cols) --- */}
            <div className="col-span-6 md:col-span-2">
                {alert.job_id ? (
                    <Link 
                        to={`/jobs/${alert.job_id}`} 
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group/link w-fit"
                    >
                        <Activity className="h-3.5 w-3.5 opacity-70 group-hover/link:opacity-100" />
                        <span className="truncate">Job #{alert.job_id}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity -ml-1" />
                    </Link>
                ) : (
                    <span className="text-xs text-muted-foreground/30 italic flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 opacity-30" /> No Job
                    </span>
                )}
            </div>

            {/* --- Column 4: Timestamp (2 cols) --- */}
            <div className="col-span-6 md:col-span-2">
                <span className="text-[10px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </span>
            </div>

            {/* --- Column 5: Actions (1 col) --- */}
            <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-1 pr-2">
                {alert.status === 'pending' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        title="Acknowledge"
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                )}
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/60 shadow-xl">
                        <DropdownMenuItem className="text-xs font-bold text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};