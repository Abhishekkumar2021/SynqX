import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, User, Code, FileText, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type AuditLogRead, type User as UserType } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AuditLogListItemProps {
    log: AuditLogRead;
    users: UserType[];
}

export const AuditLogListItem: React.FC<AuditLogListItemProps> = ({ log, users }) => {
    const user = users.find(u => u.id === log.user_id);
    
    const getEventTypeInfo = (eventType: string) => {
        const [domain] = eventType.split('.');
        switch (domain) {
            case 'user': return { icon: <User className="h-3.5 w-3.5" />, color: 'text-blue-500' };
            case 'pipeline': return { icon: <Activity className="h-3.5 w-3.5" />, color: 'text-purple-500' };
            case 'workspace': return { icon: <Code className="h-3.5 w-3.5" />, color: 'text-amber-500' };
            default: return { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-gray-500' };
        }
    };

    const { icon, color } = getEventTypeInfo(log.event_type);

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors"
        >
            <div className="col-span-12 md:col-span-5 flex items-center gap-4">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-muted", color)}>
                    {React.cloneElement(icon, { className: "h-4 w-4"})}
                </div>
                <div className="flex flex-col">
                    <span className="font-mono text-xs text-foreground font-bold">{log.event_type}</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <p className="text-xs text-muted-foreground truncate max-w-sm">
                                    {log.details?.message || JSON.stringify(log.details)}
                                </p>
                            </TooltipTrigger>
                            <TooltipContent>
                                <pre className="text-xs max-w-md whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            
            <div className="col-span-2 hidden md:flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">{user?.email || `User #${log.user_id}`}</span>
            </div>

            <div className="col-span-4 hidden md:flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                    {log.target_type && (
                        <Badge variant="outline" className="mr-2">{log.target_type}</Badge>
                    )}
                    {log.target_id && `#${log.target_id}`}
                </span>
            </div>
            
            <div className="col-span-1 hidden md:flex justify-end items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            {log.status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{log.status}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span className="text-xs text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
            </div>
        </motion.div>
    );
};
