import React from 'react'
import { Database, ChevronRight, Globe, Box, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RegistryListProps {
  kinds: any[]
  onSelectKind: (kind: string) => void
}

export const RegistryList: React.FC<RegistryListProps> = ({ kinds, onSelectKind }) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/10 bg-muted/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 select-none">
        <div className="col-span-4 pl-2">Entity Definition</div>
        <div className="col-span-2">Authority</div>
        <div className="col-span-2">Source</div>
        <div className="col-span-2">Group</div>
        <div className="col-span-1">Version</div>
        <div className="col-span-1 text-right pr-4">Action</div>
      </div>

      <div className="divide-y divide-border/10">
        {kinds.map((k) => (
          <div
            key={k.full_kind}
            className="group grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/5 transition-colors cursor-pointer"
            onClick={() => onSelectKind(k.full_kind)}
          >
            <div className="col-span-4 flex items-center gap-4 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-muted/20 border border-border/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                <Database size={16} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-bold text-foreground truncate">{k.entity_name}</span>
                <span
                  className="text-[10px] font-mono text-muted-foreground/60 truncate"
                  title={k.full_kind}
                >
                  {k.full_kind}
                </span>
              </div>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Globe size={12} className="text-muted-foreground/40" />
              <span className="text-xs font-medium text-foreground/80 truncate">{k.authority}</span>
            </div>

            <div className="col-span-2">
              <Badge
                variant="outline"
                className="text-[10px] font-black border-border/60 bg-muted/30 px-2 h-5 text-foreground/70"
              >
                {k.source}
              </Badge>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Box size={12} className="text-muted-foreground/40" />
              <span className="text-xs font-medium text-foreground/80 truncate">{k.group}</span>
            </div>

            <div className="col-span-1">
              <span className="text-xs font-mono font-bold text-muted-foreground/80">
                v{k.version}
              </span>
            </div>

            <div className="col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
