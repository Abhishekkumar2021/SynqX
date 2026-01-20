 
import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Key,
  RefreshCw,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatNumber } from '@/lib/utils'
import { getConnectionMetadata } from '@/lib/api/connections'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// New Sub-Components
import { GovernanceHeader } from './governance/GovernanceHeader'
import { GovernanceToolbar } from './governance/GovernanceToolbar'
import { GovernanceGrid } from './governance/GovernanceGrid'
import { GovernanceList } from './governance/GovernanceList'

interface OSDUGovernanceViewProps {
  connectionId: number
  initialMode: 'identity' | 'compliance'
}

export const OSDUGovernanceView: React.FC<OSDUGovernanceViewProps> = ({
  connectionId,
  initialMode,
}) => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // --- Data Queries ---
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['osdu', 'groups', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_groups', {}),
    enabled: initialMode === 'identity',
  })

  const { data: legalTags = [], isLoading: isLoadingLegal } = useQuery({
    queryKey: ['osdu', 'legal', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_legal_tags', {}),
    enabled: initialMode === 'compliance',
  })

  const items = useMemo(() => {
    const list = initialMode === 'identity' ? groups : legalTags
    return list.filter((i: any) => {
      const name = i.name || i.email || i.description || ''
      return name.toLowerCase().includes(search.toLowerCase())
    })
  }, [initialMode, groups, legalTags, search])

  // --- Actions ---
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    const allIds = items.map((i: any) => i.id || i.name || i.email)
    if (selectedIds.size === items.length && items.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(allIds))
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['osdu', initialMode === 'identity' ? 'groups' : 'legal'] })
    toast.success('Refreshing governance data...')
  }

  const isLoading = isLoadingGroups || isLoadingLegal

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/5 animate-in fade-in duration-500">
      {/* GOVERNANCE HEADER */}
      <GovernanceHeader
        initialMode={initialMode}
        search={search}
        setSearch={setSearch}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* MAIN LIST DISCOVERY */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <GovernanceToolbar
            totalAvailable={items.length}
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            isAllSelected={items.length > 0 && selectedIds.size === items.length}
            onToggleSelectAll={toggleSelectAll}
            initialMode={initialMode}
        />

        <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* Empty State */}
          {!isLoading && items.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8 opacity-40 z-10">
              <div className="h-32 w-32 rounded-[3.5rem] border-2 border-dashed border-muted-foreground flex items-center justify-center shadow-inner">
                <Key size={64} strokeWidth={1} />
              </div>
              <div className="space-y-2">
                <p className="font-black text-3xl tracking-tighter uppercase text-foreground">
                  Registry Dormant
                </p>
                <p className="text-sm font-bold uppercase tracking-[0.2em] max-w-sm text-muted-foreground">
                  No governance records resolved. Update your technical scope or refresh the hub.
                </p>
              </div>
            </div>
          )}

          <ScrollArea className="h-full">
            <div className={cn("w-full mx-auto", viewMode === 'grid' ? "p-10 max-w-7xl" : "p-0")}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-8 opacity-40">
                  <RefreshCw className="h-16 w-16 text-primary animate-spin" />
                  <span className="text-sm font-black uppercase tracking-[0.5em]">
                    Materializing security context...
                  </span>
                </div>
              ) : viewMode === 'grid' ? (
                <GovernanceGrid
                    items={items}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    initialMode={initialMode}
                />
              ) : (
                <GovernanceList
                    items={items}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    initialMode={initialMode}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
