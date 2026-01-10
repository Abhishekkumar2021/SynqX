/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/hooks/useTheme';
import { formatNumber } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface ExecutionThroughputChartProps {
    data: any[];
}

type ViewType = 'jobs' | 'rows' | 'bytes';

// --- Premium Color Palette ---
const getThemeColors = (theme: string | undefined) => {
    const isDark = theme === 'dark';
    return {
        SUCCESS: isDark ? '#10b981' : '#059669', // Emerald 500/600
        FAILED: isDark ? '#f43f5e' : '#dc2626',  // Rose 500 / Red 600
        ROWS: isDark ? '#3b82f6' : '#2563eb',    // Blue 500/600
        VOLUME: isDark ? '#f59e0b' : '#d97706',  // Amber 500/600
        GRID: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        TEXT: isDark ? '#94a3b8' : '#64748b',
    };
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const CustomTooltip = ({ active, payload, label, viewType }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-2xl border border-white/20 bg-background/95 backdrop-blur-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/20 min-w-56 z-[1000] animate-in fade-in zoom-in duration-200">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-white/10 pb-2">
                    {label}
                </p>
                <div className="space-y-3">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-8 text-xs font-bold">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.3)]"
                                    style={{ 
                                        backgroundColor: entry.color || entry.fill,
                                        boxShadow: `0 0 15px ${entry.color || entry.fill}44`
                                    }}
                                />
                                <span className="text-muted-foreground/80 uppercase tracking-tight">{entry.name}:</span>
                            </div>
                            <span className="font-mono text-foreground font-bold text-sm">
                                {viewType === 'bytes' ? formatBytes(entry.value) : formatNumber(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export const ExecutionThroughputChart: React.FC<ExecutionThroughputChartProps> = ({ data }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [view, setView] = useState<ViewType>('jobs');
    const colors = useMemo(() => getThemeColors(theme), [theme]);

    return (
        <div className="flex flex-col h-full">
            <div className="px-8 pt-8 pb-4 flex flex-row items-center justify-between shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold tracking-tighter uppercase flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Execution Throughput
                        </h3>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest text-emerald-500 border-emerald-500/20 bg-emerald-500/5 animate-pulse px-2 py-0.5 rounded-full">
                            Live
                        </Badge>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                        Processing performance across temporal buckets
                    </p>
                </div>

                <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
                    <TabsList>
                        <TabsTrigger value="jobs" className="gap-2">Jobs</TabsTrigger>
                        <TabsTrigger value="rows" className="gap-2">Rows</TabsTrigger>
                        <TabsTrigger value="bytes" className="gap-2">Bytes</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 px-6 pt-4 pb-8 min-h-87.5">
                <ResponsiveContainer width="100%" height="100%" key={`${theme}-${view}`}>
                    {view === 'jobs' ? (
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.SUCCESS} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={colors.SUCCESS} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.FAILED} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={colors.FAILED} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.GRID} vertical={false} />
                            <XAxis dataKey="name" stroke={colors.TEXT} fontSize={10} fontWeight={800} tickLine={false} axisLine={false} dy={10} />
                            <YAxis 
                                stroke={colors.TEXT} 
                                fontSize={10} 
                                fontWeight={800} 
                                tickLine={false} 
                                axisLine={false}
                                width={40}
                            />
                            <Tooltip 
                                content={<CustomTooltip viewType="jobs" colors={colors} />} 
                                cursor={{ stroke: colors.SUCCESS, strokeWidth: 2, strokeDasharray: '6 6', opacity: 0.4 }}
                                wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                            />
                            <Area type="monotone" dataKey="success" name="Completed" stroke={colors.SUCCESS} strokeWidth={4} fill="url(#gradSuccess)" animationDuration={1500} />
                            <Area type="monotone" dataKey="failed" name="Failed" stroke={colors.FAILED} strokeWidth={4} fill="url(#gradFailed)" animationDuration={1500} />
                        </AreaChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.GRID} vertical={false} />
                            <XAxis dataKey="name" stroke={colors.TEXT} fontSize={10} fontWeight={800} tickLine={false} axisLine={false} dy={10} />
                            <YAxis
                                stroke={colors.TEXT}
                                fontSize={10}
                                fontWeight={800}
                                tickLine={false}
                                axisLine={false}
                                width={60}
                                tickFormatter={(val) => view === 'bytes' ? formatBytes(val) : formatNumber(val)}
                            />
                            <Tooltip 
                                content={<CustomTooltip viewType={view} colors={colors} />} 
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} 
                                wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                            />
                            <Bar
                                dataKey={view === 'rows' ? 'rows' : 'bytes'}
                                name={view === 'rows' ? 'Records' : 'Volume'}
                                fill={view === 'rows' ? colors.ROWS : colors.VOLUME}
                                radius={[8, 8, 0, 0]}
                                animationDuration={1500}
                                barSize={32}
                            />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};