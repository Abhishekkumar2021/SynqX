import React from 'react'
import {
  FileArchive,
  Image,
  FileCode,
  FileText,
  File,
  Globe,
  Eye,
  MoreHorizontal,
  FileDown,
  Copy,
  Trash2,
  Database
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn, formatBytes } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface StorageGridProps {
  files: any[]
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  onSelectFile: (id: string) => void
  onDownload: (id: string, name: string) => void
  onCopyId: (id: string) => void
}

const getFileIcon = (name: string = '') => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['zip', 'tar', 'gz', '7z'].includes(ext || ''))
    return <FileArchive className="text-orange-500" />
  if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || ''))
    return <Image className="text-pink-500" />
  if (['json', 'yaml', 'xml', 'csv', 'sql'].includes(ext || ''))
    return <FileCode className="text-blue-500" />
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || ''))
    return <FileText className="text-rose-500" />
  return <File className="text-primary" />
}

export const StorageGrid: React.FC<StorageGridProps> = ({
  files,
  selectedIds,
  toggleSelection,
  onSelectFile,
  onDownload,
  onCopyId,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-24">
      {files.map((f) => (
        <motion.div
          key={f.id}
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'group relative flex flex-col gap-4 p-5 rounded-3xl bg-card border transition-all duration-300 overflow-hidden cursor-pointer',
            selectedIds.has(f.id)
              ? 'border-primary/40 shadow-[0_0_0_1px_rgba(var(--primary),0.1)]'
              : 'border-border/40 hover:border-primary/20 hover:shadow-lg'
          )}
          onClick={() => onSelectFile(f.id)}
        >
          <div
            className={cn(
                "absolute top-4 left-4 z-30 transition-all duration-200",
                selectedIds.has(f.id) ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selectedIds.has(f.id)}
              onCheckedChange={() => toggleSelection(f.id)}
              className={cn(
                "h-5 w-5 rounded-md border-border/40 bg-background/50 backdrop-blur-sm transition-opacity",
                 selectedIds.has(f.id) ? "opacity-100 bg-primary border-primary text-primary-foreground" : "opacity-100 bg-background/80"
              )}
            />
          </div>

          <div className="flex items-start justify-between pl-8 min-w-0">
             <div className="flex flex-col gap-1.5 min-w-0 w-full">
                 <div className="flex items-center gap-2">
                    <Badge
                        variant="secondary"
                        className="text-[9px] font-black uppercase bg-primary/5 text-primary/80 border-primary/10 px-1.5 py-0 rounded-md tracking-wider h-5 shrink-0"
                    >
                        {f.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/50 truncate font-mono" title={f.id}>
                        {f.id.split(':').pop()}
                    </span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="shrink-0 opacity-70">
                        {React.cloneElement(getFileIcon(f.name) as any, { size: 14 })}
                    </div>
                    <h4
                        className="font-bold text-sm text-foreground/90 truncate tracking-tight leading-snug pr-2"
                        title={f.name}
                    >
                        {f.name}
                    </h4>
                 </div>
             </div>
          </div>

          <div className="bg-muted/30 rounded-2xl p-3 border border-border/20 flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between gap-4 min-w-0">
              <span className="text-[9px] font-bold uppercase text-muted-foreground/50 truncate tracking-wider shrink-0">
                Size
              </span>
              <span className="text-[10px] font-medium truncate text-foreground/70 text-right font-mono">
                {formatBytes(parseInt(f.size))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 min-w-0">
              <span className="text-[9px] font-bold uppercase text-muted-foreground/50 truncate tracking-wider shrink-0">
                Indexed
              </span>
              <span className="text-[10px] font-medium truncate text-foreground/70 text-right font-mono">
                {new Date(f.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-2 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider" title="Source">
                    <Globe size={10} /> {f.source.split('/').pop() || 'Cloud'}
                </div>
             </div>
            
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground"
                    onClick={() => onDownload(f.id, f.name)}
                >
                    <FileDown size={14} />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => onSelectFile(f.id)}
                >
                    <Eye size={14} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                        <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/40 bg-background/95 backdrop-blur-sm">
                    <DropdownMenuItem
                        className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                        onClick={() => copyToClipboard(f.id, 'ID')}
                    >
                        <Copy size={12} className="opacity-50" /> Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                        onClick={() => onDownload(f.id, f.name)}
                    >
                        <FileDown size={12} className="opacity-50" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="opacity-20" />
                    <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2 text-destructive focus:text-destructive cursor-pointer">
                        <Trash2 size={12} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
             </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
