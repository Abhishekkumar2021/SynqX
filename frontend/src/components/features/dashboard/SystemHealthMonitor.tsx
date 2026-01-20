import React from 'react'
import { Cpu, Server, Zap } from 'lucide-react'

import type { SystemHealth } from '@/lib/api'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SystemHealthMonitorProps {
  data?: SystemHealth
  hideHeader?: boolean
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ data, hideHeader }) => {
  // Defaults if data is missing (e.g., no recent runs)

  const cpu = data?.cpu_percent || 0
  const memory = data?.memory_usage_mb || 0
  const activeWorkers = data?.active_workers || 0
  const cdcStreams = data?.active_cdc_streams || 0

  // Helper for color coding
  const getStatusColor = (val: number) => {
    if (val < 50) return 'bg-emerald-500'
    if (val < 80) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 rounded-full" />

      <div
        className={cn(
          'flex-1 flex flex-col justify-around gap-6 px-8 pt-4 pb-10',
          hideHeader && 'pt-8'
        )}
      >
        {/* CPU Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                <Cpu className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-muted-foreground/80 uppercase text-[10px] tracking-widest">
                CPU Load
              </span>
            </div>
            <span className="font-bold tabular-nums text-foreground">{cpu}%</span>
          </div>

          <div className="relative h-2.5 w-full bg-muted/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${cpu}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]',
                getStatusColor(cpu)
              )}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                <Server className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-muted-foreground/80 uppercase text-[10px] tracking-widest">
                Memory
              </span>
            </div>
            <span className="font-bold tabular-nums text-foreground">{Math.round(memory)} MB</span>
          </div>

          <div className="relative h-2.5 w-full bg-muted/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(memory / 8192) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]"
            />
          </div>
        </div>

        {/* CDC & Workers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between bg-gradient-to-b from-primary/10 to-primary/5 p-4 rounded-2xl border border-white/5 shadow-sm hover:border-primary/20 transition-all duration-300 group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform">
                <Zap className="h-4 w-4 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[10px] uppercase leading-none">
                  Threads
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Active
                </span>
              </div>
            </div>
            <motion.div
              key={activeWorkers}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold font-mono text-primary tracking-tighter"
            >
              {activeWorkers}
            </motion.div>
          </div>

          <div className="flex items-center justify-between bg-gradient-to-b from-amber-500/10 to-amber-500/5 p-4 rounded-2xl border border-white/5 shadow-sm hover:border-amber-500/20 transition-all duration-300 group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 ring-1 ring-amber-500/20 group-hover:scale-110 transition-transform">
                <Zap className={cn('h-4 w-4 fill-current', cdcStreams > 0 && 'animate-pulse')} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[10px] uppercase leading-none">
                  CDC
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Streams
                </span>
              </div>
            </div>
            <motion.div
              key={cdcStreams}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold font-mono text-amber-500 tracking-tighter"
            >
              {cdcStreams}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
