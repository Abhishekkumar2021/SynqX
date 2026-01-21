import React from 'react'
import { ChevronLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/utils'

interface MeshFooterProps {
  pageOffset: number
  limit: number
  totalAvailable: number
  currentCount: number
  isLoading: boolean
  onOffsetChange: (offset: number) => void
}

export const MeshFooter: React.FC<MeshFooterProps> = ({
  pageOffset,
  limit,
  totalAvailable,
  currentCount,
  isLoading,
  onOffsetChange,
}) => {
  return (
    <div className="h-10 px-4 border-t border-border/10 bg-muted/20 backdrop-blur-md flex items-center justify-between shrink-0 relative z-20 shadow-inner">
      {/* Left info */}
      <div className="flex items-center gap-4 text-[11px] font-semibold tracking-tight">
        <span className="text-foreground">
          {formatNumber(pageOffset + 1)}–{formatNumber(pageOffset + currentCount)}
        </span>

        <span className="text-muted-foreground/40">/</span>

        <span className="text-muted-foreground/60">{formatNumber(totalAvailable)}</span>

        <span className="h-3 w-px bg-border/20 mx-1" />

        <Badge className="h-4 px-2 text-[9px] rounded-sm bg-primary/10 text-primary border-primary/20 tracking-widest">
          {limit} BUF
        </Badge>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md hover:bg-background/80 group"
          onClick={() => onOffsetChange(Math.max(0, pageOffset - limit))}
          disabled={pageOffset === 0 || isLoading}
        >
          <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md hover:bg-background/80 group"
          onClick={() => onOffsetChange(pageOffset + limit)}
          disabled={
            currentCount < limit || pageOffset + currentCount >= totalAvailable || isLoading
          }
        >
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}
