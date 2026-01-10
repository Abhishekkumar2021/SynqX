import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { 
    User, FileText, Activity, Clock, Shield, Database, 
    Cable, Key, Bell, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type AuditLog, type User as UserType } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AuditLogDetail } from './AuditLogDetail';
import { Button } from '@/components/ui/button';
import { formatEventName } from '@/lib/utils/audit';

interface AuditLogGridItemProps {
    log: AuditLog;
    users: UserType[];
}

export const AuditLogGridItem: React.FC<AuditLogGridItemProps> = ({ log, users }) => {
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
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col p-5 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
                {/* Status Indicator Bar */}
                <div className={cn(
                    "absolute top-0 left-0 w-full h-1",
                    log.status === 'success' ? 'bg-emerald-500/20' : 'bg-destructive/20'
                )} />

                <div className="flex items-start justify-between mb-4">
                    <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/5 transition-transform group-hover:scale-110 group-hover:rotate-3", eventInfo.bgColor, eventInfo.color)}>
                        {eventInfo.icon}
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-muted-foreground/40 font-bold text-[9px] uppercase tracking-tighter mb-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <Badge variant="outline" className={cn("h-4 px-1.5 text-[8px] font-bold uppercase tracking-widest", log.status === 'success' ? 'text-emerald-500 border-emerald-500/20' : 'text-destructive border-destructive/20')}>
                            {log.status}
                        </Badge>
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/90 group-hover:text-primary transition-colors">
                        {formatEventName(log.event_type)}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                        {log.details?.message || JSON.stringify(log.details)}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-border/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 max-w-[70%]">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-[10px] font-bold text-foreground/70 truncate">{user?.full_name || user?.email || 'System'}</span>
                    </div>
                    <Button 
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted/20 group-hover:bg-primary/10 group-hover:text-primary transition-all"
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
