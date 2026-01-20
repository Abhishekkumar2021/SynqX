 
import React, { useState, useMemo } from 'react'
import { MeshHeader } from './mesh/MeshHeader'
import { MeshToolbar } from './mesh/MeshToolbar'
import { MeshGrid } from './mesh/MeshGrid'
import { MeshList } from './mesh/MeshList'
import { MeshFooter } from './mesh/MeshFooter'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OSDUMeshViewProps {
  searchQuery: string
  onQueryChange: (q: string) => void
  selectedKind: string | null
  onKindChange: (kind: string | null) => void
  searchResults: any
  isLoading: boolean
  onExecute: () => void
  onSelectRecord: (id: string) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
  limit: number
  onToggleAI: () => void
}

export const OSDUMeshView: React.FC<OSDUMeshViewProps> = ({
  searchQuery,
  onQueryChange,
  selectedKind,
  onKindChange,
  searchResults,
  isLoading,
  onExecute,
  onSelectRecord,
  pageOffset,
  onOffsetChange,
  limit,
  onToggleAI,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const results = useMemo(() => searchResults?.results || [], [searchResults])
  const totalAvailable = useMemo(() => searchResults?.total_count || 0, [searchResults])

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

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 bg-background">
      <MeshHeader
        searchQuery={searchQuery}
        onQueryChange={onQueryChange}
        onExecute={onExecute}
        isLoading={isLoading}
        onToggleAI={onToggleAI}
        selectedKind={selectedKind}
        onKindChange={onKindChange}
      />

      {/* CONTENT VIEWPORT */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <MeshToolbar
          results={results}
          selectedIds={selectedIds}
          isLoading={isLoading}
          totalAvailable={totalAvailable}
          toggleSelectAll={toggleSelectAll}
          setSelectedIds={setSelectedIds}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/5">
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-48 gap-8 opacity-40">
                    <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
                    <RefreshCw className="h-16 w-16 text-primary animate-spin" strokeWidth={1} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">
                    Materializing partition frame...
                    </span>
                </div>
            ) : results.length === 0 ? (
                 <div className="flex-1 absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8 z-10 animate-in fade-in zoom-in duration-700">
                    <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
                    <div className="relative h-24 w-24 rounded-[2.5rem] border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shadow-inner bg-background/50">
                        <Search size={48} strokeWidth={1} className="text-muted-foreground/40" />
                    </div>
                    </div>
                    <div className="space-y-2">
                    <p className="font-black text-3xl tracking-tighter uppercase text-foreground">
                        Discovery Idle
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] max-w-sm mx-auto text-muted-foreground leading-relaxed">
                        The mesh is empty. Execute a query or use the neural assistant to resolve
                        partition entities.
                    </p>
                    </div>
                    <Button
                    variant="outline"
                    className="rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-black uppercase text-[10px] tracking-[0.2em] h-11 px-8"
                    onClick={onToggleAI}
                    >
                    <Sparkles size={14} className="mr-3" /> Initialize Assistant
                    </Button>
                </div>
            ) : (
                <ScrollArea className="h-full">
                    <div className="p-10 max-w-[1600px] mx-auto w-full">
                        {viewMode === 'grid' ? (
                            <MeshGrid
                                isLoading={isLoading}
                                results={results}
                                selectedIds={selectedIds}
                                onToggleSelection={toggleSelection}
                                onSelectRecord={onSelectRecord}
                                onToggleAI={onToggleAI}
                            />
                        ) : (
                            <MeshList 
                                results={results}
                                selectedIds={selectedIds}
                                onToggleSelection={toggleSelection}
                                onSelectRecord={onSelectRecord}
                            />
                        )}
                        <div className="h-24" /> {/* Spacer */}
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
  )
}
