import React from 'react'
import { Database, ChevronRight, ArrowLeft, Layers, Server, Globe, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProSourceHubHeaderProps {
  connectionName?: string
  projectName?: string
  schema?: string
  crs?: string
  unitSystem?: string
  onBack: () => void
  children?: React.ReactNode
}

export const ProSourceHubHeader: React.FC<ProSourceHubHeaderProps> = ({
  connectionName,
  projectName,
  schema,
  crs,
  unitSystem,
  onBack,
  children,
}) => {
  return (
    <header className="px-8 py-4 border-b border-border/10 bg-card/30 flex items-center justify-between shrink-0 relative z-40 backdrop-blur-2xl">
      <div className="flex items-center gap-6 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 rounded-xl hover:bg-muted active:scale-95 border border-border/40 bg-background/50 shadow-sm"
        >
          <ArrowLeft className="h-4.5 w-4.5 text-muted-foreground" />
        </Button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Server size={14} className="text-primary" />
            </div>
            <h1 className="text-sm font-black tracking-widest text-foreground uppercase truncate max-w-[200px]">
              {connectionName || 'ProSource'}
            </h1>
          </div>
          <ChevronRight size={12} className="text-muted-foreground/20 shrink-0" />
          <Badge
            variant="outline"
            className="px-2 h-5 rounded-md bg-primary/5 text-primary/80 border-primary/20 font-bold uppercase tracking-widest text-[8px]"
          >
            {projectName || 'Seabed'}
          </Badge>

          {crs && (
            <>
              <ChevronRight size={12} className="text-muted-foreground/20 shrink-0" />
              <Badge
                variant="outline"
                className="px-2 h-5 rounded-md bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[8px] gap-1"
              >
                <Globe size={8} />
                {crs}
              </Badge>
            </>
          )}

          {unitSystem && (
            <>
              <ChevronRight size={12} className="text-muted-foreground/20 shrink-0" />
              <Badge
                variant="outline"
                className="px-2 h-5 rounded-md bg-amber-500/5 text-amber-600 border-amber-500/20 font-bold uppercase tracking-widest text-[8px] gap-1"
              >
                <Ruler size={8} />
                {unitSystem}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex justify-center px-4 overflow-hidden">{children}</div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          Oracle Live
        </span>
      </div>
    </header>
  )
}
