import React from 'react'
import { FileSearch, Download, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { motion, AnimatePresence } from 'framer-motion'
import { formatNumber } from '@/lib/utils'

interface StorageToolbarProps {
  totalAvailable: number
  isLoading: boolean
  selectedCount: number
  onClearSelection: () => void
  onBulkDownload: () => void
  isAllSelected: boolean
  onToggleSelectAll: () => void
}

export const StorageToolbar: React.FC<StorageToolbarProps> = ({
  totalAvailable,
  isLoading,
  selectedCount,
  onClearSelection,
  onBulkDownload,
  isAllSelected,
  onToggleSelectAll,
}) => {
  return (
    <div className="px-8 py-2 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleSelectAll}
            className="h-4 w-4 rounded border-border/40 bg-background"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
            <FileSearch size={12} /> Registry Index
          </span>
        </div>
        <Badge
          variant="outline"
          className="h-5 px-2 border-border/40 bg-background text-[10px] font-black text-primary shadow-sm"
        >
          {isLoading ? '...' : formatNumber(totalAvailable)} AVAILABLE
        </Badge>
      </div>

      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-3"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {selectedCount} SELECTED
            </span>
            <div className="h-5 w-px bg-border/20 mx-1" />
            <Button
              variant="default"
              size="sm"
              className="h-7 px-4 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              onClick={onBulkDownload}
            >
              <Download size={12} /> Bulk Fetch
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-muted"
              onClick={onClearSelection}
            >
              <X size={14} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
