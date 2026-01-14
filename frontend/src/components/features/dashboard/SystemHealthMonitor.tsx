import React from "react";
import { Cpu, Server, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { SystemHealth } from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SystemHealthMonitorProps {
  data?: SystemHealth;
  hideHeader?: boolean;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  data,
  hideHeader,
}) => {
  // Defaults if data is missing (e.g., no recent runs)

  const cpu = data?.cpu_percent || 0;
  const memory = data?.memory_usage_mb || 0;
  const activeWorkers = data?.active_workers || 0;
  const cdcStreams = data?.active_cdc_streams || 0;

  // Helper for color coding
  const getStatusColor = (val: number) => {
    if (val < 50) return "bg-emerald-500";
    if (val < 80) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className={cn(
          "flex-1 flex flex-col justify-around gap-6 px-8 pt-4 pb-10",
          hideHeader && "pt-8"
        )}
      >
        {/* CPU Usage */}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="font-bold text-muted-foreground/80 uppercase text-[10px] tracking-widest">
                CPU Load
              </span>
            </div>

            <span className="font-bold tabular-nums">{cpu}%</span>
          </div>

          <Progress
            value={cpu}
            className="h-2.5 bg-muted/30"
            indicatorClassName={getStatusColor(cpu)}
          />
        </div>

        {/* Memory Usage */}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <span className="font-bold text-muted-foreground/80 uppercase text-[10px] tracking-widest">
                Memory
              </span>
            </div>

            <span className="font-bold tabular-nums">
              {Math.round(memory)} MB
            </span>
          </div>

          <Progress
            value={(memory / 8192) * 100}
            className="h-2.5 bg-muted/30"
            indicatorClassName="bg-blue-500"
          />
        </div>

        {/* CDC & Workers */}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[10px] uppercase leading-none">
                  Threads
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                  Active
                </span>
              </div>
            </div>
            <motion.div
              key={activeWorkers}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold font-mono text-primary"
            >
              {activeWorkers}
            </motion.div>
          </div>
          <div className="flex items-center justify-between bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <Zap
                  className={cn("h-4 w-4", cdcStreams > 0 && "animate-pulse")}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[10px] uppercase leading-none">
                  CDC
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                  Streams
                </span>
              </div>
            </div>
            <motion.div
              key={cdcStreams}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold font-mono text-amber-500"
            >
              {cdcStreams}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
