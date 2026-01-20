import React, { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListTree,
  ChevronRight,
  ChevronDown,
  Database,
  Search,
  RefreshCw,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Download,
  Info,
  ExternalLink,
  Code,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn, formatNumber } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProSourceRegistryViewProps {
  connectionId: number
  assets: any[]
}

export const ProSourceRegistryView: React.FC<ProSourceRegistryViewProps> = ({ connectionId, assets }) => {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [inspectingAsset, setInspectingAsset] = useState<any | null>(null)

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
    <div className="h-full flex flex-col bg-muted/5 relative overflow-hidden">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-inner group">
            <ListTree size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              Object Matrix
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase"
              >
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
          
          <div className="flex bg-muted p-1 rounded-xl border border-border/20 shadow-inner">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 gap-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                viewMode === 'grid'
                  ? 'bg-background shadow-sm text-emerald-600 ring-1 ring-border/40'
                  : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} /> Grid
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 gap-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                viewMode === 'list'
                  ? 'bg-background shadow-sm text-emerald-600 ring-1 ring-border/40'
                  : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={14} /> List
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all"
          >
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
                  <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                    Domain Namespace Partition
                  </span>
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
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2 pb-4">
                        {items.map((asset) => (
                            <div
                            key={asset.name}
                            onClick={() => setInspectingAsset(asset)}
                            className="p-6 rounded-[2.5rem] bg-card border border-border/40 hover:border-emerald-500/30 hover:shadow-2xl transition-all group flex flex-col gap-5 relative overflow-hidden shadow-sm cursor-pointer"
                            >
                            <div className="flex items-start justify-between gap-4 relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-muted/20 border border-border/10 flex items-center justify-center text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors shadow-inner">
                                <Database size={24} />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                <Badge
                                    variant="outline"
                                    className="text-[8px] font-black h-5 px-2 bg-muted/30 border-none uppercase tracking-widest"
                                >
                                    {asset.metadata?.view_type || 'TABLE'}
                                </Badge>
                                {asset.rows > 0 && (
                                    <span className="text-[9px] font-mono font-bold opacity-30 tabular-nums">
                                    [{formatNumber(asset.rows)}]
                                    </span>
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
                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                                    Active Model
                                </span>
                                </div>
                                <Button
                                variant="ghost"
                                className="h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-all bg-emerald-500/5 hover:bg-emerald-500/10"
                                >
                                Inspect Schema <ChevronRight size={12} className="ml-1" />
                                </Button>
                            </div>

                            {/* Decorative gradient */}
                            <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-emerald-500/[0.02] blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-xl mb-8">
                            <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                <div className="col-span-5">Entity_Definition</div>
                                <div className="col-span-3">Base_Mapping</div>
                                <div className="col-span-2 text-center">Object_Type</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>
                            <div className="divide-y divide-border/5">
                                {items.map((asset) => (
                                    <div key={asset.name} onClick={() => setInspectingAsset(asset)} className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-emerald-500/[0.02] transition-colors group cursor-pointer">
                                        <div className="col-span-5 flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-colors shadow-inner">
                                                <Database size={18} />
                                            </div>
                                            <div className="min-w-0 flex flex-col">
                                                <span className="text-[13px] font-black truncate text-foreground/80 uppercase group-hover:text-emerald-600 transition-colors">{asset.name}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase truncate">{asset.metadata?.description || 'No description available'}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <code className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase">{asset.metadata?.table}</code>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <Badge variant="outline" className="bg-muted/30 text-[8px] font-black uppercase h-5">{asset.metadata?.view_type}</Badge>
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-all bg-emerald-500/5 hover:bg-emerald-500/10">Inspect</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {groupedAssets.length === 0 && (
            <div className="p-24 flex flex-col items-center justify-center text-center space-y-6 opacity-20 grayscale">
              <Layers size={80} strokeWidth={1} />
              <div className="space-y-2">
                <p className="font-black uppercase text-[10px] tracking-[0.4em]">
                  No technical matches
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest">
                  Search query returned zero definitions in the registry
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Schema Inspector Panel */}
      <AnimatePresence>
        {inspectingAsset && (
            <SchemaInspector 
                connectionId={connectionId}
                asset={inspectingAsset}
                onClose={() => setInspectingAsset(null)}
            />
        )}
      </AnimatePresence>
    </div>
  )
}

const SchemaInspector = ({ connectionId, asset, onClose }: { connectionId: number, asset: any, onClose: () => void }) => {
    const [tab, setTab] = useState('columns')
    
    const { data: schema, isLoading } = useQuery({
        queryKey: ['prosource', 'schema-inspect', connectionId, asset.name],
        queryFn: () => getConnectionMetadata(connectionId, 'infer_schema', { asset: asset.name }),
        enabled: !!asset
    })

    const { data: relationships } = useQuery({
        queryKey: ['prosource', 'schema-rels', connectionId, asset.name],
        queryFn: () => getConnectionMetadata(connectionId, 'find_relationships', { asset: asset.name, record: {} }),
        enabled: !!asset && tab === 'relationships'
    })

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full md:w-[600px] xl:w-[700px] bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl z-50 flex flex-col"
        >
            <div className="p-8 border-b border-border/10 flex items-center justify-between bg-muted/5">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                        <Database size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border-emerald-500/20">{asset.metadata?.view_type}</Badge>
                            <span className="text-[10px] font-mono text-muted-foreground/60">{asset.metadata?.table}</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">{asset.name}</h2>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-10 w-10 hover:bg-muted active:scale-90 transition-all"><X size={24} /></Button>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-8 py-2 border-b border-border/10 bg-muted/5">
                    <TabsList className="bg-transparent gap-8 h-12">
                        <TabsTrigger value="columns" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 text-[10px] font-black uppercase tracking-[0.2em] gap-2">
                            <LayoutGrid size={14} /> Attributes
                        </TabsTrigger>
                        <TabsTrigger value="json" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 text-[10px] font-black uppercase tracking-[0.2em] gap-2">
                            <Code size={14} /> Definition
                        </TabsTrigger>
                        <TabsTrigger value="relationships" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 text-[10px] font-black uppercase tracking-[0.2em] gap-2">
                            <ExternalLink size={14} /> Lineage
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <TabsContent value="columns" className="h-full m-0 p-0 absolute inset-0">
                        <ScrollArea className="h-full">
                            <div className="p-8">
                                {isLoading ? (
                                    <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                                        <RefreshCw className="animate-spin h-10 w-10" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Resolving Data Dictionary...</span>
                                    </div>
                                ) : (
                                    <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
                                        <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                            <div className="col-span-6">Attribute</div>
                                            <div className="col-span-3">Type</div>
                                            <div className="col-span-3 text-right">Unit</div>
                                        </div>
                                        <div className="divide-y divide-border/5">
                                            {schema?.columns?.map((col: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-emerald-500/[0.02] transition-colors group">
                                                    <div className="col-span-6 flex flex-col">
                                                        <span className="text-[11px] font-black text-foreground/80 uppercase group-hover:text-emerald-600 transition-colors">{col.name}</span>
                                                        <span className="text-[8px] font-medium text-muted-foreground/40 truncate">{col.description || 'Standard technical attribute'}</span>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <code className="text-[9px] font-mono font-black text-emerald-600/60 bg-emerald-500/5 px-2 py-0.5 rounded-md">{col.type}</code>
                                                    </div>
                                                    <div className="col-span-3 text-right">
                                                        {col.metadata?.unit && <Badge variant="secondary" className="bg-muted text-[8px] font-black uppercase px-1.5 h-4 border-none">{col.metadata.unit}</Badge>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="json" className="h-full m-0 p-0 absolute inset-0">
                        <ScrollArea className="h-full">
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Raw Metadata Manifest</h4>
                                    <Button variant="ghost" size="sm" className="h-7 gap-2 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg text-[9px] font-black uppercase px-3">
                                        <Download size={12} /> Download JSON
                                    </Button>
                                </div>
                                <CodeBlock 
                                    code={JSON.stringify(schema || asset, null, 2)}
                                    language="json"
                                    className="bg-black/40 border-border/20 text-[11px] font-mono"
                                    rounded
                                />
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="relationships" className="h-full m-0 p-0 absolute inset-0">
                        <ScrollArea className="h-full">
                            <div className="p-8">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-6 px-2">Linked Functional Entities</h4>
                                <div className="grid gap-4">
                                    {relationships?.map((rel: any, i: number) => (
                                        <div key={i} className="p-5 rounded-2xl bg-card border border-border/40 hover:border-emerald-500/30 transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-5">
                                                <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center text-muted-foreground group-hover:text-emerald-600 transition-colors">
                                                    <ExternalLink size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-black uppercase text-foreground/80 group-hover:text-emerald-600 transition-colors">{rel.target}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Linked via {rel.source_key} → {rel.target_key}</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="bg-emerald-500/5 text-emerald-600 border-none text-[8px] font-black uppercase px-2">{rel.type}</Badge>
                                        </div>
                                    ))}
                                    {(!relationships || relationships.length === 0) && (
                                        <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                                            <Info size={48} strokeWidth={1} />
                                            <p className="font-black uppercase text-[10px] tracking-[0.3em]">No outbound relationships discovered</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </div>
            </Tabs>
        </motion.div>
    )
}