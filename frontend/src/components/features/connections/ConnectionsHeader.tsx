import React from 'react'
import { Button } from '@/components/ui/button'
import { Database, Plus, Laptop } from 'lucide-react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { Badge } from '@/components/ui/badge'
import { isRemoteGroup } from '@/lib/utils/agent'

interface ConnectionsHeaderProps {
  onCreate?: () => void
}

export const ConnectionsHeader: React.FC<ConnectionsHeaderProps> = ({ onCreate }) => {
  const { activeWorkspace } = useWorkspace()

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
              <Database className="h-6 w-6 text-primary" />
            </div>
            Connectivity Hub
          </h2>
          {activeWorkspace && isRemoteGroup(activeWorkspace.default_agent_group) && (
            <Badge
              variant="outline"
              className="h-7 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] gap-1.5 hidden sm:flex"
            >
              <Laptop className="h-3 w-3" />
              Agent: {activeWorkspace.default_agent_group}
            </Badge>
          )}
        </div>
        <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
          Manage your connectivity layer and discover assets across your architecture.
        </p>
      </div>

      {onCreate && (
        <Button
          size="sm"
          onClick={onCreate}
          className="w-full md:w-auto rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 font-semibold"
        >
          <Plus className="mr-2 h-5 w-5" /> New Connection
        </Button>
      )}
    </div>
  )
}
