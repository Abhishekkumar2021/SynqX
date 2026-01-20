import React, { useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  Layers,
  X,
  Database,
  Sparkles,
  LayoutGrid,
  List,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ProSourceQueryBuilder } from './ProSourceQueryBuilder'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProSourceMeshHeaderProps {
  connectionId: number
  asset: any
  currentQuery?: string
  onApplyQuery: (sql: string | null) => void
  onToggleAI: () => void
  isLoading: boolean
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export const ProSourceMeshHeader: React.FC<ProSourceMeshHeaderProps> = ({
  connectionId,
  asset,
  currentQuery,
  onApplyQuery,
  onToggleAI,
  isLoading,
  viewMode,
  onViewModeChange,
}) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [pendingSql, setPendingSql] = useState(currentQuery || '')

  // Sync with prop changes (e.g. from URL or AI)
  React.useEffect(() => {
    setPendingSql(currentQuery || '')
  }, [currentQuery])

  // Fetch columns for the builder
  const { data: schema } = useQuery({
    queryKey: ['prosource', 'schema', connectionId, asset?.name],
    queryFn: () => getConnectionMetadata(connectionId, 'infer_schema', { asset: asset?.name }),
    enabled: !!asset && isBuilderOpen,
  })

  return (
    <div className="h-20 px-8 border-b border-border/10 bg-muted/5 flex items-center gap-8 shrink-0 relative z-20 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
          <Layers size={24} />
        </div>
        <div className="min-w-0 mr-4">
          <h2 className="text-sm sm:text-xl font-black tracking-tighter text-foreground uppercase leading-none">
            Entity Mesh
          </h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 opacity-60 hidden sm:block">
            {asset?.name || 'Seabed Explorer'}
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl relative group">
        <Search className="z-20 absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
        <div className="relative">
          <Input
            placeholder={asset ? `Filtering ${asset.name}...` : 'Select an asset to filter...'}
            className={cn(
              'h-12 pl-12 pr-32 rounded-2xl bg-background border-border/40 shadow-2xl focus:ring-8 focus:ring-primary/5 transition-all text-sm font-medium',
              pendingSql && 'border-primary/30 ring-4 ring-primary/5'
            )}
            value={
              asset && pendingSql
                ? `SQL: ${pendingSql.length > 40 ? pendingSql.substring(0, 40) + '...' : pendingSql}`
                : ''
            }
            readOnly
          />
          {pendingSql && (
            <div className="absolute left-12 -top-2 px-2 py-0.5 rounded-md bg-primary text-[8px] font-black uppercase tracking-widest text-white shadow-lg animate-in fade-in zoom-in-95">
              Active Filter
            </div>
          )}
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <AnimatePresence>
            {pendingSql && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingSql('')
                  onApplyQuery(null)
                }}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear filter"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
          <Sheet open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-lg transition-all',
                  pendingSql ? 'text-primary bg-primary/5' : 'hover:text-primary'
                )}
              >
                <SlidersHorizontal size={16} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[600px] sm:max-w-none p-0 border-l border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col"
            >
              <SheetHeader className="p-8 border-b border-border/10 bg-muted/5">
                <div className="flex items-center gap-4 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-black uppercase tracking-widest">
                      Visual Query Architect
                    </SheetTitle>
                    <SheetDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Construct precise Oracle SQL predicates for{' '}
                      <b className="text-foreground">{asset?.name}</b>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-hidden p-8 bg-background/50">
                <ProSourceQueryBuilder
                  assetName={asset?.name}
                  columns={schema?.columns || []}
                  onQueryChange={setPendingSql}
                />
              </div>
              <div className="p-8 border-t border-border/10 bg-muted/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <Database size={12} className="opacity-40" />
                  Target: {asset?.name}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsBuilderOpen(false)}
                    className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      onApplyQuery(pendingSql)
                      setIsBuilderOpen(false)
                    }}
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11 bg-primary shadow-xl shadow-primary/20 text-white"
                  >
                    Apply Transformation
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex items-center ml-auto gap-4 shrink-0 pl-4 border-l border-border/10">
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/40 h-10">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-lg transition-all"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid
              size={16}
              className={viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground/40'}
            />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-lg transition-all"
            onClick={() => onViewModeChange('list')}
          >
            <List
              size={16}
              className={viewMode === 'list' ? 'text-primary' : 'text-muted-foreground/40'}
            />
          </Button>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onToggleAI}
          className="h-10 px-6 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
        >
          <Sparkles size={14} className="animate-pulse" />
          Neural Discovery
        </Button>
      </div>
    </div>
  )
}
