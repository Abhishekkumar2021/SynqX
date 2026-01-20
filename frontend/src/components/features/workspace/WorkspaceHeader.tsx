 
import React from 'react'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface WorkspaceHeaderProps {
  activeWorkspace: any
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ activeWorkspace }) => {
  return (
    <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
      <div className="space-y-0.5">
        <h3 className="text-base font-bold flex items-center gap-3 text-foreground uppercase tracking-tight">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Users size={18} />
          </div>
          Team Management
        </h3>
        <p className="text-[10px] text-muted-foreground font-bold tracking-widest pl-1 uppercase opacity-60">
          {activeWorkspace?.name} <span className="mx-2 opacity-30">•</span> {activeWorkspace?.slug}
        </p>
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="h-6 w-px bg-border/40 hidden md:block" />

        <Badge
          variant="outline"
          className="flex bg-primary/5 text-primary border-primary/20 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md shadow-xs"
        >
          {activeWorkspace?.role} Access
        </Badge>
      </div>
    </div>
  )
}
