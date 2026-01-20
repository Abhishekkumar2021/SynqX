import React from 'react'
import { Layers, Binary, X, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { motion, AnimatePresence } from 'framer-motion'
import { formatNumber } from '@/lib/utils'
import { toast } from 'sonner'

interface MeshToolbarProps {
  results: any[]
  selectedIds: Set<string>
  isLoading: boolean
  totalAvailable: number
  toggleSelectAll: () => void
  setSelectedIds: (ids: Set<string>) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export const MeshToolbar: React.FC<MeshToolbarProps> = ({
  results,
  selectedIds,
  isLoading,
  totalAvailable,
  toggleSelectAll,
  setSelectedIds,
  viewMode,
  onViewModeChange,
}) => {
  const handleExport = () => {
    const data = results.filter((r: any) => selectedIds.has(r.id))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mesh_export_${Date.now()}.json`
    a.click()
    toast.success(`Exported ${selectedIds.size} records`)
  }

  return (
    <div className="px-8 py-3 border-b border-border/10 bg-muted/10 flex items-center justify-between shrink-0 backdrop-blur-sm">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={results.length > 0 && selectedIds.size === results.length}
            onCheckedChange={toggleSelectAll}
            className="h-4.5 w-4.5 rounded-md border-border/40 bg-background"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
            <Layers size={14} /> Partition Index
          </span>
        </div>
        <div className="h-4 w-px bg-border/20" />
        <Badge
          variant="outline"
          className="h-6 px-3 border-border/40 bg-background text-[10px] font-black text-foreground/80 tracking-widest uppercase rounded-full shadow-sm"
        >
          {isLoading ? 'Scanning...' : formatNumber(totalAvailable)} Records Resolved
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                {selectedIds.size} SELECTED
              </span>
              <div className="h-5 w-px bg-border/20 mx-1" />
              <Button
                variant="default"
                size="sm"
                className="h-8 px-5 rounded-xl gap-2.5 font-black uppercase text-[10px] tracking-widest bg-primary shadow-lg shadow-primary/20 text-white transition-all active:scale-95"
                onClick={handleExport}
              >
                <Binary size={14} /> Export Bundle
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-muted"
                onClick={() => setSelectedIds(new Set())}
              >
                <X size={14} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/40 h-10">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-lg transition-all"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid
              size={16}
              className={viewMode === 'grid' ? 'text-foreground' : 'text-muted-foreground'}
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
              className={viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground'}
            />
          </Button>
        </div>
      </div>
    </div>
  )
}
