import React from 'react'
import { ChevronRight, Globe, Activity, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ExplorerContentHeaderProps {
  name: string
  type: string
  status?: 'healthy' | 'unhealthy' | 'unknown'
  actions?: React.ReactNode
}

export const ExplorerContentHeader: React.FC<ExplorerContentHeaderProps> = ({
  name,
  type,
  status = 'healthy',
  actions,
}) => {
  return (
    <header className="h-12 px-6 border-b border-border/20 flex items-center justify-between shrink-0 bg-muted/5 relative z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">
          <Globe className="h-3 w-3" /> Explorer
          <ChevronRight className="h-2.5 w-2.5" />
        </div>

        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-bold tracking-tight text-foreground/90">{name}</h2>
          <Badge
            variant="outline"
            className="h-4.5 px-1.5 text-[9px] uppercase font-bold bg-primary/5 text-primary border-primary/20 leading-none"
          >
            {type}
          </Badge>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all',
              status === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            )}
          >
            <Activity className={cn('h-2.5 w-2.5', status === 'healthy' && 'animate-pulse')} />
            {status === 'healthy' ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div className="h-4 w-px bg-border/40 mx-1" />
        <Info className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer" />
      </div>
    </header>
  )
}
