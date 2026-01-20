import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Filter,
  ArrowRight,
  ChevronRight,
  Box,
  FileText,
  Globe,
  Star,
  Activity,
  Database,
  ArrowUpRight,
  Info,
  Droplet,
  Mountain,
  FileStack
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn, formatNumber } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const DOMAIN_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  Well: { label: 'Well Delivery', color: 'text-emerald-500', icon: Droplet, bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Seismic: { label: 'Seismic Trace', color: 'text-violet-500', icon: Mountain, bg: 'bg-violet-500/10 border-violet-500/20' },
  Logs: { label: 'Well Logs', color: 'text-amber-500', icon: FileStack, bg: 'bg-amber-500/10 border-amber-500/20' },
  General: { label: 'Core Data', color: 'text-blue-500', icon: Database, bg: 'bg-blue-500/10 border-blue-500/20' },
  Other: { label: 'Reference', color: 'text-muted-foreground', icon: Box, bg: 'bg-muted/50 border-border/40' },
}

const getDomainStyle = (module: string) => {
  return DOMAIN_CONFIG[module] || DOMAIN_CONFIG['Other']
}

interface ProSourceMeshViewProps {
  assets: any[]
  onSelectEntity: (entity: any) => void
}

export const ProSourceMeshView: React.FC<ProSourceMeshViewProps> = ({
  assets,
  onSelectEntity,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedModule, setSelectedModule] = useState<string>('All')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const modules = useMemo(() => {
    const mods = new Set(assets.map((a) => a.metadata?.module || 'Other'))
    return ['All', ...Array.from(mods).sort()]
  }, [assets])

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.metadata?.module?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesModule = selectedModule === 'All' || a.metadata?.module === selectedModule
      
      return matchesSearch && matchesModule
    })
  }, [assets, searchQuery, selectedModule])

  const groupedAssets = useMemo(() => {
    if (selectedModule !== 'All') return { [selectedModule]: filteredAssets }
    
    const groups: Record<string, any[]> = {}
    filteredAssets.forEach(asset => {
        const mod = asset.metadata?.module || 'Other'
        if (!groups[mod]) groups[mod] = []
        groups[mod].push(asset)
    })
    return groups
  }, [filteredAssets, selectedModule])

  const toggleFavorite = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    const next = new Set(favorites)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setFavorites(next)
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between gap-6 shrink-0 z-20">
        <div className="relative flex-1 max-w-lg group">
          <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
          <Input
            placeholder="Filter entities..."
            className="pl-10 h-10 bg-background/50 border-border/60 rounded-xl focus:ring-primary/10 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <ScrollArea className="w-[400px] whitespace-nowrap">
            <ToggleGroup type="single" value={selectedModule} onValueChange={(v) => v && setSelectedModule(v)}>
              {modules.map((m) => {
                const style = getDomainStyle(m)
                return (
                  <ToggleGroupItem
                    key={m}
                    value={m}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-transparent transition-all",
                        selectedModule === m 
                            ? cn("bg-background shadow-sm", style.color, style.bg.replace('bg-', 'border-')) 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {m === 'All' ? 'Overview' : m}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </ScrollArea>

          <div className="h-6 w-px bg-border/40" />

          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "h-7 w-7 p-0 rounded-md transition-all",
                viewMode === 'grid' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                "h-7 w-7 p-0 rounded-md transition-all",
                viewMode === 'list' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid/List Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 pb-20">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Layers size={48} className="text-muted-foreground mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No Entities Found</p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedAssets).map(([groupName, groupItems]) => {
                 const groupStyle = getDomainStyle(groupName)
                 const GroupIcon = groupStyle.icon

                 return (
                    <div key={groupName} className="space-y-4">
                        {selectedModule === 'All' && (
                            <div className="flex items-center gap-3">
                                <div className={cn("p-1.5 rounded-lg", groupStyle.bg, groupStyle.color)}>
                                    <GroupIcon size={14} />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">{groupName}</h3>
                                <div className="h-px flex-1 bg-border/40" />
                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">{groupItems.length} entities</span>
                            </div>
                        )}
                        
                        <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                        )}>
                        {groupItems.map((asset: any) => {
                            const isFav = favorites.has(asset.name)
                            const assetModule = asset.metadata?.module || 'Other'
                            const assetStyle = getDomainStyle(assetModule)
                            const AssetIcon = assetStyle.icon
                            
                            if (viewMode === 'list') {
                            return (
                                <motion.div
                                key={asset.name}
                                layoutId={`card-${asset.name}`}
                                onClick={() => onSelectEntity(asset)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:bg-muted/5 transition-all cursor-pointer"
                                >
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-colors", assetStyle.bg, assetStyle.color)}>
                                    <AssetIcon size={18} />
                                    </div>
                                    <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-foreground">{asset.name}</h4>
                                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 bg-muted/30">{asset.type}</Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">
                                        {asset.metadata?.module || 'General'} • {asset.metadata?.table || 'Table'}
                                    </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {asset.rows !== null && asset.rows !== undefined && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded-md">
                                        <Activity size={12} className="text-emerald-500" />
                                        {formatNumber(asset.rows)}
                                    </div>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight size={16} />
                                    </Button>
                                </div>
                                </motion.div>
                            )
                            }

                            return (
                            <motion.div
                                key={asset.name}
                                layoutId={`card-${asset.name}`}
                                onClick={() => onSelectEntity(asset)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -4 }}
                                className="group relative p-5 rounded-[1.5rem] bg-card border border-border/40 hover:border-primary/30 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer overflow-hidden flex flex-col"
                            >
                                <div className={cn("absolute top-0 right-0 p-20 bg-linear-to-br from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl pointer-events-none", assetStyle.color.replace('text-', 'from-').replace('500', '500/10'))} />
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-colors border", assetStyle.bg, assetStyle.color)}>
                                    <AssetIcon size={20} />
                                </div>
                                <button 
                                    onClick={(e) => toggleFavorite(e, asset.name)}
                                    className={cn("p-2 rounded-full hover:bg-muted transition-colors", isFav ? "text-amber-400" : "text-muted-foreground/20 hover:text-amber-400")}
                                >
                                    <Star size={14} fill={isFav ? "currentColor" : "none"} />
                                </button>
                                </div>

                                <div className="space-y-1 mb-4 flex-1 relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-wider h-4 px-1.5 border-transparent bg-background/50", assetStyle.color)}>
                                    {asset.metadata?.module || 'DATA'}
                                    </Badge>
                                </div>
                                <h4 className="text-base font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                    {asset.name}
                                </h4>
                                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                    {asset.metadata?.description || `Standard ProSource ${asset.metadata?.module || 'data'} entity table.`}
                                </p>
                                </div>

                                <div className="pt-4 border-t border-border/40 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                                    {asset.rows !== null ? (
                                        <>
                                            <Activity size={12} className="text-emerald-500" />
                                            <span>{formatNumber(asset.rows)} rows</span>
                                        </>
                                    ) : (
                                        <>
                                            <Info size={12} />
                                            <span>Metadata Only</span>
                                        </>
                                    )}
                                </div>
                                <div className="h-7 w-7 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <ArrowUpRight size={14} />
                                </div>
                                </div>
                            </motion.div>
                            )
                        })}
                        </div>
                    </div>
                 )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
