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
    <div className="px-10 py-4 border-t border-border/10 bg-muted/20 backdrop-blur-md flex items-center justify-between shrink-0 relative z-20 shadow-inner">
      <div className="flex items-center gap-10">
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 leading-none">
            technical_partition_frame
          </span>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-sm font-black text-foreground tracking-tighter uppercase">
              {formatNumber(pageOffset + 1)} — {formatNumber(pageOffset + currentCount)}
            </span>
            <div className="h-1 w-1 rounded-full bg-border/40" />
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              total: {formatNumber(totalAvailable)}
            </span>
          </div>
        </div>
        <div className="h-10 w-px bg-border/10" />
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 leading-none">
            Discovery_Density
          </span>
          <div className="flex items-center gap-2 mt-2.5">
            <Badge className="bg-primary/5 text-primary border-primary/20 font-black h-5 text-[9px] rounded-sm tracking-widest">
              {limit} BUFFER
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-6 gap-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border-border/40 hover:bg-background hover:border-primary/40 transition-all shadow-sm group"
          onClick={() => onOffsetChange(Math.max(0, pageOffset - limit))}
          disabled={pageOffset === 0 || isLoading}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />{' '}
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-6 gap-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border-border/40 hover:bg-background hover:border-primary/40 transition-all shadow-sm group"
          onClick={() => onOffsetChange(pageOffset + limit)}
          disabled={
            currentCount < limit || pageOffset + currentCount >= totalAvailable || isLoading
          }
        >
          Next Discover{' '}
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}
