import React, { useMemo } from 'react';
import {
    PauseCircle,
    AlertCircle,
    Workflow,
    Loader2,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PipelineStatusBadgeProps {
    status: string;
    className?: string;
}

export const PipelineStatusBadge: React.FC<PipelineStatusBadgeProps> = ({ status, className }) => {
    const s = (status || '').toLowerCase();

    const config = useMemo(() => {
        switch (s) {
            case 'active':
            case 'success':
            case 'completed':
                return {
                    color: "text-success",
                    bg: "bg-success/10",
                    border: "border-success/20",
                    icon: CheckCircle2,
                    animate: false
                };

            case 'running':
            case 'processing':
            case 'queued':
            case 'pending':
                return {
                    color: "text-info",
                    bg: "bg-info/10",
                    border: "border-info/20",
                    icon: Loader2,
                    animate: true
                };

            case 'paused':
            case 'warning':
            case 'cancelled':
                return {
                    color: "text-warning",
                    bg: "bg-warning/10",
                    border: "border-warning/20",
                    icon: PauseCircle,
                    animate: false
                };

            case 'error':
            case 'failed':
            case 'broken':
                return {
                    color: "text-destructive",
                    bg: "bg-destructive/10",
                    border: "border-destructive/20",
                    icon: AlertCircle,
                    animate: false
                };

            case 'draft':
            case 'idle':
                return {
                    color: "text-muted-foreground",
                    bg: "bg-muted/50",
                    border: "border-border/50",
                    icon: Workflow,
                    animate: false
                };

            default:
                return {
                    color: "text-muted-foreground",
                    bg: "bg-muted",
                    border: "border-border",
                    icon: Clock,
                    animate: false
                };
        }
    }, [s]);

    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                "h-6 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-colors",
                "border backdrop-blur-sm", // Glass effect base
                config.bg,
                config.color,
                config.border,
                className
            )}
        >
            <Icon
                className={cn(
                    "w-3 h-3 mr-1.5",
                    config.animate && "animate-spin"
                )}
            />
            {status || 'Unknown'}
        </Badge>
    );
};