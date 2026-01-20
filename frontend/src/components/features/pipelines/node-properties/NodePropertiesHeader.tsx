import React from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NodePropertiesHeaderProps {
  nodeId: string
  nodeType: string
  icon: LucideIcon
  onClose: () => void
}

export const NodePropertiesHeader: React.FC<NodePropertiesHeaderProps> = ({
  nodeId,
  nodeType,
  icon: Icon,
  onClose,
}) => {
  return (
    <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/20 shrink-0">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors',
            nodeType === 'source'
              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
              : nodeType === 'sink'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-primary/10 text-primary border-primary/20'
          )}
        >
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Inspector</h3>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            {nodeId}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8">
        <X size={16} />
      </Button>
    </div>
  )
}
