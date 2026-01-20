import React, { useState, useMemo } from 'react'
import { FileType } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'
import { RegistryHeader } from './registry/RegistryHeader'
import { RegistrySidebar } from './registry/RegistrySidebar'
import { RegistryGrid } from './registry/RegistryGrid'
import { RegistryList } from './registry/RegistryList'

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
      authorities: Array.from(auths).sort(),
      sources: Array.from(srcs).sort(),
      types: Array.from(types).sort(),
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
    <div className="h-full flex overflow-hidden bg-muted/5 animate-in fade-in duration-500">
      {/* FACET SIDEBAR */}
      <RegistrySidebar
        facets={facets}
        selectedAuthorities={selectedAuthorities}
        setSelectedAuthorities={setSelectedAuthorities}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
      />

      {/* MAIN REGISTRY VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/20 relative">
        <RegistryHeader
          search={search}
          setSearch={setSearch}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isLoading={isLoading}
          onRefresh={onRefresh}
          totalCount={filteredKinds.length}
        />

        <ScrollArea className="flex-1">
          {groupedKinds.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center text-center py-48 space-y-8 opacity-40">
              <div className="h-32 w-32 rounded-[3.5rem] border-2 border-dashed border-muted-foreground flex items-center justify-center shadow-inner">
                <FileType size={64} strokeWidth={1} />
              </div>
              <div className="space-y-2">
                <p className="font-black text-3xl tracking-tighter uppercase text-foreground">
                  Registry Empty
                </p>
                <p className="text-sm font-bold uppercase tracking-[0.2em] max-w-sm text-muted-foreground">
                  No schema definitions match your current partition filters.
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <RegistryGrid
              groupedKinds={groupedKinds}
              onSelectKind={onSelectKind}
              collapsedGroups={collapsedGroups}
              toggleGroup={toggleGroup}
            />
          ) : (
            <div className="p-6 max-w-7xl mx-auto w-full pb-32">
              <RegistryList kinds={fuzzyResults} onSelectKind={onSelectKind} />
            </div>
          )}
        </ScrollArea>
      </main>
    </div>
  )
}
