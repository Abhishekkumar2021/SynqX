/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJobs, getPipelines, type Job } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    RefreshCw, Filter, ChevronDown, Terminal, History as HistoryIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { JobsList } from '@/components/features/jobs/JobsList';
import { JobDetails } from '@/components/features/jobs/JobDetails';
import { PageMeta } from '@/components/common/PageMeta';
import { useJobsListTelemetry } from '@/hooks/useJobsListTelemetry';
import { useZenMode } from '@/context/ZenContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export const JobsPage: React.FC = () => {
    // Enable real-time list updates via WebSockets
    useJobsListTelemetry();
    const { isZenMode } = useZenMode();

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [selectedJobId, setSelectedJobId] = useState<number | null>(id ? parseInt(id) : null);
    const [filter, setFilter] = useState('');
    const [pipelineIdFilter, setPipelineIdFilter] = useState<number | null>(null);

    // Sync state with URL parameter
    useEffect(() => {
        if (id) {
            const parsedId = parseInt(id);
            if (parsedId !== selectedJobId) {
                setSelectedJobId(parsedId);
            }
        }
    }, [id, selectedJobId]);

    const handleJobSelect = (jobId: number) => {
        setSelectedJobId(jobId);
        navigate(`/jobs/${jobId}`);
    };

    const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['jobs'],
        queryFn: () => getJobs(),
    });

    const { data: pipelines } = useQuery({
        queryKey: ['pipelines'],
        queryFn: () => getPipelines(),
    });

    const selectedJob = useMemo(() => jobs?.find((j: Job) => j.id === selectedJobId), [jobs, selectedJobId]);

    const filteredJobs = useMemo(() => {
        if (!jobs) return [];
        let result = jobs;
        
        if (pipelineIdFilter) {
            result = result.filter((j: Job) => j.pipeline_id === pipelineIdFilter);
        }

        if (filter) {
            result = result.filter((j: Job) =>
                j.id.toString().includes(filter) ||
                j.status.toLowerCase().includes(filter.toLowerCase()) ||
                j.pipeline_id.toString().includes(filter)
            );
        }
        return result;
    }, [jobs, filter, pipelineIdFilter]);

    const selectedPipelineName = useMemo(() => {
        if (!pipelineIdFilter) return 'All Pipelines';
        return pipelines?.find(p => p.id === pipelineIdFilter)?.name || `Pipeline #${pipelineIdFilter}`;
    }, [pipelineIdFilter, pipelines]);

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-6",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Execution History" description="Monitor pipeline runs and logs." />

            {/* --- Header Section --- */}
            <div className="flex items-center justify-between shrink-0 px-2 pb-2">
                <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 backdrop-blur-md shadow-xl shadow-primary/5">
                        <HistoryIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
                            Execution Forensic
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                            Real-time pipeline monitoring & log inspection
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm gap-3 px-4 hover:border-primary/30 transition-all">
                                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-primary/10">
                                    <Filter className="h-3 w-3 text-primary" />
                                </div>
                                <span className="font-bold text-xs">{selectedPipelineName}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 glass-card rounded-3xl p-2">
                            <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest opacity-50">Filter Pipelines</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/10 my-2" />
                            <DropdownMenuItem onClick={() => setPipelineIdFilter(null)} className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10">
                                <span className="font-bold text-sm">All Pipelines</span>
                            </DropdownMenuItem>
                            {pipelines?.map(p => (
                                <DropdownMenuItem key={p.id} onClick={() => setPipelineIdFilter(p.id)} className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10">
                                    <span className="font-bold text-sm truncate">{p.name}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-8 w-px bg-border/20 mx-1 hidden md:block"></div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        className={cn(
                            "h-10 w-10 rounded-xl border-border/40 bg-card/50 hover:bg-muted/50 transition-all",
                            isRefetching && "opacity-80"
                        )}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefetching && "animate-spin text-primary")} />
                    </Button>
                </div>
            </div>

            {/* --- Main Content Area (Glass Panel) --- */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 relative">

                {/* Background Decoration 
                   This creates the subtle "glow" behind the main panels 
                */}
                <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-blue-500/5 rounded-[2rem] -z-10 blur-xl opacity-50" />

                {/* --- LEFT PANEL: List --- */}
                <div className="lg:col-span-4 h-full rounded-[2rem] border border-border/60 bg-card/40 backdrop-blur-xl shadow-lg shadow-black/5 overflow-hidden flex flex-col relative">
                    <JobsList
                        jobs={filteredJobs}
                        pipelines={pipelines || []}
                        isLoading={isLoading}
                        selectedJobId={selectedJobId}
                        onSelect={handleJobSelect}
                        filter={filter}
                        onFilterChange={setFilter}
                    />
                </div>

                {/* --- RIGHT PANEL: Details / Terminal --- */}
                <div className="lg:col-span-8 h-full rounded-[2rem] border border-border/60 bg-card/60 backdrop-blur-2xl shadow-xl shadow-black/5 overflow-hidden relative flex flex-col">
                    {selectedJob ? (
                        <JobDetails job={selectedJob} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-linear-to-r from-primary/20 to-purple-600/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                                <div className="relative p-10 rounded-[2.5rem] bg-background/40 border border-border/50 shadow-2xl backdrop-blur-sm group-hover:scale-105 transition-transform duration-500">
                                    <Terminal className="h-16 w-16 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all duration-500" />
                                </div>
                            </div>
                            <div className="text-center space-y-3 px-6">
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">System Monitor Ready</h3>
                                <p className="max-w-xs mx-auto text-sm font-medium leading-relaxed">
                                    Select an execution from the forensic history to inspect real-time logs, performance metrics, and error traces.
                                </p>
                            </div>

                            {/* Decorative Telemetry Grid */}
                            <div className="grid grid-cols-3 gap-8 pt-8 opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-1 w-8 bg-primary rounded-full mb-1" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Network</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 border-x border-border px-8">
                                    <div className="h-1 w-8 bg-emerald-500 rounded-full mb-1 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">CPU</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-1 w-8 bg-blue-500 rounded-full mb-1" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Memory</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};