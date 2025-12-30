import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import type { DashboardAlert } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardAlertsFeedProps {
    alerts: DashboardAlert[];
}

export const DashboardAlertsFeed: React.FC<DashboardAlertsFeedProps> = ({ alerts }) => {
    const getIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card className="h-full border-none bg-transparent shadow-none overflow-hidden rounded-none flex flex-col">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 shrink-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Bell className="h-4 w-4 text-primary" />
                    Recent Alerts
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                        <Bell className="h-8 w-8 mb-2 opacity-20" />
                        No recent alerts
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="p-3 hover:bg-muted/30 transition-colors flex gap-3 items-start">
                                <div className="mt-0.5 shrink-0">
                                    {getIcon(alert.level)}
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    <p className="text-sm font-medium leading-none truncate">
                                        {alert.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
