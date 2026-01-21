import React, { useState, useMemo } from 'react'
import {
  Search,
  Database,
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  ArrowRight,
  MonitorCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatNumber } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'

interface ProSourceSidebarProps {
  assets: any[]
  selectedAsset: any
  onSelectAsset: (asset: any) => void
}

export const ProSourceSidebar: React.FC<ProSourceSidebarProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
}) => {
  const [search, setSearch] = useState('')
  const [collapsedDomains, setCollapsedDomains] = useState<string[]>([])

  const assetGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    const filtered = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.metadata?.module || a.metadata?.MODULE || '')
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (a.metadata?.table || a.metadata?.TABLE || '').toLowerCase().includes(search.toLowerCase())
    )

    filtered.forEach((asset) => {
      let mod =
        asset.metadata?.module || asset.metadata?.MODULE || asset.metadata?.domain || 'General'
      // Normalize casing for grouping
      mod = mod.charAt(0).toUpperCase() + mod.slice(1).toLowerCase()
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(asset)
    })

    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [assets, search])

  const toggleDomain = (domain: string) => {
    setCollapsedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    )
  }

  return (
    <aside className="w-80 border-r border-border/40 bg-card/30 flex flex-col shrink-0 relative z-20 backdrop-blur-xl">
      <div className="p-6 border-b border-border/10 bg-muted/5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 leading-none">
              Catalog_Context
            </span>
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
              Entity Mesh Explorer
            </h3>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Layers size={16} />
          </div>
        </div>

        <div className="relative group">
          <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search domain assets..."
            className="h-9 pl-9 rounded-xl bg-background border-border/40 focus:ring-primary/10 shadow-sm text-[11px] font-bold placeholder:uppercase placeholder:opacity-30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1 pb-32">
          {assetGroups.map(([domain, items]) => (
            <div key={domain} className="space-y-0.5">
              <button
                onClick={() => toggleDomain(domain)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center transition-all',
                      collapsedDomains.includes(domain)
                        ? 'bg-muted/50 text-muted-foreground'
                        : 'bg-primary/5 text-primary shadow-inner'
                    )}
                  >
                    {collapsedDomains.includes(domain) ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground/70 group-hover:text-primary transition-colors">
                    {domain}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 bg-muted border-none text-[9px] font-black opacity-40"
                >
                  {items.length}
                </Badge>
              </button>

              <AnimatePresence initial={false}>
                {!collapsedDomains.includes(domain) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden px-2 space-y-0.5"
                  >
                    {items.map((asset) => {
                      const isSelected =
                        selectedAsset?.name === asset.name || selectedAsset?.NAME === asset.name
                      return (
                        <button
                          key={asset.name}
                          onClick={() => onSelectAsset(asset)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 relative group/item',
                            isSelected
                              ? 'bg-primary shadow-xl shadow-primary/20 text-white translate-x-1'
                              : 'hover:bg-primary/5 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-inner',
                              isSelected
                                ? 'bg-white/20 rotate-12 scale-110'
                                : 'bg-muted/30 group-hover/item:bg-primary/10'
                            )}
                          >
                            <Box size={16} strokeWidth={isSelected ? 2.5 : 1.5} />
                          </div>

                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="text-[11px] font-black uppercase tracking-tight truncate w-full">
                              {asset.name}
                            </span>
                            {!isSelected && (
                              <span className="text-[8px] font-bold opacity-30 uppercase tracking-[0.2em] truncate w-full">
                                {asset.metadata?.table || asset.metadata?.TABLE || 'technical_view'}
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <MonitorCheck size={14} className="animate-in zoom-in duration-300" />
                          )}

                          {!isSelected && asset.rows > 0 && (
                            <span className="text-[9px] font-mono font-bold opacity-20 group-hover/item:opacity-40 tabular-nums">
                              {formatNumber(asset.rows)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-border/10 bg-muted/5">
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-background border border-border/40 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
            <Database size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">
              Session_Scope
            </span>
            <span className="text-[10px] font-bold text-foreground/80 truncate uppercase tracking-tight">
              Oracle Live Session
            </span>
          </div>
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <ArrowRight size={24} />
          </div>
        </div>
      </div>
    </aside>
  )
}
