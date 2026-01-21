import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, X } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface OSDUToolbarProps {
  totalAvailable: number
  selectedCount: number
  onClearSelection: () => void
  isAllSelected: boolean
  onToggleSelectAll: () => void
  isLoading?: boolean
  onBulkDownload?: () => void
  onBulkDelete?: () => void
  children?: React.ReactNode
}

export const OSDUToolbar: React.FC<OSDUToolbarProps> = ({
  totalAvailable,
  selectedCount,
  onClearSelection,
  isAllSelected,
  onToggleSelectAll,
  isLoading,
  onBulkDownload,
  onBulkDelete,
  children,
}) => {
  return (
    <div className="h-10 px-4 border-b border-border/10 bg-background/60 backdrop-blur-sm flex items-center justify-between shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleSelectAll}
            disabled={isLoading || totalAvailable === 0}
            className="h-3.5 w-3.5 rounded border-border/40"
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {isAllSelected ? 'Clear page' : 'Select page'}
          </span>
        </label>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-border/20 animate-in fade-in slide-in-from-left-1 duration-200">
            <Badge className="h-4 px-1.5 text-[9px] font-bold bg-primary/90 text-white">
              {selectedCount}
            </Badge>

            {onBulkDownload && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
                onClick={onBulkDownload}
              >
                <Download size={11} />
              </Button>
            )}

            {onBulkDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] gap-1 hover:bg-destructive/10 hover:text-destructive"
                onClick={onBulkDelete}
              >
                <X size={11} />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-foreground"
              onClick={onClearSelection}
            >
              <X size={12} />
            </Button>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {children}

        {!isLoading && totalAvailable > 0 && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40">
            {formatNumber(totalAvailable)} resolved
          </span>
        )}
      </div>
    </div>
  )
}
