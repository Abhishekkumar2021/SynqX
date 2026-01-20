import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface NodeDiffTabProps {
  diffStatus: string
  diffInfo: any
}

export const NodeDiffTab: React.FC<NodeDiffTabProps> = ({ diffStatus, diffInfo }) => {
  return (
    <div className="p-6 space-y-4 focus-visible:outline-none">
      <Badge
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          diffStatus === 'added'
            ? 'bg-emerald-500/20 text-emerald-500'
            : diffStatus === 'removed'
              ? 'bg-destructive/20 text-destructive'
              : 'bg-amber-500/20 text-amber-500'
        )}
      >
        {String(diffStatus || '')}
      </Badge>
      {diffInfo?.changes?.config && (
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Delta</Label>
          <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 overflow-hidden">
            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(diffInfo.changes.config, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
