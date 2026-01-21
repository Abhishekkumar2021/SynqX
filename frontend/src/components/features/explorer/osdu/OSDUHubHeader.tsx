import React from 'react'
import { Database, ChevronRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OSDUHubHeaderProps {
  connectionName?: string
  partitionId?: string
  status?: 'healthy' | 'unhealthy' | 'unknown'
  onBack: () => void
  children?: React.ReactNode
}

export const OSDUHubHeader: React.FC<OSDUHubHeaderProps> = ({
  connectionName,
  partitionId,
  onBack,
  children,
}) => {
  return (
    <header className="px-6 py-3 border-b border-border/10 bg-card/20 flex items-center justify-between shrink-0 relative z-40 backdrop-blur-md">
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 rounded-lg hover:bg-muted active:scale-95 border border-border/40 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-background/40 border border-border/40 shadow-sm">
            <div className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            </div>
            <h1 className="text-sm font-black tracking-tight text-foreground uppercase truncate max-w-[200px]">
              {connectionName || 'OSDU'}
            </h1>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/20 shrink-0" />
          <Badge
            variant="outline"
            className="px-2 rounded-md bg-indigo-500/5 text-indigo-600/80 border-indigo-500/20 font-bold uppercase tracking-widest text-[8px]"
          >
            {partitionId || '...'}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">{children}</div>
    </header>
  )
}
