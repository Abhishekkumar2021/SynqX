import React from 'react';
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
        <div className="h-full flex flex-col overflow-hidden">
            <div className="py-6 px-8 shrink-0">
                <h3 className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Security & Health
                </h3>
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                    Automated system notification stream
                </p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-border/20">
                {alerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                        <div className="p-6 bg-muted/20 rounded-[2rem] border border-border/50 mb-4">
                            <Bell className="h-10 w-10 opacity-20" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest italic">No critical alerts</span>
                    </div>
                ) : (
                    <div className="divide-y divide-border/10">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="p-5 hover:bg-muted/20 transition-colors flex gap-4 items-start group">
                                <div className="mt-1 shrink-0 group-hover:scale-110 transition-transform">
                                    {getIcon(alert.level)}
                                </div>
                                <div className="space-y-1 overflow-hidden flex-1">
                                    <p className="text-sm font-bold leading-tight text-foreground/90 group-hover:text-foreground transition-colors">
                                        {alert.message}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                        </p>
                                        <div className="h-1 w-1 rounded-full bg-border" />
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-[0.2em]",
                                            alert.level === 'error' ? 'text-destructive' : 
                                            alert.level === 'warning' ? 'text-amber-500' : 'text-primary'
                                        )}>{alert.level}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};