import React, { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { ListTree, ChevronRight, ChevronDown, Database, Search, RefreshCw, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/utils'

interface ProSourceRegistryViewProps {
  assets: any[]
}

export const ProSourceRegistryView: React.FC<ProSourceRegistryViewProps> = ({ assets }) => {
  const [search, setSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])

  const filteredAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.metadata?.module?.toLowerCase().includes(search.toLowerCase()) ||
        a.metadata?.table?.toLowerCase().includes(search.toLowerCase())
    )
  }, [assets, search])

  const groupedAssets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filteredAssets.forEach((a) => {
      const mod = a.metadata?.module || 'General'
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(a)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filteredAssets])

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-inner group">
            <ListTree size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                Object Matrix
                <Badge variant="secondary" className="h-5 px-2 bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase">
                    {assets.length} Technical Definitions
                </Badge>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">
              Global Data Dictionary & Semantic Catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative group w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-emerald-500" />
                <Input
                    placeholder="Search technical definitions..."
                    className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-emerald-500/10 shadow-sm text-[11px] font-bold placeholder:uppercase"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all">
                <RefreshCw size={18} className="text-emerald-500" />
            </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-12 pb-32">
          {groupedAssets.map(([group, items]) => (
            <div key={group} className="space-y-6">
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => toggleGroup(group)}
              >
                <div className="h-10 w-10 rounded-xl bg-card border border-border/40 flex items-center justify-center group-hover:text-emerald-500 group-hover:border-emerald-500/30 transition-all shadow-sm">
                  {collapsedGroups.includes(group) ? (
                    <ChevronRight size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
                <div className="flex flex-col">
                    <h3 className="text-base font-black uppercase tracking-widest text-foreground/80 group-hover:text-emerald-600 transition-colors">
                        {group}
                    </h3>
                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Domain Namespace Partition</span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground text-[10px] font-black h-6 px-3 rounded-lg"
                >
                  {items.length} Definitions
                </Badge>
                <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent" />
              </div>

              <AnimatePresence initial={false}>
                {!collapsedGroups.includes(group) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2 pb-4">
                      {items.map((asset) => (
                        <div
                          key={asset.name}
                          className="p-6 rounded-[2.5rem] bg-card border border-border/40 hover:border-emerald-500/30 hover:shadow-2xl transition-all group flex flex-col gap-5 relative overflow-hidden shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="h-12 w-12 rounded-2xl bg-muted/20 border border-border/10 flex items-center justify-center text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors shadow-inner">
                              <Database size={24} />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className="text-[8px] font-black h-5 px-2 bg-muted/30 border-none uppercase tracking-widest">
                                    {asset.metadata?.view_type || 'TABLE'}
                                </Badge>
                                {asset.rows > 0 && (
                                    <span className="text-[9px] font-mono font-bold opacity-30 tabular-nums">[{formatNumber(asset.rows)}]</span>
                                )}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 relative z-10">
                            <h4 className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                                {asset.name}
                            </h4>
                            <p className="text-[9px] font-mono font-bold text-muted-foreground/40 truncate uppercase mt-1 tracking-widest">
                                {asset.metadata?.table}
                            </p>
                          </div>

                          <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-3 leading-relaxed min-h-[3rem] relative z-10">
                            {asset.metadata?.description ||
                              'Standard Seabed technical view optimized for domain entity processing and attribute mapping.'}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Active Model</span>
                            </div>
                            <Button variant="ghost" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-all bg-emerald-500/5 hover:bg-emerald-500/10">
                                Inspect Schema <ChevronRight size={12} className="ml-1" />
                            </Button>
                          </div>

                          {/* Decorative gradient */}
                          <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-emerald-500/[0.02] blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          
          {groupedAssets.length === 0 && (
            <div className="p-24 flex flex-col items-center justify-center text-center space-y-6 opacity-20 grayscale">
                <Layers size={80} strokeWidth={1} />
                <div className="space-y-2">
                    <p className="font-black uppercase text-[10px] tracking-[0.4em]">No technical matches</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest">Search query returned zero definitions in the registry</p>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
