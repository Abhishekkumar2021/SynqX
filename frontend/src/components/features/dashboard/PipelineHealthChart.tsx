/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface PipelineHealthChartProps {
    data: any[];
    totalPipelines: number;
}

const getChartColors = (theme: string | undefined) => {
    const isDark = theme === 'dark';
    return {
        Active: isDark ? '#10b981' : '#059669', // Emerald
        Paused: isDark ? '#f59e0b' : '#d97706', // Amber
        Error: isDark ? '#f43f5e' : '#dc2626',  // Rose/Red
        Draft: isDark ? '#475569' : '#94a3b8',  // Slate
        PRIMARY: isDark ? '#8b5cf6' : '#6366f1', // Violet/Indigo
    };
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        const total = item.payload.total || 1;
        const percentage = (item.value / total) * 100;

        return (
            <div className="z-1000 rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl p-3 shadow-xl animate-in fade-in-0 zoom-in-95 min-w-40 ring-1 ring-white/10">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/10 pb-1.5">
                    {item.name}
                </p>
                <div className="flex items-center gap-3">
                    <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.payload.fill }}
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground tracking-tight">{item.value} Entities</span>
                        <span className="text-[9px] font-bold text-primary/80 uppercase tracking-wider">
                            {percentage.toFixed(1)}% OF TOTAL
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const PipelineHealthChart: React.FC<PipelineHealthChartProps> = ({ data, totalPipelines }) => {
    const { theme } = useTheme();
    const colors = useMemo(() => getChartColors(theme), [theme]);

    const dataWithTotal = useMemo(() => {
        return data.map(d => ({
            ...d,
            total: totalPipelines,
            fill: colors[d.name as keyof typeof colors] || colors.Draft
        }));
    }, [data, totalPipelines, colors]);

    // const activeCount = data.find(d => d.name === 'Active')?.value || 0; // Unused without header
    // const healthScore = totalPipelines > 0 ? Math.round((activeCount / totalPipelines) * 100) : 0; // Unused without header

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center relative px-6 pb-8 pt-4">
                {data.length > 0 && totalPipelines > 0 ? (
                    <>
                        <div className="w-full h-full min-h-65 relative">
                            <ResponsiveContainer width="100%" height="100%" key={theme}>
                                <PieChart>
                                    <Pie
                                        data={dataWithTotal}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={75}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        cornerRadius={12}
                                        dataKey="value"
                                        stroke="transparent"
                                        animationBegin={0}
                                        animationDuration={1200}
                                    >
                                        {dataWithTotal.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                                className="hover:opacity-80 transition-all duration-500 outline-none cursor-pointer"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        content={<CustomTooltip colors={colors} />} 
                                        wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                                        cursor={false}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                                <div className="flex flex-col items-center justify-center bg-background/60 backdrop-blur-xl h-24 w-24 rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)] ring-1 ring-white/5">
                                    <span className="text-4xl font-bold tabular-nums text-foreground tracking-tighter">
                                        {totalPipelines}
                                    </span>
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                        Total
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full mt-4 px-2">
                            {dataWithTotal.map((item) => (
                                <div 
                                    key={item.name} 
                                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div 
                                            className="h-2 w-2 rounded-full ring-2 ring-background" 
                                            style={{ backgroundColor: item.fill }} 
                                        />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-foreground">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground h-full gap-4 opacity-40">
                        <div className="p-6 bg-muted/20 rounded-[2rem] border border-border/50">
                            <AlertTriangle className="h-8 w-8 opacity-20" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">No Active Entities</span>
                    </div>
                )}
            </div>
        </div>
    );
};