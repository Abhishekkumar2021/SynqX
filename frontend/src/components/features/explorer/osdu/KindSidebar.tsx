import React, { useState, useMemo } from 'react'
import { Layers, Search, Database, Globe, RefreshCw, Box } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

interface KindSidebarProps {
  kinds: any[]
  selectedKind: string | null
  onSelectKind: (kind: string | null) => void
  isLoading: boolean
  onRefresh: () => void
}

export const KindSidebar: React.FC<KindSidebarProps> = ({
  kinds,
  selectedKind,
  onSelectKind,
  isLoading,
  onRefresh,
}) => {
  const [search, setSearch] = useState('')

  const filteredKinds = useFuzzySearch(kinds, search, {
    keys: ['full_kind', 'entity_name'],
    threshold: 0.3,
  })

  return (
    <div className="h-full w-[300px] min-w-[280px] max-w-[320px] border-r border-border/10 bg-background/60 backdrop-blur-sm flex flex-col">
      <div className="w-full max-w-[300px] mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="h-12 px-3 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 ring-1 ring-indigo-500/20">
              <Layers size={14} />
            </div>
            <div className="leading-none">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-foreground/80">
                Schema Registry
              </p>
              <p className="text-[8px] font-semibold text-muted-foreground/60 mt-0.5">
                {kinds.length} definitions
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-7 w-7 rounded-md hover:bg-muted"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
            <Input
              placeholder="Filter kinds…"
              className="h-8 pl-7 text-[10px] bg-background/60 border-border/40 rounded-lg
                         focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Global */}
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={() => onSelectKind(null)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-left border',
              !selectedKind
                ? 'bg-indigo-600/90 text-white border-indigo-500/40 shadow-sm'
                : 'bg-background hover:bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground'
            )}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-md flex items-center justify-center shrink-0',
                !selectedKind ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              <Globe size={12} />
            </div>
            <span className="text-[10px] font-bold truncate tracking-tight">Global Mesh</span>
          </button>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="px-3 pb-4 space-y-1 max-w-[300px] mx-auto">
            {filteredKinds.map((kind) => {
              const isSelected = selectedKind === kind.full_kind

              return (
                <button
                  key={kind.full_kind}
                  onClick={() => onSelectKind(kind.full_kind)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all border',
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-500/30'
                      : 'hover:bg-muted/40 border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-muted/50 text-muted-foreground/40'
                    )}
                  >
                    <Box size={11} strokeWidth={2.5} />
                  </div>

                  <div className="min-w-0 flex-1 leading-tight">
                    <p
                      className={cn(
                        'text-[10px] font-semibold truncate',
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground/80'
                      )}
                    >
                      {kind.entity_name}
                    </p>
                    <p className="text-[8px] text-muted-foreground/40 truncate font-mono">
                      {kind.full_kind}
                    </p>
                  </div>
                </button>
              )
            })}

            {filteredKinds.length === 0 && (
              <div className="text-center py-10 opacity-40">
                <Database className="mx-auto mb-2 text-muted-foreground" size={24} />
                <p className="text-[9px] uppercase font-black tracking-widest">No definitions</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
