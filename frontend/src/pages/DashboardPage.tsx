import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CheckCircle2,
    PlayCircle, Zap,
    Workflow, CalendarDays,
    Network,
    ShieldCheck,
    Users, Database, AlertTriangle, ShieldAlert,
    Activity, History, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutionThroughputChart } from '@/components/features/dashboard/ExecutionThroughputChart';
import { PipelineHealthChart } from '@/components/features/dashboard/PipelineHealthChart';
import { AgentStatusChart } from '@/components/features/dashboard/AgentStatusChart';
import { UnifiedActivityPanel } from '@/components/features/dashboard/UnifiedActivityPanel';
import { SystemHealthMonitor } from '@/components/features/dashboard/SystemHealthMonitor';
import { TopFailingPipelines } from '@/components/features/dashboard/TopFailingPipelines';
import { SlowestPipelines } from '@/components/features/dashboard/SlowestPipelines';
import { ComplianceTrendChart } from '@/components/features/dashboard/ComplianceTrendChart';
import { TopQualityViolations } from '@/components/features/dashboard/TopQualityViolations';
import { DashboardWidget } from '@/components/features/dashboard/DashboardWidget';
import { RunPipelineDialog } from '@/components/features/dashboard/RunPipelineDialog';
import { PageMeta } from '@/components/common/PageMeta';
import { StatsCard } from '@/components/ui/StatsCard';
import { useDashboardTelemetry } from '@/hooks/useDashboardTelemetry';
import { useZenMode } from '@/hooks/useZenMode';
import { cn, formatNumber } from '@/lib/utils';
import { motion, type Variants } from 'framer-motion';
import { DateRangePicker } from '@/components/features/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

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
    const { user } = useAuth();

    const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
    const [timeRange, setTimeRange] = useState('24h');
    const [throughputView, setThroughputView] = useState<'jobs' | 'rows' | 'bytes'>('jobs');
    const [activityTab, setActivityTab] = useState('runs');
    const [customRange, setCustomRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    const { data: stats, isLoading } = useQuery({ 
        queryKey: ['dashboard', timeRange, customRange?.from?.toISOString(), customRange?.to?.toISOString()], 
        queryFn: () => getDashboardStats(
            timeRange, 
            timeRange === 'custom' ? customRange?.from?.toISOString() : undefined,
            timeRange === 'custom' ? customRange?.to?.toISOString() : undefined
        ),
    });

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

    const qualityData = React.useMemo(() => {
        if (!stats?.quality_trend) return [];
        return stats.quality_trend.map(p => ({
            name: (timeRange === '24h' || (timeRange === 'custom' && stats.quality_trend.length <= 48)) 
                ? format(parseISO(p.timestamp), 'HH:mm') 
                : format(parseISO(p.timestamp), 'MMM dd'),
            valid: p.valid_rows,
            failed: p.failed_rows,
            compliance: p.compliance_score
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

    const recentJobs = React.useMemo(() => {
        if (!stats?.recent_activity) return [];
        return stats.recent_activity.map(a => ({
            id: a.id,
            pipeline_id: a.pipeline_id,
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
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    };

    const item: Variants = {
        hidden: { y: 15, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 60, damping: 15 } }
    };

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-8 pb-20",
                isZenMode && "pt-4"
            )}
            initial="hidden"
            animate="show"
            variants={container}
        >
            <PageMeta title="Dashboard" description="System overview and health metrics." />

            {/* --- Premium Production Header --- */}
            <motion.div variants={item} className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 px-1">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
                        <ShieldCheck className="h-3 w-3" />
                        Live System Operational
                    </div>
                    
                    <div className="space-y-1.5">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground flex items-center gap-4">
                            Control Center
                            {user?.is_superuser && (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold text-[10px] tracking-widest px-3 py-1 rounded-lg shadow-sm ml-2">
                                    SUPERUSER
                                </Badge>
                            )}
                        </h2>
                        <p className="text-lg text-muted-foreground/70 font-medium max-w-2xl leading-relaxed">
                            {user?.is_superuser 
                                ? "Global infrastructure intelligence. Orchestrating data streams with unified visibility." 
                                : "Real-time intelligence and monitoring for your data infrastructure."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/40 shadow-inner">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="rounded-xl h-10 border-0 bg-background shadow-sm font-semibold text-xs w-44 hover:bg-muted/50 transition-colors">
                                <CalendarDays className="mr-2 h-3.5 w-3.5 text-primary" />
                                <SelectValue placeholder="Select Range" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                                <SelectItem value="24h" className="rounded-xl font-medium">Last 24 Hours</SelectItem>
                                <SelectItem value="7d" className="rounded-xl font-medium">Last 7 Days</SelectItem>
                                <SelectItem value="30d" className="rounded-xl font-medium">Last 30 Days</SelectItem>
                                <SelectItem value="all" className="rounded-xl font-medium">All Time</SelectItem>
                                <SelectItem value="custom" className="rounded-xl font-medium">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {timeRange === 'custom' && (
                            <DateRangePicker 
                                date={customRange}
                                setDate={setCustomRange}
                            />
                        )}
                    </div>

                    <Button 
                        size="lg" 
                        className="rounded-xl h-12 px-6 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 font-bold uppercase text-[11px] tracking-widest gap-2"
                        onClick={() => setIsRunDialogOpen(true)}
                    >
                        <PlayCircle className="h-4 w-4" />
                        Run Pipeline
                    </Button>
                </div>
            </motion.div>

            {/* --- Stats Cards Grid (Balanced 3 Columns) --- */}
            <motion.div variants={item} className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-muted/20" />)
                ) : (
                    <>
                        <StatsCard
                            title="Success Rate"
                            value={`${stats?.success_rate}%`}
                            trend={getTimeRangeLabel(timeRange)}
                            trendUp={!!(stats?.success_rate && stats.success_rate > 95)}
                            icon={CheckCircle2}
                            active={true}
                            variant="success"
                        />
                        <StatsCard
                            title="Data Processed"
                            value={formatBytes(stats?.total_bytes || 0)}
                            subtext={`${formatNumber(stats?.total_rows)} Rows processed`}
                            icon={Zap}
                            variant="info"
                        />
                        <StatsCard
                            title="Active Flows"
                            value={stats?.active_pipelines || 0}
                            subtext={`${stats?.total_pipelines} total nodes`}
                            icon={Workflow}
                            variant="primary"
                        />
                        <StatsCard
                            title="Connectivity"
                            value={stats?.total_connections || 0}
                            subtext={connectionSubtext}
                            icon={Network}
                            variant="warning"
                        />
                        <StatsCard
                            title="Managed Assets"
                            value={formatNumber(stats?.total_assets || 0)}
                            subtext="Tables & Files"
                            icon={Database}
                            variant="primary"
                        />
                        <StatsCard
                            title="Total Users"
                            value={stats?.total_users || 0}
                            subtext="Active Accounts"
                            icon={Users}
                            variant="info"
                        />
                    </>
                )}
            </motion.div>

            {/* --- Main Dashboard Content --- */}
            <div className="flex flex-col gap-8 px-1">
                
                {/* PRIMARY ROW: Performance & Distribution */}
                <div className="grid gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <DashboardWidget
                            title="Execution Throughput"
                            description="Processing performance across temporal buckets"
                            icon={TrendingUp}
                            className="h-112.5"
                            headerActions={
                                <Tabs value={throughputView} onValueChange={(v) => setThroughputView(v as 'jobs' | 'rows' | 'bytes')}>
                                    <TabsList className="bg-background/50 h-10">
                                        <TabsTrigger value="jobs" className="text-[10px] px-3">Jobs</TabsTrigger>
                                        <TabsTrigger value="rows" className="text-[10px] px-3">Rows</TabsTrigger>
                                        <TabsTrigger value="bytes" className="text-[10px] px-3">Bytes</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            }
                        >
                            <ExecutionThroughputChart 
                                data={throughputData} 
                                view={throughputView}
                            />
                        </DashboardWidget>
                    </div>
                    <div className="lg:col-span-4">
                        <DashboardWidget
                            title="Status Distribution"
                            description="Global pipeline health topology"
                            icon={Workflow}
                            className="h-112.5"
                            headerActions={
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-xl font-bold tracking-tighter text-foreground">
                                                {(stats?.total_pipelines ?? 0) > 0 ? Math.round(((stats?.pipeline_distribution?.find((d: { status: string }) => d.status === 'active')?.count || 0) / (stats?.total_pipelines || 1)) * 100) : 0}%
                                            </span>
                                            <div className={cn(
                                                "h-2 w-2 rounded-full animate-pulse",
                                                ((stats?.total_pipelines ?? 0) > 0 ? (stats?.pipeline_distribution?.find((d: { status: string }) => d.status === 'active')?.count || 0) / (stats?.total_pipelines || 1) : 0) > 0.9 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                                            )} />
                                        </div>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Health Score</p>
                                    </div>
                                </div>
                            }
                        >
                            <PipelineHealthChart 
                                data={distributionData} 
                                totalPipelines={stats?.total_pipelines || 0}
                                
                            />
                        </DashboardWidget>
                    </div>
                </div>

                {/* SECONDARY ROW: Infrastructure & Agents */}
                <div className="grid gap-8 lg:grid-cols-2">
                    <DashboardWidget
                        title="Infrastructure Health"
                        description="Real-time resource utilization & capacity"
                        icon={Zap}
                        className="h-104"
                        headerActions={
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Live Feed</span>
                            </div>
                        }
                    >
                        <SystemHealthMonitor data={stats?.system_health}  />
                    </DashboardWidget>

                    <DashboardWidget
                        title="Agent Topology"
                        description="Distributed worker nodes status & distribution"
                        icon={Network}
                        className="h-104"
                    >
                        <AgentStatusChart 
                            totalAgents={stats?.total_agents || 0}
                            activeAgents={stats?.active_agents || 0}
                            groups={stats?.agent_groups || []}
                            
                        />
                    </DashboardWidget>
                </div>

                {/* TERTIARY ROW: Unified Activity Panel */}
                <DashboardWidget
                    title="System Activity"
                    description="Unified operational timeline"
                    icon={Activity}
                    className="h-128"
                    headerActions={
                        <Tabs value={activityTab} onValueChange={setActivityTab}>
                            <TabsList className="bg-background/50 h-8">
                                <TabsTrigger value="runs" className="text-[10px] h-7 px-3 gap-2">
                                    <Database className="h-3 w-3 opacity-70" /> Runs
                                </TabsTrigger>
                                <TabsTrigger value="alerts" className="text-[10px] h-7 px-3 gap-2">
                                    <ShieldAlert className="h-3 w-3 opacity-70" /> Alerts
                                </TabsTrigger>
                                <TabsTrigger value="audit" className="text-[10px] h-7 px-3 gap-2">
                                    <History className="h-3 w-3 opacity-70" /> Audit
                                </TabsTrigger>
                                <TabsTrigger value="ephemeral" className="text-[10px] h-7 px-3 gap-2">
                                    <Terminal className="h-3 w-3 opacity-70" /> Remote
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    }
                >
                    <UnifiedActivityPanel 
                        jobs={recentJobs}
                        alerts={stats?.recent_alerts || []}
                        auditLogs={stats?.recent_audit_logs || []}
                        ephemeralJobs={stats?.recent_ephemeral_jobs || []}
                        
                        activeTab={activityTab}
                        onTabChange={setActivityTab}
                    />
                </DashboardWidget>

                {/* QUATERNARY ROW: Data Quality Health */}
                <div className="grid gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <DashboardWidget
                            title="Contract Compliance"
                            description="Valid vs. Quarantined records over time"
                            icon={ShieldCheck}
                            className="h-112.5"
                            headerActions={
                                <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest text-emerald-500 border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-full animate-pulse">
                                    Live Quality
                                </Badge>
                            }
                        >
                            <ComplianceTrendChart data={qualityData}  />
                        </DashboardWidget>
                    </div>
                    <div className="lg:col-span-4">
                        <DashboardWidget
                            title="Governance Violations"
                            description="Top contract rules failing validation"
                            icon={AlertTriangle}
                            className="h-112.5"
                        >
                            <TopQualityViolations violations={stats?.top_violations || []}  />
                        </DashboardWidget>
                    </div>
                </div>

                {/* QUINARY ROW: Risks & Bottlenecks */}
                <div className="grid gap-8 md:grid-cols-2">
                    <DashboardWidget
                        title="Reliability Risks"
                        description="Top failing pipelines requiring attention"
                        icon={ShieldAlert}
                        className="h-95"
                    >
                        <TopFailingPipelines pipelines={stats?.top_failing_pipelines || []}  />
                    </DashboardWidget>

                    <DashboardWidget
                        title="Performance Bottlenecks"
                        description="Pipelines with highest average latency"
                        icon={Zap}
                        className="h-95"
                    >
                        <SlowestPipelines pipelines={stats?.slowest_pipelines || []}  />
                    </DashboardWidget>
                </div>
            </div>

            <RunPipelineDialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen} />
        </motion.div>
    );
};