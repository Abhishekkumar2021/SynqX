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
                className="relative flex flex-col rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 cursor-pointer h-full"
                onClick={() => onInspect(job)}
            >
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300",
                            job.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                            job.status === 'failed' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                            "bg-primary/10 border-primary/20 text-primary group-hover:scale-105"
                        )}>
                            {job.job_type === 'explorer' ? <Search size={22} /> : 
                             job.job_type === 'metadata' ? <Database size={22} /> : <Terminal size={22} />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 tracking-tight uppercase">
                                {job.job_type} Task
                            </h3>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={job.status === 'success' ? "default" : job.status === 'failed' ? "destructive" : "secondary"}
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-wider px-1.5 py-0 rounded-md border",
                                        job.status === 'success' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                        job.status === 'failed' && "bg-destructive/10 text-destructive border-destructive/20"
                                    )}
                                >
                                    {job.status}
                                </Badge>
                                {job.agent_group && (
                                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-1.5 py-0 rounded flex items-center gap-1">
                                        <Cpu size={8} /> {job.agent_group}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-lg p-1">
                                <DropdownMenuItem onClick={() => onInspect(job)} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    <ChevronRight className="mr-2 h-3.5 w-3.5 opacity-70" /> Review Results
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    <Play className="mr-2 h-3.5 w-3.5 opacity-70" /> Re-run Task
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/20 min-h-18 relative overflow-hidden group-hover:bg-muted/40 transition-colors">
                        <code className="text-[10px] font-mono text-foreground/70 leading-relaxed block break-all line-clamp-3">
                            {job.payload.query || job.payload.action || "System ad-hoc task."}
                        </code>
                        <div className="absolute inset-x-0 bottom-0 h-4 bg-linear-to-t from-muted/30 to-transparent" />
                    </div>
                    
                    <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/20">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="h-2 w-2 text-blue-500" /> Duration
                                </span>
                                <span className="text-xs font-black tabular-nums text-primary">
                                    {job.execution_time_ms || 0}ms
                                </span>
                            </div>

                            <div className="flex flex-col gap-1 border-l border-border/20 pl-4">
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                                    <Activity className="h-2 w-2 text-emerald-500" /> Output
                                </span>
                                <span className="text-xs font-black tabular-nums">
                                    {job.result_summary?.count || 0} <span className="text-[8px] opacity-40 uppercase font-black">rows</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/40 px-2 py-0.5 rounded-md border border-border/20">
                            {format(new Date(job.created_at), 'MMM d, HH:mm')}
                        </div>
                        
                        <Button
                            variant="ghost" 
                            size="sm"
                            className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/5 -mr-2"
                            onClick={(e) => { e.stopPropagation(); onInspect(job); }}
                        >
                            Inspect <ChevronRight className="ml-1 h-3 w-3" />
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic truncate">
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
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0 rounded border",
                                job.status === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                        >
                            {job.status}
                        </Badge>
                    </div>
                    {job.agent_group && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 opacity-80">
                            <Cpu size={10} /> {job.agent_group}
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
                        <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">
                            {job.result_summary?.count || 0} rows
                        </span>
                    </div>
                </div>

                <div className="col-span-2 hidden md:flex flex-col justify-center gap-1 border-l border-border/20 pl-4">
                    <span className="text-[10px] font-bold text-foreground/70 tracking-tight uppercase">
                        {format(new Date(job.created_at), 'MMM d')}
                    </span>
                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
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
                <div className="space-y-2 max-w-sm mx-auto uppercase tracking-widest italic opacity-60">
                    <h3 className="text-2xl font-black text-foreground">Laboratory Empty</h3>
                    <p className="text-sm text-muted-foreground font-medium">No ad-hoc history detected.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
            {viewMode === 'list' && (
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
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
