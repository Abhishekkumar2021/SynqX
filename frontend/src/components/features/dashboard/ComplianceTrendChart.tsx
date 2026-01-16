/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useTheme } from '@/hooks/useTheme';
import { formatNumber, cn } from '@/lib/utils';

interface ComplianceTrendChartProps {
    data: any[];
}

const getThemeColors = (theme: string | undefined) => {
    const isDark = theme === 'dark';
    return {
        VALID: isDark ? '#10b981' : '#059669', // Emerald
        FAILED: isDark ? '#f43f5e' : '#dc2626',  // Rose
        GRID: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        TEXT: isDark ? '#94a3b8' : '#64748b',
    };
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const rawCompliance = payload[0].payload.compliance;
        // Handle both 0-1 and 0-100 scales
        const compliance = rawCompliance <= 1 ? rawCompliance * 100 : rawCompliance;
        const scoreColor = compliance >= 90 ? 'text-emerald-500' : compliance >= 75 ? 'text-amber-500' : 'text-rose-500';

        return (
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-2xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95 min-w-48 z-[1000] ring-1 ring-white/5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-white/10 pb-1.5">
                    {label}
                </p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 text-[11px] font-bold">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                                    style={{ 
                                        backgroundColor: entry.color || entry.fill,
                                        boxShadow: `0 0 10px ${entry.color || entry.fill}40`
                                    }}
                                />
                                <span className="text-muted-foreground uppercase tracking-tight">{entry.name}:</span>
                            </div>
                            <span className="font-mono text-foreground font-bold tracking-tight">
                                {formatNumber(entry.value)}
                            </span>
                        </div>
                    ))}
                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-widest">Compliance</span>
                        <span className={cn("text-xs font-black", scoreColor)}>
                            {compliance.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const ComplianceTrendChart: React.FC<ComplianceTrendChartProps> = ({ data }) => {
    const { theme } = useTheme();
    const colors = useMemo(() => getThemeColors(theme), [theme]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 px-6 pb-8 min-h-87.5 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradValid-comp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.VALID} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={colors.VALID} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradFailed-comp" x1="0" y1="0" x2="0" y2="1">
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
                            content={<CustomTooltip />} 
                            cursor={{ stroke: colors.VALID, strokeWidth: 2, strokeDasharray: '6 6', opacity: 0.4 }}
                            wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                        />
                        <Area type="monotone" dataKey="valid" name="Valid" stroke={colors.VALID} strokeWidth={4} fill="url(#gradValid-comp)" animationDuration={1500} />
                        <Area type="monotone" dataKey="failed" name="Quarantined" stroke={colors.FAILED} strokeWidth={4} fill="url(#gradFailed-comp)" animationDuration={1500} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};