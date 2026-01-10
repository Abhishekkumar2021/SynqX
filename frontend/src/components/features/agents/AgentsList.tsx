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
            <div className="relative flex flex-col h-full rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
                {/* Status Glow */}
                {agent.status === 'online' && (
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
                )}

                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300",
                            agent.status === 'online' 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-emerald-500/10" 
                                : "bg-muted/40 border-border/40 text-muted-foreground"
                        )}>
                            <Activity className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
                                {agent.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-md border",
                                    agent.status === 'online'
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        : "bg-muted/50 text-muted-foreground border-border/50"
                                )}>
                                    {agent.status}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); onInspect(agent); }}>
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                        {agent.tags?.groups?.map((g: string) => (
                            <Badge key={g} variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 border-primary/10 text-primary/70 px-2 py-0.5 rounded-md">
                                {g}
                            </Badge>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/20">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                                <Monitor className="h-2 w-2 text-blue-500" /> Platform
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-tight text-foreground/80 truncate">
                                {agent.system_info?.os || 'Unknown'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-border/20 pl-3">
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                                <Cpu className="h-2 w-2 text-purple-500" /> Version
                            </span>
                            <span className="text-[10px] font-bold tabular-nums text-foreground/80">
                                {agent.version || 'v1.0.0'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-muted-foreground/60">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>Last active: {agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString() : 'Never'}</span>
                        </div>
                        <span className="font-mono text-[9px] opacity-40 uppercase tracking-wider">{agent.client_id.substring(0, 8)}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const AgentRow = ({ agent, onInspect }: { agent: Agent, onInspect: (a: Agent) => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="group"
        >
            <div 
                className={cn(
                    "relative grid grid-cols-12 gap-4 items-center px-6 py-3 transition-all duration-200 cursor-pointer",
                    "border-b border-border/30 last:border-0 hover:bg-muted/40",
                    "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                    "before:bg-primary before:scale-y-0 before:transition-transform before:duration-200",
                    "hover:before:scale-y-100"
                )}
                onClick={() => onInspect(agent)}
            >
                {/* Column 1: Identity */}
                <div className="col-span-12 md:col-span-4 flex items-center gap-4 min-w-0">
                    <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-xs shrink-0",
                        agent.status === 'online' 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                            : "bg-muted/40 border-border/40 text-muted-foreground group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5"
                    )}>
                        <Server className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-sm text-foreground tracking-tight truncate">
                                {agent.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-muted/30 border-border/40 px-1.5 py-0 rounded-md">
                                {agent.client_id.substring(0, 8)}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Column 2: Status */}
                <div className="col-span-6 md:col-span-2 flex items-center pl-2">
                    <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={cn(
                            "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0 rounded border w-fit",
                            agent.status === 'online' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted/50 text-muted-foreground border-border/50"
                        )}>
                            {agent.status}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-bold truncate pl-1">
                            {agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at).toLocaleTimeString() : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Column 3: Groups */}
                <div className="col-span-6 md:col-span-3 flex flex-wrap gap-1 border-l border-border/20 pl-4 items-center">
                    {agent.tags?.groups?.slice(0, 2).map((g: string) => (
                        <Badge key={g} variant="outline" className="text-[8px] font-bold uppercase bg-primary/5 border-primary/10 text-primary/70 px-1.5 py-0 rounded-md">
                            {g}
                        </Badge>
                    ))}
                    {(agent.tags?.groups?.length || 0) > 2 && (
                        <span className="text-[9px] font-bold text-muted-foreground/40 ml-1">
                            +{(agent.tags?.groups?.length || 0) - 2}
                        </span>
                    )}
                </div>

                {/* Column 4: System Info */}
                <div className="col-span-6 md:col-span-2 flex flex-col justify-center gap-1 border-l border-border/20 pl-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground/80">
                        <Monitor className="h-2.5 w-2.5 opacity-60" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">{agent.system_info?.os || 'Linux'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground/80">
                        <Cpu className="h-2.5 w-2.5 opacity-60" />
                        <span className="text-[9px] font-mono font-bold">{agent.version || 'v1.0.0'}</span>
                    </div>
                </div>

                {/* Column 5: Actions */}
                <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 pr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onInspect(agent); }}>
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
            <div className="flex-1 overflow-hidden p-6">
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                    <div className="relative h-24 w-24 rounded-[2rem] glass-card flex items-center justify-center mx-auto shadow-2xl border-primary/20 border-2">
                        <Server className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                </div>
                <div className="space-y-2 max-w-sm">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">No agents connected</h3>
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
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                    <div className="col-span-12 md:col-span-4">Agent Identity</div>
                    <div className="col-span-2 hidden md:block">Status & Heartbeat</div>
                    <div className="col-span-3 hidden md:block pl-6">Active Groups</div>
                    <div className="col-span-2 hidden md:block pl-6">System Info</div>
                    <div className="col-span-1 text-right"></div>
                </div>
            )}
            
            <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
                    <div className="divide-y divide-border/30">
                        {agents.map((agent) => (
                            <AgentRow
                                key={agent.id}
                                agent={agent}
                                onInspect={onInspect}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};