import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Database, ShieldCheck, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProSourceHubHeaderProps {
  connectionName?: string
  healthStatus?: string
  children?: React.ReactNode
}

export const ProSourceHubHeader: React.FC<ProSourceHubHeaderProps> = ({
  connectionName,
  healthStatus,
  children,
}) => {
  return (
    <header className="relative z-30 flex flex-col border-b border-white/5 bg-black/40 backdrop-blur-2xl px-6 pt-6 pb-0 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative h-12 w-12 rounded-2xl bg-[#0a0a0c] border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner">
              <Database size={24} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tight text-white uppercase italic italic-shorthand">
                ProSource{' '}
                <span className="text-indigo-500 not-italic tracking-normal">Explorer</span>
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] uppercase font-black px-2 py-0.5 rounded-full border-0',
                  healthStatus === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                )}
              >
                {healthStatus || 'Active'}
              </Badge>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <ShieldCheck size={10} className="text-indigo-500/50" />
              SLB Seabed Master Data Management • {connectionName || 'Standard Context'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-6 px-6 py-2 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                Engine
              </span>
              <span className="text-[10px] font-mono text-white flex items-center gap-1.5">
                <Cpu size={10} className="text-indigo-400" /> V1.8.4
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                Environment
              </span>
              <span className="text-[10px] font-mono text-white italic">PROD_SEABED_01</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">{children}</div>
    </header>
  )
}
