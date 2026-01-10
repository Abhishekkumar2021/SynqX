/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJobs, getPipelines, type Job } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    RefreshCw, Filter, Terminal, History as HistoryIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { JobsList } from '@/components/features/jobs/JobsList';
import { JobDetails } from '@/components/features/jobs/JobDetails';
import { PageMeta } from '@/components/common/PageMeta';
import { useJobsListTelemetry } from '@/hooks/useJobsListTelemetry';
import { useZenMode } from '@/hooks/useZenMode';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-4",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Execution History" description="Monitor pipeline runs and logs." />

            {/* --- Header Section --- */}
            <div className="flex items-center justify-between shrink-0 px-1 py-2">
                <div className="flex items-center gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md shadow-inner text-primary ring-1 ring-primary/20">
                        <HistoryIcon className="h-8 w-8" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground uppercase">
                            Execution Forensic
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground/60 tracking-tight">
                            A high-fidelity registry for real-time pipeline monitoring, performance analytics, and log inspection.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Select 
                        value={pipelineIdFilter?.toString() || "all"} 
                        onValueChange={(v) => setPipelineIdFilter(v === "all" ? null : parseInt(v))}
                    >
                        <SelectTrigger className="h-11 w-64 rounded-xl border-border/40 bg-muted/20 backdrop-blur-md px-5 focus:ring-primary/20 hover:border-primary/40 hover:bg-muted/30 transition-all text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
                            <div className="flex items-center gap-3">
                                <Filter className="h-4 w-4 text-primary" />
                                <SelectValue placeholder="All Pipelines" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl p-1.5">
                            <SelectItem value="all" className="rounded-xl font-bold text-[11px] uppercase tracking-widest py-3">All Pipelines</SelectItem>
                            {pipelines?.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()} className="rounded-xl font-bold text-[11px] uppercase tracking-widest py-3">{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        className={cn(
                            "h-11 w-11 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/30 hover:border-primary/20 transition-all",
                            isRefetching && "opacity-80"
                        )}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={cn("h-5 w-5 text-muted-foreground/60", isRefetching && "animate-spin text-primary")} />
                    </Button>
                </div>
            </div>

            {/* --- Main Content Area (Resizable) --- */}
            <div className="flex-1 min-h-0 relative rounded-3xl border border-border/40 bg-background/20 backdrop-blur-md overflow-hidden shadow-2xl">
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-blue-500/5 -z-10 blur-xl opacity-50" />

                <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                    
                    {/* --- LEFT PANEL: Card-based Sidebar List --- */}
                    <ResizablePanel defaultSize={30} minSize={20} maxSize={45} className="bg-card/30 backdrop-blur-xl border-r border-white/5">
                        <JobsList
                            jobs={filteredJobs}
                            pipelines={pipelines || []}
                            isLoading={isLoading}
                            selectedJobId={selectedJobId}
                            onSelect={handleJobSelect}
                            filter={filter}
                            onFilterChange={setFilter}
                        />
                    </ResizablePanel>

                    <ResizableHandle className="w-[1px] bg-border/40 hover:bg-primary/50 transition-colors relative z-50 before:absolute before:inset-y-0 before:-left-1 before:w-3 before:cursor-col-resize" />

                    {/* --- RIGHT PANEL: Details / Terminal --- */}
                    <ResizablePanel defaultSize={70} className="bg-card/50 backdrop-blur-2xl">
                        <div className="h-full flex flex-col relative">
                            {selectedJob ? (
                                <JobDetails job={selectedJob} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-linear-to-r from-primary/20 to-purple-600/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                                        <div className="relative p-10 rounded-3xl bg-background/40 border border-border/50 shadow-2xl backdrop-blur-sm group-hover:scale-105 transition-transform duration-500">
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
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Network</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 border-x border-border px-8">
                                            <div className="h-1 w-8 bg-emerald-500 rounded-full mb-1 animate-pulse" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">CPU</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-1 w-8 bg-blue-500 rounded-full mb-1" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Memory</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </motion.div>
    );
};