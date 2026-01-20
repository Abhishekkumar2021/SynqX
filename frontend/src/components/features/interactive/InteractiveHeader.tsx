import React from 'react'
import { Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface InteractiveHeaderProps {
  onClear?: () => void
  count?: number
}

export const InteractiveHeader: React.FC<InteractiveHeaderProps> = ({ onClear, count = 0 }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 px-1">
      <div className="space-y-1.5">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            Interactive Lab
          </h2>
          <Badge
            variant="outline"
            className="h-7 px-3 rounded-xl bg-primary/5 border-primary/20 text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded-lg text-primary uppercase"
          >
            {count} ENTRIES
          </Badge>
        </div>
        <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
          A high-performance registry for ephemeral short-lived tasks, ad-hoc explorer queries, and
          real-time execution forensics.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl h-11 px-5 font-bold uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10 gap-2.5 transition-all border border-transparent hover:border-destructive/20"
          onClick={onClear}
        >
          <Trash2 className="h-4 w-4" />
          Purge History
        </Button>
      </div>
    </div>
  )
}
