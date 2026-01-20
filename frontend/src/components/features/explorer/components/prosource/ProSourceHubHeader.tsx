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
    <header className="px-6 py-3 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0 relative z-40 backdrop-blur-md">
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 rounded-lg hover:bg-muted active:scale-95 border border-border/40 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <Server size={12} className="text-primary/60" />
            <h1 className="text-sm font-black tracking-tight text-foreground uppercase truncate max-w-[150px]">
              {connectionName || 'ProSource'}
            </h1>
          </div>
          <ChevronRight size={12} className="text-muted-foreground/20 shrink-0" />
          <Badge
            variant="outline"
            className="px-2 rounded-md bg-blue-500/5 text-blue-600/80 border-blue-500/20 font-bold uppercase tracking-widest text-[8px]"
          >
            {projectName || 'Seabed'}
          </Badge>

          {crs && (
            <>
              <ChevronRight size={12} className="text-muted-foreground/20 shrink-0" />
              <Badge
                variant="outline"
                className="px-2 rounded-md bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[8px] gap-1"
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
                className="px-2 rounded-md bg-amber-500/5 text-amber-600 border-amber-500/20 font-bold uppercase tracking-widest text-[8px] gap-1"
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
