 
import React, { useState, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  X,
  Globe,
  ChevronLeft,
  Layers,
  Sparkles,
  Binary,
  MoreHorizontal,
  Eye,
  Trash2,
  ArrowRight,
  ArrowUpRight,
  Box,
  Hash,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn, formatNumber } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface OSDUMeshViewProps {
  searchQuery: string
  onQueryChange: (q: string) => void
  selectedKind: string | null
  onKindChange: (kind: string | null) => void
  searchResults: any
  isLoading: boolean
  onExecute: () => void
  onSelectRecord: (id: string) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
  limit: number
  onToggleAI: () => void
}

export const OSDUMeshView: React.FC<OSDUMeshViewProps> = ({
  searchQuery,
  onQueryChange,
  selectedKind,
  onKindChange,
  searchResults,
  isLoading,
  onExecute,
  onSelectRecord,
  pageOffset,
  onOffsetChange,
  limit,
  onToggleAI,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const results = useMemo(() => searchResults?.results || [], [searchResults])
  const totalAvailable = useMemo(() => searchResults?.total_count || 0, [searchResults])

  const handleApplyQuery = (q: string) => {
    onQueryChange(q)
    setTimeout(() => onExecute(), 50)
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length && results.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(results.map((r: any) => r.id)))
  }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onExecute()
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 bg-background">
      {/* Master Discovery Bar */}
      <div className="border-b border-border/40 bg-muted/5 relative z-20 flex flex-col shrink-0 shadow-sm">
        <div className="h-20 px-8 flex items-center gap-8">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0">
              <Layers size={24} />
            </div>
            <div className="min-w-0 mr-4">
              <h2 className="text-xl font-black tracking-tighter text-foreground uppercase leading-none">
                Data Mesh
              </h2>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5 leading-none opacity-60">
                Partition Discovery
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-3xl relative group">
            <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            <Search className="z-20 absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search partition via Lucene query..."
              className="h-12 pl-11 pr-32 rounded-2xl bg-background border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium shadow-sm"
              value={searchQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <AnimatePresence>
                {searchQuery && searchQuery !== '*' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => handleApplyQuery('*')}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
              <Button
                variant="outline"
                size="sm"
                onClick={onExecute}
                disabled={isLoading}
                className="h-8 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-border/40"
              >
                {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Execute'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-border/10">
            <Button
              variant="default"
              size="sm"
              onClick={onToggleAI}
              className="h-11 px-6 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              <Sparkles size={16} className="animate-pulse" />
              AI Neural Discovery
            </Button>

            <div className="flex items-center gap-2">
              {selectedKind && (
                <Badge className="bg-primary/5 text-primary border border-primary/20 rounded-xl px-3 py-1.5 font-black uppercase text-[9px] tracking-widest gap-2 h-9 shadow-sm">
                  <Box size={12} />
                  {selectedKind.split(':').pop()?.split('--').pop()}
                  <button
                    onClick={() => onKindChange(null)}
                    className="hover:text-rose-500 transition-colors ml-1"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl border border-border/40 hover:bg-muted"
                onClick={() => {
                  setSelectedIds(new Set())
                  onExecute()
                }}
              >
                <RefreshCw size={18} className={cn(isLoading && 'animate-spin opacity-40')} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT VIEWPORT */}
      <div className="flex-1 min-h-0 relative flex flex-col">
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
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/5">
          {!isLoading && results.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8 z-10 animate-in fade-in zoom-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
                <div className="relative h-24 w-24 rounded-[2.5rem] border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shadow-inner bg-background/50">
                  <Search size={48} strokeWidth={1} className="text-muted-foreground/40" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-black text-3xl tracking-tighter uppercase text-foreground">
                  Discovery Idle
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] max-w-sm mx-auto text-muted-foreground leading-relaxed">
                  The mesh is empty. Execute a query or use the neural assistant to resolve
                  partition entities.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-black uppercase text-[10px] tracking-[0.2em] h-11 px-8"
                onClick={onToggleAI}
              >
                <Sparkles size={14} className="mr-3" /> Initialize Assistant
              </Button>
            </div>
          )}

          <ScrollArea className="h-full">
            <div className="p-10 max-w-[1600px] mx-auto w-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-8 opacity-40">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
                    <RefreshCw className="h-16 w-16 text-primary animate-spin" strokeWidth={1} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">
                    Materializing partition frame...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-24">
                  {results.map((r: any, idx: number) => (
                    <motion.div
                      key={r.id || `result-${idx}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'group p-6 rounded-[2.5rem] bg-card border transition-all flex flex-col gap-6 relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 duration-500',
                        selectedIds.has(r.id)
                          ? 'border-primary/40 ring-4 ring-primary/5 scale-[1.02] z-10'
                          : 'border-border/40 hover:border-primary/20'
                      )}
                    >
                      <div
                        className="absolute top-5 left-5 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={() => toggleSelection(r.id)}
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
                            title={r.id.split(':').pop()}
                          >
                            {r.id.split(':').pop()}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5 min-w-0">
                            <Badge
                              variant="secondary"
                              className="text-[8px] font-black uppercase bg-primary/5 text-primary/70 border-primary/10 px-2 h-4.5 tracking-widest shrink-0"
                            >
                              {r.kind.split(':').slice(-2, -1)[0].split('--').pop()}
                            </Badge>
                            <span
                              className="text-[9px] font-mono text-muted-foreground/30 truncate flex-1 tracking-tight"
                              title={r.kind}
                            >
                              {r.kind}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/20 rounded-[1.5rem] p-4 border border-border/5 shadow-inner flex flex-col gap-3">
                        {Object.entries(r)
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
                              ].includes(k)
                          )
                          .slice(0, 3)
                          .map(([key, val]: [string, any], kIdx: number) => (
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
                          ))}
                        {Object.keys(r).length < 8 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase opacity-20 tracking-[0.2em]">
                              Source
                            </span>
                            <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-tighter">
                              {r.source || 'Standard'}
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
                              {r.authority || 'OSDU'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300 active:scale-90"
                            onClick={() => onSelectRecord(r.id)}
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
                                onClick={() => copyToClipboard(r.id, 'Entity ID')}
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
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* NAVIGATION FOOTER */}
        <div className="px-10 py-4 border-t border-border/10 bg-muted/20 backdrop-blur-md flex items-center justify-between shrink-0 relative z-20 shadow-inner">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 leading-none">
                technical_partition_frame
              </span>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="text-sm font-black text-foreground tracking-tighter uppercase">
                  {formatNumber(pageOffset + 1)} — {formatNumber(pageOffset + results.length)}
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
              <ChevronLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />{' '}
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-6 gap-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border-border/40 hover:bg-background hover:border-primary/40 transition-all shadow-sm group"
              onClick={() => onOffsetChange(pageOffset + limit)}
              disabled={
                results.length < limit || pageOffset + results.length >= totalAvailable || isLoading
              }
            >
              Next Discover{' '}
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
