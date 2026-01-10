import React from 'react';
import { Activity, Cpu, Server, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SystemHealth } from '@/lib/api';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SystemHealthMonitorProps {
    data?: SystemHealth;
    hideHeader?: boolean;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ data, hideHeader }) => {
    // Defaults if data is missing (e.g., no recent runs)
    const cpu = data?.cpu_percent || 0;
    const memory = data?.memory_usage_mb || 0;
    const activeWorkers = data?.active_workers || 0;

    // Helper for color coding
    const getStatusColor = (val: number) => {
        if (val < 50) return 'bg-emerald-500';
        if (val < 80) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {!hideHeader && (
                <div className="pb-4 shrink-0 px-8 pt-8">
                    <h3 className="text-xl font-bold tracking-tighter uppercase flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        System Infrastructure
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                        Real-time resource utilization
                    </p>
                </div>
            )}
            <div className={cn(
                "flex-1 flex flex-col justify-around gap-6 px-8 pt-4 pb-10",
                hideHeader && "pt-8"
            )}>
                {/* CPU Usage */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-primary" />
                            <span className="font-bold text-muted-foreground/80 uppercase text-[10px] tracking-widest">CPU Load</span>
                        </div>
                        <span className="font-bold tabular-nums">{cpu}%</span>
                    </div>
                    <Progress value={cpu} className="h-2.5 bg-muted/30" indicatorClassName={getStatusColor(cpu)} />
                </div>

                {/* Memory Usage */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-primary" />
                            <span className="font-bold text-muted-foreground/80 uppercase text-[10px] tracking-widest">Memory</span>
                        </div>
                        <span className="font-bold tabular-nums">{Math.round(memory)} MB</span>
                    </div>
                    <Progress value={(memory / 8192) * 100} className="h-2.5 bg-muted/30" indicatorClassName="bg-blue-500" />
                </div>

                {/* Active Workers */}
                <div className="pt-2 flex items-center justify-between bg-primary/5 p-5 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col -space-y-0.5">
                            <span className="font-bold text-foreground uppercase text-xs tracking-tight">Engine Load</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Threads</span>
                        </div>
                    </div>
                    <motion.div 
                        key={activeWorkers}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-4xl font-bold font-mono tracking-tighter text-primary"
                    >
                        {activeWorkers}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};