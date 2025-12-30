import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAlertHistory, acknowledgeAlert, type Alert } from '@/lib/api';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

export const NotificationsBell: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    
    // Enable real-time notifications via WebSocket only for authenticated users
    useNotifications();

    const { data, isLoading } = useQuery({
        queryKey: ['alerts-history'],
        queryFn: () => getAlertHistory(0, 5),
        refetchInterval: 10000,
        enabled: !!token, // Disable if not logged in
    });

    const alerts = data?.items || [];
    const unreadCount = alerts.filter(a => a.status === 'pending').length || 0;

    const acknowledgeMutation = useMutation({
        mutationFn: (id: number) => acknowledgeAlert(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts-history'] });
        },
    });

    const handleAlertClick = (alert: Alert) => {
        if (alert.job_id) {
            navigate(`/jobs/${alert.job_id}`);
            setIsOpen(false);
        }
        if (alert.status === 'pending') {
            acknowledgeMutation.mutate(alert.id);
        }
    };

    const getAlertIcon = (level: string) => {
        switch (level) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'error': 
            case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/10 rounded-full h-10 w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-2.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white border-2 border-background flex items-center justify-center animate-in zoom-in">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass-card rounded-2xl shadow-2xl p-0 overflow-hidden border-border/40">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/40">
                    <DropdownMenuLabel className="p-0 text-sm font-bold">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10"
                            onClick={() => {
                                alerts?.filter(a => a.status === 'pending').forEach(a => acknowledgeMutation.mutate(a.id));
                            }}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                
                <div className="max-h-[350px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading alerts...</div>
                    ) : alerts && alerts.length > 0 ? (
                        <div className="flex flex-col">
                            {alerts.map((alert) => (
                                <div 
                                    key={alert.id}
                                    onClick={() => handleAlertClick(alert)}
                                    className={cn(
                                        "flex gap-3 p-4 border-b border-border/40 hover:bg-muted/10 transition-colors relative group cursor-pointer",
                                        alert.status === 'pending' && "bg-primary/5"
                                    )}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {getAlertIcon(alert.level)}
                                    </div>
                                    <div className="flex flex-col gap-1 pr-4">
                                        <p className={cn(
                                            "text-xs leading-normal",
                                            alert.status === 'pending' ? "font-semibold text-foreground" : "text-muted-foreground"
                                        )}>
                                            {alert.message}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {alert.status === 'pending' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                acknowledgeMutation.mutate(alert.id);
                                            }}
                                            className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"
                                            title="Mark as read"
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <Bell className="h-10 w-10 mb-2" />
                            <p className="text-xs">No notifications yet</p>
                        </div>
                    )}
                </div>
                
                <div className="p-2 bg-muted/10 border-t border-border/40">
                    <Button 
                        variant="ghost" 
                        className="w-full h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-primary"
                        onClick={() => {
                            navigate('/alerts');
                            setIsOpen(false);
                        }}
                    >
                        View all alerts
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
