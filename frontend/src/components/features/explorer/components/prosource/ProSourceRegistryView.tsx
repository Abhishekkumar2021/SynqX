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
  X,
  BookOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn, formatNumber } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface ProSourceRegistryViewProps {
  connectionId: number
  assets: any[]
}

export const ProSourceRegistryView: React.FC<ProSourceRegistryViewProps> = ({
  connectionId,
  assets,
}) => {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [inspectingAsset, setInspectingAsset] = useState<any | null>(null)
  const [selectedAssets, setSelectedIds] = useState<Set<string>>(new Set())

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
      let mod = a.metadata?.module || a.metadata?.MODULE || 'General'
      // Normalize casing
      mod = mod.charAt(0).toUpperCase() + mod.slice(1).toLowerCase()
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

  const handleDownload = (items: any[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prosource_registry_export_${Date.now()}.json`
    a.click()
    toast.success(`${items.length} definitions exported`)
  }

  const toggleSelect = (name: string) => {
    const next = new Set(selectedAssets)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setSelectedIds(next)
  }

  return (
    <div className="h-full flex flex-col bg-muted/5 relative overflow-hidden">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-inner group">
            <BookOpen size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              Schema Registry
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase"
              >
                {filteredAssets.length} Definitions
              </Badge>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">
              Technical Metadata Catalog & Data Model Definitions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {selectedAssets.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-1.5 shadow-lg shadow-emerald-500/5"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  {selectedAssets.size} Selected
                </span>
                <div className="h-4 w-px bg-emerald-500/20 mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() =>
                    handleDownload(filteredAssets.filter((a) => selectedAssets.has(a.name)))
                  }
                >
                  <Download size={14} /> Bulk_Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-500/10 p-0 flex items-center justify-center"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group w-80">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-all group-focus-within:text-emerald-500" />
            <Input
              placeholder="Filter definitions..."
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
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="w-full pb-32">
          {groupedAssets.map(([group, items]) => (
            <div key={group} className="space-y-0">
              <div
                className="flex items-center gap-4 cursor-pointer group px-10 py-6 border-b border-border/5 bg-muted/5 backdrop-blur-sm sticky top-0 z-20"
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
                  className="bg-muted text-muted-foreground text-[10px] font-black h-6 px-3 rounded-lg ml-4"
                >
                  {items.length} Definitions
                </Badge>
                <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent ml-4" />
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
                      <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1600px] mx-auto pb-12">
                        {items.map((asset) => {
                          const isSelected = selectedAssets.has(asset.name)
                          return (
                            <div
                              key={asset.name}
                              onClick={() => toggleSelect(asset.name)}
                              className={cn(
                                'p-6 rounded-[2.5rem] bg-card border transition-all duration-500 group flex flex-col gap-5 relative overflow-hidden shadow-sm cursor-pointer hover:shadow-2xl hover:-translate-y-1',
                                isSelected
                                  ? 'border-emerald-500/40 bg-emerald-500/[0.02] shadow-xl shadow-emerald-500/5'
                                  : 'border-border/40 hover:border-emerald-500/20'
                              )}
                            >
                              <div className="flex items-start justify-between gap-4 relative z-10">
                                <div
                                  className={cn(
                                    'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner',
                                    isSelected
                                      ? 'bg-emerald-500/20 text-emerald-600 scale-110'
                                      : 'bg-muted/20 text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600'
                                  )}
                                >
                                  <Database size={24} />
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[8px] font-black h-5 px-2 bg-muted/30 border-none uppercase tracking-widest transition-colors',
                                      isSelected
                                        ? 'bg-emerald-500 text-white'
                                        : 'text-muted-foreground/60'
                                    )}
                                  >
                                    {asset.metadata?.view_type ||
                                      asset.metadata?.VIEW_TYPE ||
                                      'TABLE'}
                                  </Badge>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelect(asset.name)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn(
                                      'h-5 w-5 rounded-lg border-2 transition-all',
                                      isSelected
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-border/40 group-hover:border-emerald-500/40'
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="min-w-0 flex-1 relative z-10">
                                <h4
                                  className={cn(
                                    'text-sm font-black uppercase tracking-tight transition-colors',
                                    isSelected
                                      ? 'text-emerald-600'
                                      : 'text-foreground group-hover:text-emerald-600'
                                  )}
                                >
                                  {asset.name}
                                </h4>
                                <p className="text-[9px] font-mono font-bold text-muted-foreground/40 truncate uppercase mt-1 tracking-widest">
                                  {asset.metadata?.table || asset.metadata?.TABLE}
                                </p>
                              </div>

                              <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-3 leading-relaxed min-h-[3rem] relative z-10">
                                {asset.metadata?.description ||
                                  asset.metadata?.DESCRIPTION ||
                                  'Standard Seabed technical view optimized for domain entity processing and attribute mapping.'}
                              </p>

                              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10 relative z-10">
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    'h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all',
                                    isSelected
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                      : 'text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setInspectingAsset(asset)
                                  }}
                                >
                                  Inspect_Schema
                                </Button>
                                <ChevronRight size={14} className="text-emerald-600" />
                              </div>

                              {/* Decorative gradient */}
                              <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-emerald-500/[0.02] blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none" />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="grid grid-cols-12 gap-4 px-10 py-4 border-b bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                          <div className="col-span-5 pl-12 flex items-center gap-4">
                            Entity_Definition
                          </div>
                          <div className="col-span-3">Base_Mapping</div>
                          <div className="col-span-2 text-center">Object_Type</div>
                          <div className="col-span-2 text-right">Action</div>
                        </div>
                        <div className="divide-y divide-border/5">
                          {items.map((asset) => {
                            const isSelected = selectedAssets.has(asset.name)
                            return (
                              <div
                                key={asset.name}
                                onClick={() => toggleSelect(asset.name)}
                                className={cn(
                                  'grid grid-cols-12 gap-4 px-10 py-4 items-center transition-colors group cursor-pointer border-b border-border/5 hover:bg-emerald-500/[0.02]',
                                  isSelected && 'bg-emerald-500/[0.03]'
                                )}
                              >
                                <div className="col-span-5 flex items-center gap-4">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelect(asset.name)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4.5 w-4.5 rounded-md border-border/40"
                                  />
                                  <div
                                    className={cn(
                                      'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner',
                                      isSelected
                                        ? 'bg-emerald-500/20 text-emerald-600'
                                        : 'bg-muted/20 text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600'
                                    )}
                                  >
                                    <Database size={18} />
                                  </div>
                                  <div className="min-w-0 flex flex-col">
                                    <span
                                      className={cn(
                                        'text-[13px] font-black truncate uppercase transition-colors',
                                        isSelected
                                          ? 'text-emerald-600'
                                          : 'text-foreground/80 group-hover:text-emerald-600'
                                      )}
                                    >
                                      {asset.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase truncate">
                                      {asset.metadata?.description || 'No description available'}
                                    </span>
                                  </div>
                                </div>
                                <div className="col-span-3">
                                  <code className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase">
                                    {asset.metadata?.table}
                                  </code>
                                </div>
                                <div className="col-span-2 text-center">
                                  <Badge
                                    variant="outline"
                                    className="bg-muted/30 text-[8px] font-black uppercase h-5"
                                  >
                                    {asset.metadata?.view_type}
                                  </Badge>
                                </div>
                                <div className="col-span-2 flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setInspectingAsset(asset)
                                    }}
                                  >
                                    Inspect
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
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

const SchemaInspector = ({
  connectionId,
  asset,
  onClose,
}: {
  connectionId: number
  asset: any
  onClose: () => void
}) => {
  const [tab, setTab] = useState('columns')

  const { data: schema, isLoading } = useQuery({
    queryKey: ['prosource', 'schema-inspect', connectionId, asset.name],
    queryFn: () => getConnectionMetadata(connectionId, 'infer_schema', { asset: asset.name }),
    enabled: !!asset,
  })

  const { data: relationships } = useQuery({
    queryKey: ['prosource', 'schema-rels', connectionId, asset.name],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'find_relationships', { asset: asset.name, record: {} }),
    enabled: !!asset && tab === 'relationships',
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
              <Badge
                variant="outline"
                className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
              >
                {asset.metadata?.view_type}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                {asset.metadata?.table}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
              {asset.name}
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-xl h-10 w-10 hover:bg-muted active:scale-90 transition-all"
        >
          <X size={24} />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-8 py-2 border-b border-border/10 bg-muted/5">
          <TabsList className="bg-transparent gap-8 h-12">
            <TabsTrigger
              value="columns"
              className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 text-[10px] font-black uppercase tracking-[0.2em] gap-2"
            >
              <LayoutGrid size={14} /> Attributes
            </TabsTrigger>
            <TabsTrigger
              value="json"
              className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 text-[10px] font-black uppercase tracking-[0.2em] gap-2"
            >
              <Code size={14} /> Definition
            </TabsTrigger>
            <TabsTrigger
              value="relationships"
              className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-emerald-600 rounded-none px-0 text-[10px] font-black uppercase tracking-[0.2em] gap-2"
            >
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
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Resolving Data Dictionary...
                    </span>
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
                        <div
                          key={i}
                          className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-emerald-500/[0.02] transition-colors group"
                        >
                          <div className="col-span-6 flex flex-col">
                            <span className="text-[11px] font-black text-foreground/80 uppercase group-hover:text-emerald-600 transition-colors">
                              {col.name}
                            </span>
                            <span className="text-[8px] font-medium text-muted-foreground/40 truncate">
                              {col.description || 'Standard technical attribute'}
                            </span>
                          </div>
                          <div className="col-span-3">
                            <code className="text-[9px] font-mono font-black text-emerald-600/60 bg-emerald-500/5 px-2 py-0.5 rounded-md">
                              {col.type}
                            </code>
                          </div>
                          <div className="col-span-3 text-right">
                            {col.metadata?.unit && (
                              <Badge
                                variant="secondary"
                                className="bg-muted text-[8px] font-black uppercase px-1.5 h-4 border-none"
                              >
                                {col.metadata.unit}
                              </Badge>
                            )}
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
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Raw Metadata Manifest
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-2 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg text-[9px] font-black uppercase px-3"
                  >
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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-6 px-2">
                  Linked Functional Entities
                </h4>
                <div className="grid gap-4">
                  {relationships?.map((rel: any, i: number) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-card border border-border/40 hover:border-emerald-500/30 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center text-muted-foreground group-hover:text-emerald-600 transition-colors">
                          <ExternalLink size={18} />
                        </div>
                        <div>
                          <p className="text-[13px] font-black uppercase text-foreground/80 group-hover:text-emerald-600 transition-colors">
                            {rel.target}
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                            Linked via {rel.source_key} → {rel.target_key}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/5 text-emerald-600 border-none text-[8px] font-black uppercase px-2"
                      >
                        {rel.type}
                      </Badge>
                    </div>
                  ))}
                  {(!relationships || relationships.length === 0) && (
                    <div className="py-24 text-center opacity-20 flex flex-col items-center gap-4">
                      <Info size={48} strokeWidth={1} />
                      <p className="font-black uppercase text-[10px] tracking-[0.3em]">
                        No outbound relationships discovered
                      </p>
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
