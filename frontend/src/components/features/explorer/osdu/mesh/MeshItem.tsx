import React from 'react'
import { Eye, Box, Copy, Globe, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MeshItemProps {
  record: any
  isSelected: boolean
  onToggleSelection: (id: string) => void
  onSelectRecord: (id: string) => void
}

export const MeshItem: React.FC<MeshItemProps> = ({
  record,
  isSelected,
  onToggleSelection,
  onSelectRecord,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  // Helper to filter out uninteresting keys for the preview
  const previewAttributes = Object.entries(record)
    .filter(
      ([k]) =>
        ![
          'data',
          'acl',
          'legal',
          'kind',
          'id',
          'authority',
          'source',
          'type',
          'version',
          'relationships',
          'ancestry',
          'spatial',
          'meta',
          'tags',
        ].includes(k)
    )
    .slice(0, 3)

  const id = record.id
  const kind = record.kind
  // Parse URN: authority:source:entity:version
  const [kindAuthority, kindSource, kindEntity, kindVersion] = kind.split(':')

  const shortKind = kindEntity || 'Unknown'
  const name = id.split(':').pop()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative flex flex-col gap-4 p-5 rounded-3xl bg-card border transition-all duration-300 overflow-hidden cursor-pointer',
        isSelected
          ? 'border-primary/40 shadow-[0_0_0_1px_rgba(var(--primary),0.1)]'
          : 'border-border/40 hover:border-primary/20 hover:shadow-lg'
      )}
      onClick={() => onSelectRecord(id)}
    >
      <div className="absolute top-4 left-4 z-30" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(id)}
          className={cn(
            'h-5 w-5 rounded-md border-border/40 bg-background/50 backdrop-blur-sm transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>

      <div className="flex items-start justify-between pl-8 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[9px] font-black uppercase bg-primary/5 text-primary/80 border-primary/10 px-1.5 py-0 rounded-md tracking-wider h-5 shrink-0"
            >
              {shortKind}
            </Badge>
            <span className="text-[10px] text-muted-foreground/50 truncate font-mono">
              {kindAuthority}
            </span>
          </div>
          <h4
            className="font-bold text-sm text-foreground/90 truncate tracking-tight leading-snug pr-2"
            title={name}
          >
            {name}
          </h4>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-3 border border-border/20 flex flex-col gap-2">
        {previewAttributes.length > 0 ? (
          previewAttributes.map(([key, val]: [string, any], kIdx: number) => (
            <div
              key={key || `attr-${kIdx}`}
              className="flex items-center justify-between gap-4 min-w-0"
            >
              <span className="text-[9px] font-bold uppercase text-muted-foreground/50 truncate tracking-wider shrink-0">
                {key}
              </span>
              <span className="text-[10px] font-medium truncate text-foreground/70 text-right font-mono">
                {String(val)}
              </span>
            </div>
          ))
        ) : (
          <div className="py-1 text-center">
            <span className="text-[9px] text-muted-foreground/30 italic">No properties</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider"
            title="Authority"
          >
            <Globe size={10} /> {kindAuthority || record.authority || 'OSDU'}
          </div>
          <div
            className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider"
            title="Source"
          >
            <Database size={10} /> {kindSource || record.source || 'STD'}
          </div>
        </div>

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground"
                  onClick={() => copyToClipboard(id, 'ID')}
                >
                  <Copy size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Copy ID</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
            onClick={() => onSelectRecord(id)}
          >
            <Eye size={14} />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
