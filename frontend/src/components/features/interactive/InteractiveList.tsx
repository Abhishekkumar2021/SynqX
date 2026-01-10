import React from 'react';
import { 
    Search, Database, Clock, ChevronRight, 
    Cpu, Activity,
    Terminal, MoreVertical, Play} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type EphemeralJobResponse } from '@/lib/api/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InteractiveListProps {
    jobs: EphemeralJobResponse[];
    isLoading: boolean;
    viewMode: 'grid' | 'list';
    onInspect: (job: EphemeralJobResponse) => void;
}


const JobCard = ({ job, onInspect }: { job: EphemeralJobResponse, onInspect: (j: EphemeralJobResponse) => void }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative h-full"
        >
            <div 
                className="relative flex flex-col rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-xl p-6 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 cursor-pointer h-full group/card"
                onClick={() => onInspect(job)}
            >
                {/* Status Glow */}
                <div className={cn(
                    "absolute -top-24 -right-24 h-48 w-48 blur-[80px] opacity-10 transition-opacity duration-500 group-hover/card:opacity-20",
                    job.status === 'success' ? "bg-emerald-500" : job.status === 'failed' ? "bg-destructive" : "bg-primary"
                )} />

                <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover/card:scale-110 group-hover/card:rotate-3",
                            job.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            job.status === 'failed' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                            "bg-primary/10 border-primary/20 text-primary"
                        )}>
                            {job.job_type === 'explorer' ? <Search size={26} /> : 
                             job.job_type === 'metadata' ? <Database size={26} /> : <Terminal size={26} />}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h3 className="font-bold text-lg text-foreground tracking-tight uppercase group-hover/card:text-primary transition-colors">
                                {job.job_type}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Badge
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border shadow-xs",
                                        job.status === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                        job.status === 'failed' ? "bg-destructive/10 text-destructive border-destructive/20" :
                                        "bg-muted/50 text-muted-foreground border-border/40"
                                    )}
                                >
                                    {job.status}
                                </Badge>
                                {job.agent_group && (
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase bg-primary/5 text-primary border-primary/20 px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-xs">
                                        <Cpu size={10} /> {job.agent_group}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl p-1.5">
                                <DropdownMenuItem onClick={() => onInspect(job)} className="rounded-xl font-bold text-[11px] uppercase tracking-widest py-3 cursor-pointer gap-3">
                                    <ChevronRight className="h-4 w-4 text-primary" /> Review Forensics
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl font-bold text-[11px] uppercase tracking-widest py-3 cursor-pointer gap-3 text-emerald-600 dark:text-emerald-400">
                                    <Play className="h-4 w-4" /> Re-execute Task
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 relative z-10">
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 min-h-24 relative overflow-hidden group-hover/card:bg-muted/30 transition-colors">
                        <code className="text-[11px] font-mono text-foreground/80 leading-relaxed block break-all line-clamp-4">
                            {job.payload.query || job.payload.action || "System-level ad-hoc execution manifest."}
                        </code>
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-muted/20 group-hover/card:from-muted/30 to-transparent" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                            <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-3 w-3 text-blue-500" /> Duration
                            </span>
                            <span className="text-sm font-bold tabular-nums text-foreground">
                                {job.execution_time_ms || 0}ms
                            </span>
                        </div>

                        <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                            <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-3 w-3 text-emerald-500" /> Output
                            </span>
                            <span className="text-sm font-bold tabular-nums text-foreground">
                                {job.result_summary?.count || 0} <span className="text-[10px] opacity-40 uppercase ml-1">rows</span>
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto pt-5 border-t border-border/20 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">Captured At</span>
                            <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">
                                {format(new Date(job.created_at), 'MMM d, HH:mm:ss')}
                            </span>
                        </div>
                        
                        <Button
                            variant="ghost" 
                            size="sm"
                            className="h-10 px-4 rounded-xl text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 gap-2 transition-all -mr-2"
                            onClick={(e) => { e.stopPropagation(); onInspect(job); }}
                        >
                            Inspect <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const JobRow = ({ job, onInspect }: { job: EphemeralJobResponse, onInspect: (j: EphemeralJobResponse) => void }) => {
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
                onClick={() => onInspect(job)}
            >
                <div className="col-span-12 md:col-span-5 flex items-center gap-4 min-w-0">
                    <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-xs shrink-0",
                        "bg-muted/40 border-border/40 text-muted-foreground group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5"
                    )}>
                        {job.job_type === 'explorer' ? <Search size={18} /> : 
                         job.job_type === 'metadata' ? <Database size={18} /> : <Terminal size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground tracking-tight truncate mb-0.5 uppercase">
                            {job.job_type} Task
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60  truncate">
                                {job.payload.query || job.payload.action || "Interactive Lab Task"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 hidden md:flex flex-col justify-center gap-1 border-l border-border/20 pl-4">
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0 rounded border",
                                job.status === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                        >
                            {job.status}
                        </Badge>
                    </div>
                    {job.agent_group ? (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 opacity-80">
                            <Cpu size={10} /> {job.agent_group}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-primary opacity-80">
                            <Cpu size={10} /> Internal Agent
                        </div>
                    )}
                </div>

                <div className="col-span-2 hidden md:flex flex-col justify-center gap-1 border-l border-border/20 pl-4">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-2.5 w-2.5 text-blue-500/60" />
                        <span className="text-[10px] font-bold text-foreground/70 font-mono">
                            {job.execution_time_ms || 0}ms
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Activity className="h-2.5 w-2.5 text-muted-foreground/40" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                            {job.result_summary?.count || 0} rows
                        </span>
                    </div>
                </div>

                <div className="col-span-2 hidden md:flex flex-col justify-center gap-1 border-l border-border/20 pl-4">
                    <span className="text-[10px] font-bold text-foreground/70 tracking-tight uppercase">
                        {format(new Date(job.created_at), 'MMM d')}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                        {format(new Date(job.created_at), 'HH:mm:ss')}
                    </span>
                </div>

                <div className="col-span-12 md:col-span-1 flex items-center justify-end pr-2">
                    <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={() => onInspect(job)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const InteractiveList: React.FC<InteractiveListProps> = ({ jobs, isLoading, viewMode, onInspect }) => {
    if (isLoading) {
        return (
            <div className="flex-1 overflow-hidden p-6">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                                </div>
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-6 border-b border-border/30">
                                <Skeleton className="h-8 w-8 rounded-xl" />
                                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                    <div className="relative h-24 w-24 rounded-[2.5rem] glass-card flex items-center justify-center mx-auto shadow-2xl border-primary/20 border-2">
                        <Activity className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                </div>
                <div className="space-y-2 max-w-sm mx-auto uppercase tracking-widest  opacity-60">
                    <h3 className="text-2xl font-bold text-foreground">Laboratory Empty</h3>
                    <p className="text-sm text-muted-foreground font-medium">No ad-hoc history detected.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
            {viewMode === 'list' && (
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                    <div className="col-span-12 md:col-span-5">Identity & Context</div>
                    <div className="col-span-2 hidden md:block">Status & Routing</div>
                    <div className="col-span-2 hidden md:block">Performance</div>
                    <div className="col-span-2 hidden md:block">Time Sequence</div>
                    <div className="col-span-1 hidden md:block text-right pr-4">Op</div>
                </div>
            )}
            
            <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {jobs.map(job => (
                            <JobCard key={job.id} job={job} onInspect={onInspect} />
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {jobs.map(job => (
                            <JobRow key={job.id} job={job} onInspect={onInspect} />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
