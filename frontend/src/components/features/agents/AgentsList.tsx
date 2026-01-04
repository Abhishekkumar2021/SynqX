import React from 'react';
import { 
  Activity, 
  Cpu, 
  Monitor, 
  Trash2, 
  ExternalLink,
  Server,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Agent {
    id: number;
    name: string;
    status: string;
    version?: string;
    client_id: string;
    last_heartbeat_at?: string;
    system_info?: {
        os?: string;
        python_version?: string;
        hostname?: string;
    };
    tags?: {
        groups?: string[];
    };
}

interface AgentsListProps {
    agents: Agent[];
    isLoading: boolean;
    viewMode: 'grid' | 'list';
    onInspect: (agent: Agent) => void;
    onDelete: (id: number) => void;
}

const AgentCard = ({ agent, onInspect, onDelete }: { agent: Agent, onInspect: (a: Agent) => void, onDelete: (id: number) => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative h-full"
        >
            <div className="relative flex flex-col h-full rounded-[2.5rem] border border-border/60 bg-card/40 backdrop-blur-md p-6 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
                {/* Status Glow */}
                {agent.status === 'online' && (
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
                )}

                <div className="flex items-start justify-between mb-5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm transition-all duration-500 group-hover:scale-110",
                            agent.status === 'online' 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-emerald-500/10 dark:text-emerald-400" 
                                : "bg-muted/50 border-border text-muted-foreground"
                        )}>
                            <Activity className={cn("h-7 w-7", agent.status === 'online' && "animate-pulse")} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-black text-lg tracking-tight text-foreground line-clamp-1">
                                {agent.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Badge variant={agent.status === 'online' ? "default" : "secondary"} className={cn(
                                    "text-[10px] h-5 rounded-full px-2 font-black uppercase",
                                    agent.status === 'online' && "bg-emerald-500 hover:bg-emerald-600 text-white"
                                )}>
                                    {agent.status}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors" onClick={(e) => { e.stopPropagation(); onInspect(agent); }}>
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                        {agent.tags?.groups?.map((g: string) => (
                            <Badge key={g} variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary/70 px-2 py-0.5 rounded-lg">
                                {g}
                            </Badge>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/30 border border-border/20">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                <Monitor className="h-2 w-2 text-blue-500" /> Platform
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80 truncate">
                                {agent.system_info?.os || 'Unknown'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-border/20 pl-3">
                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                <Cpu className="h-2 w-2 text-purple-500" /> Version
                            </span>
                            <span className="text-[11px] font-black tabular-nums text-foreground/80">
                                {agent.version || 'v1.0.0'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-muted-foreground/60">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>Last active: {agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString() : 'Never'}</span>
                        </div>
                        <span className="font-mono text-[9px] opacity-40">{agent.client_id.substring(0, 12)}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const AgentRow = ({ agent, onInspect, onDelete }: { agent: Agent, onInspect: (a: Agent) => void, onDelete: (id: number) => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="group"
        >
            <div className="relative grid grid-cols-12 gap-4 items-center px-8 py-4 border-b border-border/30 last:border-0 hover:bg-muted/40 transition-all duration-200 cursor-pointer overflow-hidden">
                <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300",
                    agent.status === 'online' ? "bg-emerald-500" : "bg-muted-foreground/20",
                    "scale-y-0 group-hover:scale-y-100"
                )} />

                <div className="col-span-12 md:col-span-4 flex items-center gap-4 min-w-0">
                    <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
                        agent.status === 'online' 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                            : "bg-muted/40 border-border/40 text-muted-foreground"
                    )}>
                        <Server className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground tracking-tight truncate mb-0.5">
                            {agent.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-muted/30 border-border/40 px-1.5 py-0 rounded-md">
                                {agent.client_id.substring(0, 12)}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 hidden md:flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                        <Badge variant={agent.status === 'online' ? "default" : "secondary"} className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0 rounded",
                            agent.status === 'online' && "bg-emerald-500"
                        )}>
                            {agent.status}
                        </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                        {agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString() : 'Offline'}
                    </span>
                </div>

                <div className="col-span-3 hidden md:flex flex-wrap gap-1 border-l border-border/20 pl-6">
                    {agent.tags?.groups?.slice(0, 2).map((g: string) => (
                        <Badge key={g} variant="outline" className="text-[8px] font-black uppercase bg-primary/5 border-primary/10 text-primary/60 px-1.5 rounded-md">
                            {g}
                        </Badge>
                    ))}
                    {(agent.tags?.groups?.length || 0) > 2 && (
                        <span className="text-[9px] font-black text-muted-foreground/40 mt-1 ml-1">
                            +{(agent.tags?.groups?.length || 0) - 2} more
                        </span>
                    )}
                </div>

                <div className="col-span-2 hidden md:flex flex-col justify-center gap-1 border-l border-border/20 pl-6">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Monitor className="h-3 w-3 opacity-40" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-foreground/70">{agent.system_info?.os || 'Linux'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Cpu className="h-3 w-3 opacity-40" />
                        <span className="text-[10px] font-black tabular-nums">{agent.version || 'v1.0.0'}</span>
                    </div>
                </div>

                <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => onInspect(agent)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export const AgentsList: React.FC<AgentsListProps> = ({
    agents,
    isLoading,
    viewMode,
    onInspect,
    onDelete
}) => {
    if (isLoading) {
        return (
            <div className="flex-1 overflow-hidden p-8">
                <div className={cn(
                    "grid gap-6",
                    viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                )}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={cn(
                            "rounded-[2.5rem] bg-muted/20 animate-pulse border border-border/40",
                            viewMode === 'grid' ? "h-64" : "h-20"
                        )} />
                    ))}
                </div>
            </div>
        );
    }

    if (agents.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                    <div className="relative h-24 w-24 rounded-[2rem] glass-card flex items-center justify-center mx-auto shadow-2xl border-primary/20 border-2">
                        <Server className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                </div>
                <div className="space-y-2 max-w-sm">
                    <h3 className="text-2xl font-black tracking-tight text-foreground">No agents connected</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        To enable remote processing, install the SynqX agent on your servers or local machines.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
            {viewMode === 'list' && (
                <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-border/40 bg-muted/30 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 backdrop-blur-md">
                    <div className="col-span-4">Agent Identity</div>
                    <div className="col-span-2 hidden md:block">Status & Heartbeat</div>
                    <div className="col-span-3 hidden md:block pl-6">Active Groups</div>
                    <div className="col-span-2 hidden md:block pl-6">System Info</div>
                    <div className="col-span-1 text-right"></div>
                </div>
            )}
            
            <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? (
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {agents.map((agent) => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                onInspect={onInspect}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {agents.map((agent) => (
                            <AgentRow
                                key={agent.id}
                                agent={agent}
                                onInspect={onInspect}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};