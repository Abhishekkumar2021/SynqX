import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface InspectorEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export const InspectorEmptyState: React.FC<InspectorEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px] border-2 border-dashed border-border/20 rounded-3xl bg-muted/5 m-8">
      <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
        <Icon size={32} className="text-muted-foreground/40" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70 mb-2">
        {title}
      </h3>
      <p className="text-[11px] font-medium text-muted-foreground/50 max-w-xs leading-relaxed">
        {description}
      </p>
    </div>
  )
}
