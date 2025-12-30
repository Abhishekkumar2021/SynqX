/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { getPipelines, getJobs, triggerPipeline, getPipelineStats, type Pipeline } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Plus, Workflow, Activity, Search,
    LayoutGrid, List as ListIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PipelineSettingsDialog } from '@/components/features/pipelines/PipelineSettingsDialog';
import { PipelineVersionDialog } from '@/components/features/pipelines/PipelineVersionDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PipelineGridItem } from '@/components/features/pipelines/PipelineGridItem';
import { PipelineListItem } from '@/components/features/pipelines/PipelineListItem';
import { LoadingSkeleton, EmptyState } from '@/components/features/pipelines/PipelineStates';
import { PageMeta } from '@/components/common/PageMeta';
import { useJobsListTelemetry } from '@/hooks/useJobsListTelemetry';
import { useZenMode } from '@/context/ZenContext';

export const PipelinesListPage: React.FC = () => {
    const { isZenMode } = useZenMode();
    // Enable real-time updates for pipeline status via global jobs telemetry
    useJobsListTelemetry();

    const queryClient = useQueryClient();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [versionsOpen, setVersionsOpen] = useState(false);
    const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Data Fetching
    const { data: pipelines, isLoading: isLoadingPipelines } = useQuery({ queryKey: ['pipelines'], queryFn: getPipelines });
    const { data: recentJobs } = useQuery({
        queryKey: ['jobs', 'recent'],
        queryFn: () => getJobs(),
    });

    // Fetch stats for all pipelines
    const pipelineStatsQueries = useQueries({
        queries: (pipelines || []).map(pipeline => ({
            queryKey: ['pipeline-stats', pipeline.id],
            queryFn: () => getPipelineStats(pipeline.id),
            enabled: !!pipelines, // Only run these queries if pipelines data is available
        })),
    });

    // Mutations
    const runMutation = useMutation({
        mutationFn: ({ id, versionId }: { id: number; versionId?: number }) => triggerPipeline(id, versionId),
        onSuccess: (data) => {
            toast.success("Pipeline Triggered", {
                description: `Execution started successfully. Job ID: ${data.job_id}`
            });
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats', data.pipeline_id] }); // Invalidate stats for this pipeline
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Refresh dashboard stats
        },
        onError: (err: any) => {
            toast.error("Trigger Failed", {
                description: err.response?.data?.detail?.message || "There was an error starting the pipeline."
            });
        }
    });

    // Handlers
    const openSettings = (pipeline: Pipeline) => {
        setSelectedPipeline(pipeline);
        setSettingsOpen(true);
    };

    const openVersions = (pipeline: Pipeline) => {
        setSelectedPipeline(pipeline);
        setVersionsOpen(true);
    };

    // Derived State
    const enrichedPipelines = useMemo(() => {
        if (!pipelines) return []; 
        
        return pipelines.map(p => {
            const jobs = recentJobs?.filter(j => j.pipeline_id === p.id) || [];
            const lastJob = jobs.sort((a, b) => b.id - a.id)[0];
            const stats = pipelineStatsQueries.find(q => q.data?.pipeline_id === p.id)?.data;
            return { ...p, lastJob, stats };
        }).filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.description?.toLowerCase().includes(filter.toLowerCase())
        );
    }, [pipelines, recentJobs, filter, pipelineStatsQueries]);

    if (isLoadingPipelines) return <LoadingSkeleton />;

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-6 md:gap-8 p-4 md:p-0",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Pipelines" description="Orchestrate and monitor your data workflows." />

            {/* --- Page Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <Workflow className="h-6 w-6 text-primary" />
                        </div>
                        Pipelines
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                        Orchestrate and monitor your data workflows.
                    </p>
                </div>
                <Link to="/pipelines/new" className="w-full md:w-auto">
                    <Button size="sm" className="w-full md:w-auto rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 font-semibold">
                        <Plus className="mr-2 h-5 w-5" /> Create Pipeline
                    </Button>
                </Link>
            </div>

            {/* --- Content Pane (Glass) --- */}
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">

                {/* Toolbar */}
                <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">

                    {/* Search Bar */}
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                        <Input
                            placeholder="Filter pipelines..."
                            className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    {/* Controls Group */}
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        {/* Status Chip (Hidden on very small screens) */}
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-background/50 border border-border/50 px-4 py-2 rounded-full shadow-sm">
                            <Activity className="h-3.5 w-3.5 text-primary" />
                            <span>{enrichedPipelines.length} Active</span>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-1 bg-muted/50 border border-border/40 rounded-2xl p-1.5 shadow-inner">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 rounded-xl transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 rounded-xl transition-all", viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
                                onClick={() => setViewMode('list')}
                            >
                                <ListIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- Grid View --- */}
                {viewMode === 'grid' && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                        {enrichedPipelines.length === 0 ? <EmptyState /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20 md:pb-0">
                                {enrichedPipelines.map((pipeline) => (
                                    <PipelineGridItem
                                        key={pipeline.id}
                                        pipeline={pipeline}
                                        onRun={(id, versionId) => runMutation.mutate({ id, versionId })}
                                        onOpenSettings={openSettings}
                                        onViewVersions={openVersions}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- List View --- */}
                {viewMode === 'list' && (
                    <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                        {/* Sticky Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                            <div className="col-span-12 md:col-span-4">Pipeline</div>
                            <div className="col-span-2 hidden md:block pl-2">Status</div>
                            <div className="col-span-2 hidden md:block">Performance</div>
                            <div className="col-span-2 hidden md:block">Activity / Schedule</div>
                            <div className="col-span-2 hidden md:block text-right pr-4">Operations</div>
                        </div>

                        {enrichedPipelines.length === 0 ? <EmptyState /> : (
                            <div className="divide-y divide-border/30 pb-20 md:pb-0">
                                {enrichedPipelines.map((pipeline) => (
                                    <PipelineListItem
                                        key={pipeline.id}
                                        pipeline={pipeline}
                                        onRun={(id, versionId) => runMutation.mutate({ id, versionId })}
                                        onOpenSettings={openSettings}
                                        onViewVersions={openVersions}
                                        isRunningMutation={runMutation.isPending}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Settings Dialog --- */}
            <PipelineSettingsDialog
                pipeline={selectedPipeline}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />

            {/* --- Versions Dialog --- */}
            {selectedPipeline && (
                <PipelineVersionDialog
                    pipelineId={selectedPipeline.id}
                    pipelineName={selectedPipeline.name}
                    open={versionsOpen}
                    onOpenChange={setVersionsOpen}
                />
            )}
        </motion.div>
    );
};