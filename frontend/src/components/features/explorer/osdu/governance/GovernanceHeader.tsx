import React from 'react'
import { Search, Users, ShieldCheck, LayoutGrid, List, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GovernanceHeaderProps {
  initialMode: 'identity' | 'compliance'
  search: string
  setSearch: (value: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  onRefresh: () => void
  isLoading: boolean
}

export const GovernanceHeader: React.FC<GovernanceHeaderProps> = ({
  initialMode,
  search,
  setSearch,
  viewMode,
  setViewMode,
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="h-20 px-8 border-b border-border/40 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30 shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner shrink-0',
            initialMode === 'identity'
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          )}
        >
          {initialMode === 'identity' ? <Users size={24} /> : <ShieldCheck size={24} />}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tighter text-foreground uppercase leading-none">
            {initialMode === 'identity' ? 'Identity Hub' : 'Compliance Suite'}
          </h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 leading-none opacity-60">
            {initialMode === 'identity' ? 'Entitlement Management' : 'Legal Framework'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-muted/20 rounded-xl p-1 border border-border/20">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 w-9 p-0 rounded-lg hover:bg-background/80 transition-all',
              viewMode === 'grid' && 'bg-background shadow-sm text-primary'
            )}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 w-9 p-0 rounded-lg hover:bg-background/80 transition-all',
              viewMode === 'list' && 'bg-background shadow-sm text-primary'
            )}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </Button>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="z-20 absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={
              initialMode === 'identity' ? 'Find security domains...' : 'Find legal tags...'
            }
            className="h-11 pl-11 rounded-2xl bg-background border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          className="h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 border-border/40 hover:bg-muted shadow-sm"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Sync
        </Button>
      </div>
    </div>
  )
}
