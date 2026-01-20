import React, { useState } from 'react'
import { Search, SlidersHorizontal, Layers, X, Database, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ProSourceQueryBuilder } from './ProSourceQueryBuilder'
import { ProSourceAICommandCenter } from './ProSourceAICommandCenter'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface ProSourceMeshHeaderProps {
  connectionId: number
  asset: any
  currentQuery?: string
  onApplyQuery: (sql: string | null) => void
  onToggleAI: () => void
  isLoading: boolean
}

export const ProSourceMeshHeader: React.FC<ProSourceMeshHeaderProps> = ({
  connectionId,
  asset,
  currentQuery,
  onApplyQuery,
  onToggleAI,
  isLoading,
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
    <div className="h-20 px-8 border-b border-border/40 bg-muted/5 flex items-center gap-8 shrink-0 relative z-20">
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
        <Input
          placeholder={asset ? `Filtering ${asset.name}...` : 'Select an asset to filter...'}
          className="h-12 pl-12 pr-32 rounded-2xl bg-background border-border/40 shadow-2xl focus:ring-8 focus:ring-primary/5 transition-all text-sm font-medium"
          value={
            asset && pendingSql
              ? `SQL: ${pendingSql.length > 40 ? pendingSql.substring(0, 40) + '...' : pendingSql}`
              : ''
          }
          onChange={() => {}} // Read-only via value but without opening sheet
        />
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
                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
          <Sheet open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:text-primary">
                <SlidersHorizontal size={16} />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-screen sm:max-w-none p-0 border-l border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col">
              <SheetHeader className="p-6 border-b border-border/40 bg-muted/5">
                <SheetTitle className="text-xl font-bold tracking-tight uppercase tracking-widest">
                  Visual SQL Builder
                </SheetTitle>
                <SheetDescription className="text-xs font-medium text-muted-foreground">
                  Construct precise Oracle SQL predicates for <b>{asset?.name}</b>.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden p-8 bg-background/50">
                <ProSourceQueryBuilder
                  assetName={asset?.name}
                  columns={schema?.columns || []}
                  onQueryChange={setPendingSql}
                />
              </div>
              <div className="p-6 border-t border-border/40 bg-muted/5 flex justify-end gap-3">
                <Button
                  onClick={() => {
                    onApplyQuery(pendingSql)
                    setIsBuilderOpen(false)
                  }}
                  className="rounded-xl font-bold uppercase text-[11px] tracking-widest px-8 h-11"
                >
                  Apply SQL Filter
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex items-center ml-auto gap-4 shrink-0 pl-4 border-l border-border/10">
        <Button
          variant="default"
          size="sm"
          onClick={onToggleAI}
          className="h-11 px-6 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
        >
          <Sparkles size={16} className="animate-pulse" />
          AI Neural Discovery
        </Button>

        {asset && (
          <Badge
            variant="secondary"
            className="bg-primary/5 text-primary border-primary/20 font-black h-11 px-4 rounded-2xl uppercase tracking-widest text-[9px] gap-2"
          >
            <Database size={12} /> {asset.metadata?.module}
          </Badge>
        )}
      </div>
    </div>
  )
}
