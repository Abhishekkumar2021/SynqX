import React, { useMemo, useState } from 'react'
import {
  Search,
  ChevronRight,
  Box,
  ChevronDown} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatNumber } from '@/lib/utils'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])

  const groupedAssets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    const filtered = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.metadata?.module?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.metadata?.table?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.forEach((asset) => {
      const mod = asset.metadata?.module || 'General'
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(asset)
    })

    return Object.keys(groups)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name))
          return acc
        },
        {} as Record<string, any[]>
      )
  }, [assets, searchQuery])

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => 
        prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  return (
    <aside className="w-80 border-r border-border/40 bg-muted/5 backdrop-blur-3xl flex flex-col shrink-0 h-full relative z-30">
      <div className="p-6 space-y-6 border-b border-border/10 bg-card/30">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
              Domain_Registry
            </h3>
            <Badge variant="outline" className="h-4 px-1.5 rounded-sm text-[8px] font-black border-primary/20 text-primary/60 bg-primary/5 uppercase">
                {assets.length} Models
            </Badge>
          </div>
          <div className="relative group">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
            <Input
              placeholder="Search seabed objects..."
              className="pl-10 h-10 bg-background/40 border-border/40 rounded-2xl text-[11px] font-bold focus:ring-8 focus:ring-primary/5 transition-all shadow-sm placeholder:text-muted-foreground/30 placeholder:uppercase"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2 pb-32">
          {Object.entries(groupedAssets).map(([module, groupItems]) => {
            const isCollapsed = collapsedGroups.includes(module)
            
            return (
              <div key={module} className="space-y-1">
                <button 
                    onClick={() => toggleGroup(module)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors group/group-head sticky top-0 bg-background/95 backdrop-blur-sm z-10 rounded-lg"
                >
                    <div className="h-4 w-4 rounded bg-muted/50 flex items-center justify-center transition-transform duration-300 group-hover/group-head:bg-primary/10 group-hover/group-head:text-primary">
                        {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                    </div>
                    {module}
                    <span className="ml-auto opacity-30 group-hover/group-head:opacity-60">{groupItems.length}</span>
                </button>
                
                <AnimatePresence initial={false}>
                    {!isCollapsed && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-0.5 overflow-hidden"
                        >
                            {groupItems.map((asset) => {
                            const isActive = selectedAsset?.name === asset.name
                            return (
                                <button
                                key={asset.name}
                                onClick={() => onSelectAsset(asset)}
                                className={cn(
                                    'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 group text-left relative overflow-hidden',
                                    isActive
                                    ? 'bg-primary/10 text-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20'
                                    : 'text-muted-foreground/70 hover:bg-muted/40 hover:text-foreground'
                                )}
                                >
                                {isActive && (
                                    <motion.div 
                                        layoutId="sidebar-active-pill" 
                                        className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                                
                                <div className="min-w-0 flex-1 pl-1">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[11px] font-bold truncate leading-none transition-colors",
                                            isActive ? "text-primary" : "group-hover:text-foreground"
                                        )}>
                                            {asset.name}
                                        </span>
                                        {asset.rows > 0 && (
                                            <span className="text-[8px] font-mono opacity-30">[{formatNumber(asset.rows)}]</span>
                                        )}
                                    </div>
                                    <p className="text-[8px] font-medium text-muted-foreground/40 uppercase mt-1 truncate tracking-wider group-hover:text-muted-foreground/60 transition-colors">
                                        {asset.metadata?.table}
                                    </p>
                                </div>

                                <ChevronRight 
                                    size={12} 
                                    className={cn(
                                        "transition-all duration-300 shrink-0",
                                        isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-40"
                                    )} 
                                />
                                </button>
                            )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
            )
          })}
          {Object.keys(groupedAssets).length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <Box size={32} className="text-muted-foreground" />
                <p className="text-[10px] uppercase font-black tracking-[0.2em]">
                    No semantic matches
                </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
