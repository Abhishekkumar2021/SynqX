import React, { useMemo } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    XCircle,
    Loader2,
    PlayCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
    showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    className,
    showIcon = true
}) => {
    const s = (status || '').toLowerCase();

    const config = useMemo(() => {
        switch (s) {
            case 'completed':
            case 'success':
            case 'healthy':
                return {
                    variant: "success",
                    icon: CheckCircle2,
                    animate: false
                };

            case 'active':
            case 'enabled':
                return {
                    variant: "success",
                    icon: PlayCircle,
                    animate: false
                };

            case 'failed':
            case 'error':
            case 'critical':
                return {
                    variant: "destructive",
                    icon: AlertCircle,
                    animate: false
                };

            case 'broken':
            case 'disconnected':
                return {
                    variant: "destructive",
                    icon: XCircle,
                    animate: false
                };

            case 'running':
            case 'processing':
            case 'syncing':
                return {
                    variant: "info",
                    icon: Loader2,
                    animate: true
                };

            case 'paused':
            case 'suspended':
            case 'warning':
            case 'cancelled':
                return {
                    variant: "warning",
                    icon: AlertCircle,
                    animate: false
                };

            case 'pending':
            case 'waiting':
            case 'queued':
                return {
                    variant: "outline",
                    icon: Clock,
                    animate: false
                };

            default:
                return {
                    variant: "secondary",
                    icon: Clock,
                    animate: false
                };
        }
    }, [s]);

    const Icon = config.icon;

    // Map internal config variant to Badge prop variant
    // We use a type assertion or mapping because our custom config keys match the Badge variants
    const badgeVariant = config.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

    return (
        <Badge
            variant={badgeVariant}
            className={cn(
                "h-6 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider transition-all duration-300 hover:scale-105",
                className
            )}
        >
            {showIcon && (
                <Icon
                    className={cn(
                        "h-3 w-3 mr-1.5",
                        config.animate ? "animate-spin" : ""
                    )}
                />
            )}
            {status || 'Unknown'}
        </Badge>
    );
};