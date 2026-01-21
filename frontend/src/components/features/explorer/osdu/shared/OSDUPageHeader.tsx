import React from 'react'
import { Search, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface OSDUPageHeaderProps {
  icon: any
  title: string
  subtitle: string
  iconColor?: string

  // Search
  search: string
  onSearchChange: (val: string) => void
  searchPlaceholder?: string

  // Actions
  onRefresh?: () => void
  isLoading?: boolean

  // View Toggle
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void

  // Extra Actions (Left of Search)
  children?: React.ReactNode

  // Right side (End of header)
  actions?: React.ReactNode

  // Stats
  totalCount?: number
  countLabel?: string
}

export const OSDUPageHeader: React.FC<OSDUPageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  iconColor = 'text-primary',
  search,
  onSearchChange,
  searchPlaceholder = 'Find anything...',
  onRefresh,
  isLoading,
  viewMode,
  onViewModeChange,
  children,
  actions,
  totalCount,
  countLabel = 'Items',
}) => {
  return (
    <header className="h-16 px-6 border-b border-border/40 bg-card/30 backdrop-blur-md flex items-center justify-between shrink-0 relative z-30 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner shrink-0',
            iconColor.replace('text-', 'bg-').replace('500', '500/10'),
            iconColor.replace('text-', 'border-').replace('500', '500/20')
          )}
        >
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase leading-none">
              {title}
            </h2>
            {totalCount !== undefined && (
              <Badge
                variant="outline"
                className="h-4 px-1.5 text-[9px] font-black border-border/40 bg-muted/20 opacity-60 uppercase"
              >
                {totalCount} {countLabel}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1.5 leading-none opacity-50 truncate">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}

        {onViewModeChange && (
          <div className="flex bg-muted/20 rounded-lg p-0.5 border border-border/20">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7 p-0 rounded-md hover:bg-background/80 transition-all',
                viewMode === 'grid' && 'bg-background shadow-sm text-primary'
              )}
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7 p-0 rounded-md hover:bg-background/80 transition-all',
                viewMode === 'list' && 'bg-background shadow-sm text-primary'
              )}
              onClick={() => onViewModeChange('list')}
            >
              <List size={14} />
            </Button>
          </div>
        )}

        <div className="relative group w-full md:w-64">
          <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={searchPlaceholder}
            className="h-9 pl-9 rounded-xl bg-background/50 border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-xs font-medium shadow-sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {onRefresh && (
          <Button
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            variant="outline"
            className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 border-border/40 hover:bg-muted shadow-sm"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Sync
          </Button>
        )}

        {actions}
      </div>
    </header>
  )
}
