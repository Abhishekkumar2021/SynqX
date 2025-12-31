/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
    User, FileText, 
    Activity, Clock, Shield, Database, Cable, Key, Bell,
    ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type AuditLog, type User as UserType } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AuditLogDetail } from './AuditLogDetail';
import { Button } from '@/components/ui/button';
import { formatEventName } from '@/lib/utils/audit';

interface AuditLogListItemProps {
    log: AuditLog;
    users: UserType[];
}

export const AuditLogListItem: React.FC<AuditLogListItemProps> = ({ log, users }) => {
    const [showDetails, setShowDetails] = useState(false);
    const user = users.find(u => u.id === log.user_id);
    
    const getEventTypeInfo = (eventType: string) => {
        const [domain, action] = eventType.split('.');
        const info = {
            icon: <FileText className="h-4 w-4" />,
            color: 'text-gray-500',
            bgColor: 'bg-gray-500/10',
            label: action || domain
        };

        switch (domain) {
            case 'user':
                info.icon = <User className="h-4 w-4" />;
                info.color = 'text-blue-500';
                info.bgColor = 'bg-blue-500/10';
                break;
            case 'pipeline':
                info.icon = <Activity className="h-4 w-4" />;
                info.color = 'text-purple-500';
                info.bgColor = 'bg-purple-500/10';
                break;
            case 'connection':
                info.icon = <Cable className="h-4 w-4" />;
                info.color = 'text-cyan-500';
                info.bgColor = 'bg-cyan-500/10';
                break;
            case 'asset':
                info.icon = <Database className="h-4 w-4" />;
                info.color = 'text-indigo-500';
                info.bgColor = 'bg-indigo-500/10';
                break;
            case 'workspace':
                info.icon = <Shield className="h-4 w-4" />;
                info.color = 'text-amber-500';
                info.bgColor = 'bg-amber-500/10';
                break;
            case 'api_key':
                info.icon = <Key className="h-4 w-4" />;
                info.color = 'text-rose-500';
                info.bgColor = 'bg-rose-500/10';
                break;
            case 'alert_config':
                info.icon = <Bell className="h-4 w-4" />;
                info.color = 'text-emerald-500';
                info.bgColor = 'bg-emerald-500/10';
                break;
        }
        return info;
    };

    const eventInfo = getEventTypeInfo(log.event_type);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-muted/30 transition-all group border-b border-border/5"
            >
                {/* Event Signature */}
                <div className="col-span-12 md:col-span-5 flex items-center gap-4">
                    <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/5 transition-transform group-hover:scale-110 group-hover:rotate-3", eventInfo.bgColor, eventInfo.color)}>
                        {React.cloneElement(eventInfo.icon as any, { className: "h-5 w-5" })}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-black uppercase tracking-widest text-foreground/90">{formatEventName(log.event_type)}</span>
                            {log.status !== 'success' && (
                                <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-widest ring-1 ring-destructive/20">
                                    {log.status}
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-sm font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                            {log.details?.message || JSON.stringify(log.details)}
                        </p>
                    </div>
                </div>
                
                {/* Actor */}
                <div className="col-span-2 hidden md:flex items-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 max-w-full">
                                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0 ring-1 ring-primary/20 shadow-sm">
                                        {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-foreground truncate leading-none mb-1">{user?.full_name || 'System'}</span>
                                        <span className="text-[9px] text-muted-foreground font-medium truncate opacity-50 italic">{user?.email || 'automated'}</span>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="rounded-xl border-border/60 shadow-2xl p-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
                                        {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-xs font-black text-foreground">{user?.full_name || 'System Service'}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{user?.email || 'synqx-internal'}</p>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Target Resource */}
                <div className="col-span-3 hidden md:flex items-center">
                    <div className="flex flex-col gap-1">
                        {log.target_type ? (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.15em] bg-muted/20 border-border/40 text-muted-foreground/70 px-2 py-0">
                                    {log.target_type}
                                </Badge>
                                <span className="text-[11px] font-mono font-bold text-primary/60 tracking-tighter">ID: {log.target_id}</span>
                            </div>
                        ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Platform Level</span>
                        )}
                    </div>
                </div>
                
                {/* Timestamp & Actions */}
                <div className="col-span-2 flex justify-end items-center gap-4">
                    <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground/60 font-black text-[10px] uppercase tracking-tighter">
                            <Clock className="h-3 w-3 opacity-40" />
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <span className="text-[8px] text-muted-foreground/30 font-bold uppercase tabular-nums">
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                        </span>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-primary/10 hover:text-primary shrink-0 bg-muted/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(true);
                        }}
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </motion.div>

            <AuditLogDetail 
                log={log} 
                user={user} 
                open={showDetails} 
                onOpenChange={setShowDetails} 
                eventTypeInfo={eventInfo} 
            />
        </>
    );
};