import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Cpu, Server, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SystemHealth } from '@/lib/api';
import { motion } from 'framer-motion';

interface SystemHealthMonitorProps {
    data?: SystemHealth;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ data }) => {
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
        <Card className="h-full border-none bg-transparent shadow-none rounded-none flex flex-col">
            <CardHeader className="pb-4 shrink-0 px-6 pt-6">
                <CardTitle className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    System Health
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-around gap-6 pt-4 pb-6">
                {/* CPU Usage */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-primary" />
                            <span className="font-medium">CPU Load</span>
                        </div>
                        <span className="font-bold">{cpu}%</span>
                    </div>
                    <Progress value={cpu} className="h-2.5" indicatorClassName={getStatusColor(cpu)} />
                </div>

                {/* Memory Usage */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-primary" />
                            <span className="font-medium">Memory Usage</span>
                        </div>
                        <span className="font-bold">{Math.round(memory)} MB</span>
                    </div>
                    <Progress value={(memory / 8192) * 100} className="h-2.5" indicatorClassName="bg-blue-500" />
                </div>

                {/* Active Workers */}
                <div className="pt-2 flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/40">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground">Active Workers</span>
                            <span className="text-[10px] text-muted-foreground">Processing jobs</span>
                        </div>
                    </div>
                    <motion.div 
                        key={activeWorkers}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl font-black font-mono tracking-tighter text-foreground"
                    >
                        {activeWorkers}
                    </motion.div>
                </div>
            </CardContent>
        </Card>
    );
};
