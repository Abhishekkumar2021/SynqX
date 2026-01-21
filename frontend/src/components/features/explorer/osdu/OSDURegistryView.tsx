import React, { useState, useMemo } from 'react'
import { FileType, Grid3X3, Search } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'
import { RegistrySidebar } from './registry/RegistrySidebar'
import { RegistryGrid } from './registry/RegistryGrid'
import { RegistryList } from './registry/RegistryList'
import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { OSDUDiscoveryEmptyState } from './shared/OSDUDiscoveryEmptyState'
import { OSDUPlatformLoader } from './shared/OSDUPlatformLoader'
import { cn } from '@/lib/utils'

interface OSDURegistryViewProps {
  kinds: any[]
  onSelectKind: (kind: string) => void
  isLoading: boolean
  onRefresh: () => void
}

export const OSDURegistryView: React.FC<OSDURegistryViewProps> = ({
  kinds,
  onSelectKind,
  isLoading,
  onRefresh,
}) => {
  const [search, setSearch] = useState('')
  const [selectedAuthorities, setSelectedAuthorities] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([]) // Kept for future extension, though currently unused in new sidebar
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // --- Facet Extraction ---
  const facets = useMemo(() => {
    const auths = new Set<string>()
    const srcs = new Set<string>()
    const types = new Set<string>()

    kinds.forEach((k) => {
      if (k.authority) auths.add(k.authority)
      if (k.source) srcs.add(k.source)
      if (k.group) types.add(k.group)
    })

    return {
      authorities: Array.from(auths).filter(Boolean).sort(),
      sources: Array.from(srcs).filter(Boolean).sort(),
      types: Array.from(types).filter(Boolean).sort(),
    }
  }, [kinds])

  const filteredKinds = useMemo(() => {
    return kinds.filter((k) => {
      const matchesAuth =
        selectedAuthorities.length === 0 || selectedAuthorities.includes(k.authority)
      const matchesSource = selectedSources.length === 0 || selectedSources.includes(k.source)
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(k.group)
      return matchesAuth && matchesSource && matchesType
    })
  }, [kinds, selectedAuthorities, selectedSources, selectedTypes])

  const fuzzyResults = useFuzzySearch(filteredKinds, search, {
    keys: ['entity_name', 'full_kind', 'group', 'authority'],
    threshold: 0.3,
  })

  const groupedKinds = useMemo(() => {
    const groups: Record<string, any[]> = {}
    fuzzyResults.forEach((k) => {
      if (!groups[k.group]) groups[k.group] = []
      groups[k.group].push(k)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [fuzzyResults])

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }

  return (
    <div className="h-full flex overflow-hidden bg-muted/2 animate-in fade-in duration-500">
      {/* FACET SIDEBAR */}
      <RegistrySidebar
        facets={facets}
        selectedAuthorities={selectedAuthorities}
        setSelectedAuthorities={setSelectedAuthorities}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
      />

      {/* MAIN REGISTRY VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        <OSDUPageHeader
          icon={Grid3X3}
          title="Kind Registry"
          subtitle="Enterprise Schema Catalog"
          iconColor="text-emerald-500"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter schemas (e.g. wellbore)..."
          onRefresh={onRefresh}
          isLoading={isLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={filteredKinds.length}
          countLabel="Schemas"
        />

        <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2">
          {isLoading ? (
            <OSDUPlatformLoader message="Syncing schema registry..." iconColor="text-emerald-500" />
          ) : groupedKinds.length === 0 ? (
            <OSDUDiscoveryEmptyState
              icon={FileType}
              title="Registry Empty"
              description="No schema definitions match your current partition filters."
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
                  <RegistryGrid
                    groupedKinds={groupedKinds}
                    onSelectKind={onSelectKind}
                    collapsedGroups={collapsedGroups}
                    toggleGroup={toggleGroup}
                  />
                ) : (
                  <RegistryList kinds={fuzzyResults} onSelectKind={onSelectKind} />
                )}
                {viewMode === 'grid' && <div className="h-24" />}
              </div>
            </ScrollArea>
          )}
        </div>
      </main>
    </div>
  )
}
