import React from 'react'
import {
  Eye,
  MoreHorizontal,
  Box,
  Hash,
  Binary,
  Trash2,
  ArrowUpRight,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

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
          'tags'
        ].includes(k)
    )
    .slice(0, 3)

  const id = record.id
  const kind = record.kind
  const shortKind = kind.split(':').slice(-2, -1)[0]?.split('--').pop() || 'Unknown'
  const name = id.split(':').pop()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group p-6 rounded-[2.5rem] bg-card border transition-all flex flex-col gap-6 relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 duration-500',
        isSelected
          ? 'border-primary/40 ring-4 ring-primary/5 scale-[1.02] z-10'
          : 'border-border/40 hover:border-primary/20'
      )}
    >
      <div
        className="absolute top-5 left-5 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(id)}
          className="h-5 w-5 rounded-lg border-border/40 bg-background shadow-md"
        />
      </div>

      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-x-[-4px] group-hover:translate-y-[4px]">
        <ArrowUpRight size={20} className="text-primary/40" />
      </div>

      <div className="flex items-start gap-5 pt-1 min-w-0">
        <div className="h-12 w-12 rounded-2xl bg-muted/30 border border-border/10 flex items-center justify-center text-muted-foreground shrink-0 transition-all duration-500 group-hover:bg-primary/10 group-hover:text-primary group-hover:rotate-6 shadow-inner">
          <Box size={24} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden space-y-1.5">
          <h4
            className="font-black text-sm truncate text-foreground/90 tracking-tight leading-none uppercase pr-8 group-hover:text-primary transition-colors"
            title={name}
          >
            {name}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 min-w-0">
            <Badge
              variant="secondary"
              className="text-[8px] font-black uppercase bg-primary/5 text-primary/70 border-primary/10 px-2 h-4.5 tracking-widest shrink-0"
            >
              {shortKind}
            </Badge>
            <span
              className="text-[9px] font-mono text-muted-foreground/30 truncate flex-1 tracking-tight"
              title={kind}
            >
              {kind}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-muted/20 rounded-[1.5rem] p-4 border border-border/5 shadow-inner flex flex-col gap-3">
        {previewAttributes.length > 0 ? (
          previewAttributes.map(([key, val]: [string, any], kIdx: number) => (
            <div
              key={key || `attr-${kIdx}`}
              className="flex items-center justify-between gap-4 min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[8px] font-black uppercase opacity-20 truncate tracking-[0.2em] shrink-0">
                  {key}
                </span>
              </div>
              <span className="text-[10px] font-bold truncate text-foreground/60 text-right font-mono">
                {String(val)}
              </span>
            </div>
          ))
        ) : (
             <div className="py-2 text-center">
                 <span className="text-[9px] text-muted-foreground/30 italic">No public properties</span>
             </div>
        )}
        {Object.keys(record).length < 8 && (
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase opacity-20 tracking-[0.2em]">
              Source
            </span>
            <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-tighter">
              {record.source || 'Standard'}
            </span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border/5 flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-muted-foreground/30 uppercase tracking-widest leading-none mb-1">
              Partition
            </span>
            <span className="text-[9px] font-bold text-muted-foreground/60 flex items-center gap-1.5 uppercase">
              <Globe size={10} className="text-primary/40" />{' '}
              {record.authority || 'OSDU'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300 active:scale-90"
            onClick={() => onSelectRecord(id)}
          >
            <Eye size={18} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground/40 transition-all"
              >
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-[1.5rem] border-white/5 bg-neutral-900/90 backdrop-blur-2xl shadow-2xl p-2.5"
            >
              <DropdownMenuItem
                className="text-[10px] font-black uppercase tracking-widest gap-3 py-3 rounded-xl focus:bg-primary/10 focus:text-primary transition-all cursor-pointer"
                onClick={() => copyToClipboard(id, 'Entity ID')}
              >
                <Hash size={14} className="opacity-40" /> Copy Unique ID
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest gap-3 py-3 rounded-xl focus:bg-primary/10 focus:text-primary transition-all cursor-pointer">
                <Binary size={14} className="opacity-40" /> Inspect Manifest
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-white/5" />
              <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest gap-3 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10 transition-all cursor-pointer">
                <Trash2 size={14} /> Expunge Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  )
}
