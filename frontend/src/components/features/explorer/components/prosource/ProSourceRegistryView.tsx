import React, { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { ListTree, ChevronRight, ChevronDown, Database, Box, Info, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
        a.metadata?.module?.toLowerCase().includes(search.toLowerCase())
    )
  }, [assets, search])

  const groupedAssets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filteredAssets.forEach((a) => {
      const mod = a.metadata?.module || 'Other'
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
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-inner">
            <ListTree size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Schema Registry</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
              Global Data Dictionary Catalog
            </p>
          </div>
        </div>

        <div className="relative group w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-emerald-500" />
          <Input
            placeholder="Search registry..."
            className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring- emerald-500/10 shadow-sm text-xs font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-10 max-w-7xl mx-auto w-full space-y-10 pb-32">
          {groupedAssets.map(([group, items]) => (
            <div key={group} className="space-y-6">
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => toggleGroup(group)}
              >
                <div className="h-8 w-8 rounded-lg bg-card border border-border/40 flex items-center justify-center group-hover:text-emerald-500 transition-all shadow-sm">
                  {collapsedGroups.includes(group) ? (
                    <ChevronRight size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70 group-hover:text-foreground transition-colors">
                  {group}
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground text-[10px] font-black h-5 px-2"
                >
                  {items.length}
                </Badge>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <AnimatePresence initial={false}>
                {!collapsedGroups.includes(group) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 pb-4">
                      {items.map((asset) => (
                        <div
                          key={asset.name}
                          className="p-5 rounded-3xl bg-card border border-border/40 hover:border-emerald-500/30 hover:shadow-xl transition-all group flex flex-col gap-4 relative overflow-hidden shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="h-10 w-10 rounded-xl bg-muted/20 border border-border/10 flex items-center justify-center text-muted-foreground group-hover:text-emerald-500 transition-colors">
                              <Database size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-foreground truncate">
                                {asset.name}
                              </h4>
                              <p className="text-[10px] font-mono text-muted-foreground/60 truncate uppercase mt-0.5">
                                {asset.metadata?.table}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed h-8">
                            {asset.metadata?.description ||
                              'Standard Seabed technical view for domain processing.'}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/10">
                            <Badge
                              variant="outline"
                              className="text-[8px] font-black uppercase tracking-tighter h-4 px-1.5 bg-muted/30"
                            >
                              {asset.metadata?.view_type || 'TABLE'}
                            </Badge>
                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                              Inspect <ChevronRight size={12} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
