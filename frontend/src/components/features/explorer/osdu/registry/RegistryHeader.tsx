import React from 'react'
import { Search, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RegistryHeaderProps {
  search: string
  setSearch: (value: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  isLoading: boolean
  onRefresh: () => void
  totalCount: number
}

export const RegistryHeader: React.FC<RegistryHeaderProps> = ({
  search,
  setSearch,
  viewMode,
  setViewMode,
  isLoading,
  onRefresh,
  totalCount,
}) => {
  return (
    <div className="p-6 border-b border-border/10 bg-muted/5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
            Technical Registry
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={onRefresh}
          >
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin text-primary')} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">
            {totalCount} Definitions
          </span>
          <div className="flex bg-muted rounded-lg p-1 border border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-md hover:bg-background/80 transition-all",
                viewMode === 'grid' && "bg-background shadow-sm text-primary"
              )}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-md hover:bg-background/80 transition-all",
                viewMode === 'list' && "bg-background shadow-sm text-primary"
              )}
              onClick={() => setViewMode('list')}
            >
              <List size={14} />
            </Button>
          </div>
        </div>
      </div>
      <div className="relative group">
        <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Filter registry by kind, source or authority..."
          className="h-10 pl-10 pr-3 rounded-xl bg-background border-border/40 focus:border-primary/60 text-[13px] font-medium shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
