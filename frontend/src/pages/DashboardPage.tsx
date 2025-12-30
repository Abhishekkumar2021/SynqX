import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Activity, CheckCircle2,
    PlayCircle, Zap,
    Workflow, CalendarDays,
    Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ExecutionThroughputChart } from '@/components/features/dashboard/ExecutionThroughputChart';
import { PipelineHealthChart } from '@/components/features/dashboard/PipelineHealthChart';
import { RecentActivityTable } from '@/components/features/dashboard/RecentActivityTable';
import { SystemHealthMonitor } from '@/components/features/dashboard/SystemHealthMonitor';
import { TopFailingPipelines } from '@/components/features/dashboard/TopFailingPipelines';
import { SlowestPipelines } from '@/components/features/dashboard/SlowestPipelines';
import { DashboardAlertsFeed } from '@/components/features/dashboard/DashboardAlertsFeed';
import { RunPipelineDialog } from '@/components/features/dashboard/RunPipelineDialog';
import { PageMeta } from '@/components/common/PageMeta';
import { StatsCard } from '@/components/ui/StatsCard';
import { useDashboardTelemetry } from '@/hooks/useDashboardTelemetry';
import { useZenMode } from '@/context/ZenContext';
import { cn, formatNumber } from '@/lib/utils';
import { motion, type Variants } from 'framer-motion';
import { DateRangePicker } from '@/components/features/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}



export const DashboardPage: React.FC = () => {
    // Enable real-time dashboard updates via WebSockets
    useDashboardTelemetry();
    const { isZenMode } = useZenMode();

    const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
    const [timeRange, setTimeRange] = useState('24h');
    const [customRange, setCustomRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    // 1. Single API Call
    const { data: stats, isLoading } = useQuery({ 
        queryKey: ['dashboard', timeRange, customRange?.from?.toISOString(), customRange?.to?.toISOString()], 
        queryFn: () => getDashboardStats(
            timeRange, 
            timeRange === 'custom' ? customRange?.from?.toISOString() : undefined,
            timeRange === 'custom' ? customRange?.to?.toISOString() : undefined
        ),
    });

    // 2. Chart Data Transformation
    const throughputData = React.useMemo(() => {
        if (!stats?.throughput) return [];
        return stats.throughput.map(p => ({
            name: (timeRange === '24h' || (timeRange === 'custom' && stats.throughput.length <= 48)) 
                ? format(parseISO(p.timestamp), 'HH:mm') 
                : format(parseISO(p.timestamp), 'MMM dd'),
            success: p.success_count,
            failed: p.failure_count,
            rows: p.rows_processed,
            bytes: p.bytes_processed
        }));
    }, [stats, timeRange]);

    const distributionData = React.useMemo(() => {
        if (!stats?.pipeline_distribution) return [];
        return stats.pipeline_distribution.map(d => ({
            name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
            value: d.count,
            fill: d.status === 'active' ? 'hsl(var(--chart-2))' : 
                  d.status === 'paused' ? 'hsl(var(--chart-5))' :
                  d.status === 'broken' || d.status === 'failed' ? 'hsl(var(--destructive))' :
                  'hsl(var(--muted))'
        })).filter(i => i.value > 0);
    }, [stats]);

    // 3. Activity Data Transformation (Matching Table expectations)
    const recentJobs = React.useMemo(() => {
        if (!stats?.recent_activity) return [];
        return stats.recent_activity.map(a => ({
            id: a.id,
            pipeline_name: a.pipeline_name,
            status: a.status,
            started_at: a.started_at,
            finished_at: a.completed_at,
            execution_time_ms: a.duration_seconds ? a.duration_seconds * 1000 : null,
            user_avatar: a.user_avatar
        }));
    }, [stats]);

    const connectionSubtext = React.useMemo(() => {
        if (!stats?.connector_health) return 'No connections';
        const healthy = stats.connector_health.find(h => h.status === 'healthy')?.count || 0;
        const total = stats.total_connections || 0;
        const unhealthy = total - healthy;
        
        const parts = [];
        if (healthy > 0) parts.push(`${healthy} Healthy`);
        if (unhealthy > 0) parts.push(`${unhealthy} Issues`);
        
        return parts.length > 0 ? parts.join(' • ') : 'No active connections';
    }, [stats]);

    const getTimeRangeLabel = (tr: string) => {
        switch(tr) {
            case '24h': return 'Last 24 Hours';
            case '7d': return 'Last 7 Days';
            case '30d': return 'Last 30 Days';
            case 'all': return 'All Time';
            case 'custom': return 'Custom Range';
            default: return tr;
        }
    };

    const container: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const item: Variants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } }
    };

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-8 pb-10",
                isZenMode && "pt-2"
            )}
            initial="hidden"
            animate="show"
            variants={container}
        >
            <PageMeta title="Dashboard" description="System overview and health metrics." />

            {/* --- Header & Navigation --- */}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-1">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 backdrop-blur-md shadow-sm">
                            <Activity className="h-5 w-5 text-primary" />
                        </div>
                        Control Center
                    </h2>
                    <p className="text-base text-muted-foreground font-medium pl-1">
                        Real-time intelligence for your data mesh.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className={cn(
                            "rounded-xl h-10 font-medium w-48"
                        )}>
                            <CalendarDays className="mr-2 h-4 w-4 opacity-50" />
                            <SelectValue placeholder="Select Range" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {timeRange === 'custom' && (
                        <DateRangePicker 
                            date={customRange}
                            setDate={setCustomRange}
                        />
                    )}

                    <Button 
                        size="lg" 
                        className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
                        onClick={() => setIsRunDialogOpen(true)}
                    >
                        <PlayCircle className="mr-2 h-5 w-5" />
                        Trigger Pipeline
                    </Button>
                </div>
            </motion.div>

            {/* --- Stats Cards Grid --- */}
            <motion.div variants={item} className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[140px] w-full rounded-[2.5rem]" />)
                ) : (
                    <>
                        <StatsCard
                            title="Operational Success"
                            value={`${stats?.success_rate}%`}
                            trend={getTimeRangeLabel(timeRange)}
                            trendUp={!!(stats?.success_rate && stats.success_rate > 95)}
                            icon={CheckCircle2}
                            active={true}
                            variant="success"
                        />
                        <StatsCard
                            title="Data Volume"
                            value={formatBytes(stats?.total_bytes || 0)}
                            subtext={`${formatNumber(stats?.total_rows)} Rows processed`}
                            subtextSize="text-[12px]"
                            icon={Zap}
                            variant="info"
                        />
                        <StatsCard
                            title="Connectivity"
                            value={stats?.total_connections || 0}
                            subtext={connectionSubtext}
                            subtextSize="text-[12px]"
                            icon={Network}
                            variant="warning"
                        />
                        <StatsCard
                            title="Pipeline Status"
                            value={stats?.active_pipelines || 0}
                            subtext={`From ${stats?.total_pipelines} total pipelines`}
                            subtextSize="text-[12px]"
                            icon={Workflow}
                            variant="primary"
                        />
                    </>
                )}
            </motion.div>

            {/* --- Main Dashboard Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* --- Left Column (Charts & Data) --- */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Throughput Chart */}
                    <motion.div variants={item} className="h-[450px] metric-card p-0! overflow-hidden border-border/40">
                        <ExecutionThroughputChart data={throughputData} />
                    </motion.div>

                    {/* Performance Widgets Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div variants={item} className="metric-card p-0! overflow-hidden border-border/40">
                            <TopFailingPipelines pipelines={stats?.top_failing_pipelines || []} />
                        </motion.div>
                        <motion.div variants={item} className="metric-card p-0! overflow-hidden border-border/40">
                            <SlowestPipelines pipelines={stats?.slowest_pipelines || []} />
                        </motion.div>
                    </div>

                    {/* Recent Activity Table */}
                    <motion.div variants={item} className="metric-card p-0! overflow-hidden border-border/40">
                        <RecentActivityTable jobs={recentJobs} />
                    </motion.div>
                </div>

                {/* --- Right Column (Sidebar Widgets) --- */}
                <div className="lg:col-span-4 space-y-8">
                    {/* System Health */}
                    <motion.div variants={item} className="h-[450px] metric-card p-0! overflow-hidden border-border/40">
                        <SystemHealthMonitor data={stats?.system_health} />
                    </motion.div>

                    {/* Pipeline Health Pie */}
                    <motion.div variants={item} className="h-[500px] metric-card p-0! overflow-hidden border-border/40">
                        <PipelineHealthChart
                            data={distributionData}
                            totalPipelines={stats?.total_pipelines || 0}
                        />
                    </motion.div>

                    {/* Alerts Feed */}
                    <motion.div variants={item} className="h-[500px] flex flex-col metric-card p-0! overflow-hidden border-border/40">
                        <DashboardAlertsFeed alerts={stats?.recent_alerts || []} />
                    </motion.div>
                </div>
            </div>

            <RunPipelineDialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen} />
        </motion.div>
    );
};
