import React, { useState, useMemo } from 'react'
import { MeshGrid } from './mesh/MeshGrid'
import { MeshList } from './mesh/MeshList'
import { MeshFooter } from './mesh/MeshFooter'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Sparkles, Database, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OSDUWellboreView } from './OSDUWellboreView'
import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { OSDUDiscoveryEmptyState } from './shared/OSDUDiscoveryEmptyState'
import { OSDUPlatformLoader } from './shared/OSDUPlatformLoader'
import { OSDUToolbar } from './shared/OSDUToolbar'
import { KindSidebar } from './KindSidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface OSDUMeshViewProps {
  kinds: any[]
  onRefreshKinds: () => void
  searchQuery: string
  onQueryChange: (q: string) => void
  selectedKind: string | null
  onKindChange: (kind: string | null) => void
  searchResults: any
  isLoading: boolean
  onExecute: () => void
  onSelectRecord: (id: string) => void
  onDeleteRecord?: (id: string) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
  limit: number
  onToggleAI: () => void
}

export const OSDUMeshView: React.FC<OSDUMeshViewProps> = ({
  kinds,
  onRefreshKinds,
  searchQuery,
  onQueryChange,
  selectedKind,
  onKindChange,
  searchResults,
  isLoading,
  onExecute,
  onSelectRecord,
  onDeleteRecord,
  pageOffset,
  onOffsetChange,
  limit,
  onToggleAI,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [domainView, setDomainView] = useState<boolean>(false)
  const [isKindSidebarCollapsed, setIsKindSidebarCollapsed] = useState<boolean>(false)

  const results = useMemo(() => searchResults?.results || [], [searchResults])
  const totalAvailable = useMemo(() => searchResults?.total_count || 0, [searchResults])

  const isWellKind = selectedKind?.includes('master-data--Well')

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length && results.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(results.map((r: any) => r.id)))
  }

  const handleBulkDownload = () => {
    const selectedRecords = results.filter((r: any) => selectedIds.has(r.id))
    const blob = new Blob([JSON.stringify(selectedRecords, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `osdu-records-export-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selectedRecords.length} records to JSON`)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 bg-background">
      <OSDUPageHeader
        icon={Search}
        title="Data Mesh"
        subtitle={selectedKind || 'All Resource Types'}
        iconColor="text-indigo-500"
        search={searchQuery}
        onSearchChange={onQueryChange}
        searchPlaceholder="Lucene search (e.g. data.WellName: 'Test')..."
        onRefresh={onExecute}
        isLoading={isLoading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={totalAvailable}
        countLabel="Records"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAI}
            className="h-11 px-6 rounded-2xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[11px] tracking-widest gap-2 hover:bg-primary/10 shadow-sm"
          >
            <Sparkles size={14} /> Neural Assistant
          </Button>
        }
      />

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* KIND SIDEBAR */}
        <div
          className={cn(
            'h-full border-r border-border/10 bg-muted/2 transition-all duration-300',
            isKindSidebarCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-72'
          )}
        >
          <KindSidebar
            kinds={kinds}
            selectedKind={selectedKind}
            onSelectKind={onKindChange}
            isLoading={isLoading}
            onRefresh={onRefreshKinds}
          />
        </div>

        {/* MAIN MESH CONTENT */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <OSDUToolbar
            totalAvailable={totalAvailable}
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            isAllSelected={results.length > 0 && selectedIds.size === results.length}
            onToggleSelectAll={toggleSelectAll}
            isLoading={isLoading}
            onBulkDownload={handleBulkDownload}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsKindSidebarCollapsed(!isKindSidebarCollapsed)}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground mr-2"
              >
                <Layers
                  size={14}
                  className={cn(isKindSidebarCollapsed ? 'opacity-40' : 'text-primary')}
                />
              </Button>
            </div>
          </OSDUToolbar>

          <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2">
            {isLoading ? (
              <OSDUPlatformLoader
                message="Materializing partition frame..."
                iconColor="text-indigo-500"
              />
            ) : results.length === 0 ? (
              <OSDUDiscoveryEmptyState
                icon={Search}
                title={searchQuery && searchQuery !== '*' ? 'No Matches Found' : 'Discovery Idle'}
                description={
                  searchQuery && searchQuery !== '*'
                    ? `Your query for "${searchQuery}" returned 0 records in this technical scope.`
                    : 'The mesh is empty. Execute a query or use the neural assistant to resolve partition entities.'
                }
                action={
                  !searchQuery || searchQuery === '*'
                    ? {
                        label: 'Initialize Assistant',
                        onClick: onToggleAI,
                        icon: Sparkles,
                      }
                    : undefined
                }
              />
            ) : (
              <ScrollArea className="h-full">
                <div
                  className={cn(
                    'w-full mx-auto transition-all duration-500',
                    viewMode === 'grid' ? 'p-6 max-w-[1600px]' : 'p-0'
                  )}
                >
                  {viewMode === 'grid' ? (
                    <MeshGrid
                      isLoading={isLoading}
                      results={results}
                      selectedIds={selectedIds}
                      onToggleSelection={toggleSelection}
                      onSelectRecord={onSelectRecord}
                      onDeleteRecord={onDeleteRecord}
                      onToggleAI={onToggleAI}
                    />
                  ) : (
                    <MeshList
                      results={results}
                      selectedIds={selectedIds}
                      onToggleSelection={toggleSelection}
                      onSelectRecord={onSelectRecord}
                      onDeleteRecord={onDeleteRecord}
                    />
                  )}
                  {viewMode === 'grid' && <div className="h-24" />}
                </div>
              </ScrollArea>
            )}
          </div>

          <MeshFooter
            pageOffset={pageOffset}
            limit={limit}
            totalAvailable={totalAvailable}
            currentCount={results.length}
            isLoading={isLoading}
            onOffsetChange={onOffsetChange}
          />
        </div>
      </div>
    </div>
  )
}
