import React, { useMemo, useState } from 'react'
import {
  Search,
  Layers,
  Database,
  ChevronRight,
  Box,
  Droplet,
  Mountain,
  FileStack,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const DOMAIN_CONFIG: Record<string, { color: string; icon: any; bg: string }> = {
  Well: { color: 'text-emerald-500', icon: Droplet, bg: 'bg-emerald-500/10' },
  Seismic: { color: 'text-violet-500', icon: Mountain, bg: 'bg-violet-500/10' },
  Logs: { color: 'text-amber-500', icon: FileStack, bg: 'bg-amber-500/10' },
  General: { color: 'text-blue-500', icon: Database, bg: 'bg-blue-500/10' },
  Other: { color: 'text-muted-foreground', icon: Box, bg: 'bg-muted/50' },
}

const getDomainStyle = (module: string) => {
  return DOMAIN_CONFIG[module] || DOMAIN_CONFIG['Other']
}

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

  const groupedAssets = useMemo(() => {
    const groups: Record<string, any[]> = {}
    const filtered = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.metadata?.module?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.forEach((asset) => {
      const mod = asset.metadata?.module || 'Other'
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(asset)
    })

    // Sort keys
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

  return (
    <aside className="w-80 border-r border-border/40 bg-muted/10 backdrop-blur-xl flex flex-col shrink-0 h-full">
      <div className="p-4 space-y-4 border-b border-border/40 bg-background/50">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 px-1">
            Domain Entities
          </h3>
          <div className="relative group">
            <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search tables & views..."
              className="pl-9 h-9 bg-background/50 border-border/40 rounded-xl text-xs font-medium focus:ring-primary/10 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          {Object.entries(groupedAssets).map(([module, groupItems]) => {
            const style = getDomainStyle(module)
            const Icon = style.icon

            return (
              <div key={module} className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10 rounded-lg mb-1">
                  <Icon size={10} />
                  {module} ({groupItems.length})
                </div>
                {groupItems.map((asset) => {
                  const isActive = selectedAsset?.name === asset.name
                  return (
                    <button
                      key={asset.name}
                      onClick={() => onSelectAsset(asset)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group text-left relative',
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          style.bg.replace('/10', '')
                        )}
                      />
                      <span className="text-[11px] font-medium truncate flex-1 leading-tight">
                        {asset.name}
                      </span>
                      {isActive && (
                        <motion.div layoutId="active-indicator" className="absolute right-2">
                          <ChevronRight size={12} />
                        </motion.div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
          {Object.keys(groupedAssets).length === 0 && (
            <div className="p-8 text-center text-muted-foreground/40 text-[10px] uppercase font-bold tracking-widest">
              No entities found
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
