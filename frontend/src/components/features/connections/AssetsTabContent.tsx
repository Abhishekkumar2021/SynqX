 
import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RefreshCw,
  Search,
  Download,
  Plus,
  Sparkles,
  Database,
  LayoutGrid,
  List,
  Folder,
  CheckCircle2,
  Grid3X3,
  ArrowRightLeft,
  AlertTriangle,
  XCircle,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { CreateAssetsDialog } from '@/components/features/connections/CreateAssetsDialog'
import { Checkbox } from '@/components/ui/checkbox'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { bulkCreateAssets, type Asset } from '@/lib/api'
import { CONNECTOR_META } from '@/lib/connector-definitions'
import { AssetTableRow } from '@/components/features/connections/AssetTableRow'
import { AssetGridItem } from '@/components/features/connections/AssetGridItem'
import { AssetFileExplorer } from '@/components/features/connections/AssetFileExplorer'
import { DiscoveredAssetCard } from '@/components/features/connections/DiscoveredAssetCard'
import { Skeleton } from '@/components/ui/skeleton'
import { DomainBrowser } from '@/components/features/connections/domain/DomainBrowser'
import { DOMAIN_CONFIGS } from '@/lib/domain-definitions'

export const AssetsTabContent = ({
  connectionId,
  connectionName,
  connectorType,
  assets = [],
  discoveredAssets = [],
  isLoading,
  onDiscover,
  setDiscoveredAssets,
}: {
  connectionId: number
  connectionName: string
  connectorType: any
  assets: Asset[] | undefined
  discoveredAssets: any[]
  isLoading: boolean
  onDiscover: () => void
  setDiscoveredAssets: (assets: any[]) => void
}) => {
  // --- Generic Assets View Hooks ---
  const [activeView, setActiveView] = useState<'managed' | 'discovery'>(
    assets && assets.length > 0 ? 'managed' : 'discovery'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDiscovered, setSelectedDiscovered] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'explorer' | 'domain'>('list')

  const queryClient = useQueryClient()

  const isFileBased = useMemo(() => {
    const type = String(connectorType).toLowerCase()
    return CONNECTOR_META[type]?.category === 'File'
  }, [connectorType])

  const normalizedType = String(connectorType).toLowerCase()
  const isDomainAware = useMemo(() => {
    return !!DOMAIN_CONFIGS[normalizedType]
  }, [normalizedType])

  const filteredAssets = useMemo(() => {
    if (!assets) return []
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.fully_qualified_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.asset_type?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [assets, searchQuery])

  const filteredDiscovered = useMemo(() => {
    return discoveredAssets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.fully_qualified_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.type || asset.asset_type)?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [discoveredAssets, searchQuery])

  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {}
    filteredAssets.forEach((asset) => {
      const type = asset.asset_type || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(asset)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filteredAssets])

  const groupedDiscovered = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filteredDiscovered.forEach((asset) => {
      const type = asset.type || asset.asset_type || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(asset)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filteredDiscovered])

  const bulkImportMutation = useMutation({
    mutationFn: async ({
      assetNames,
      mode,
    }: {
      assetNames: string[]
      mode: 'source' | 'destination' | 'both'
    }) => {
      const assetsToCreate = assetNames.map((name) => {
        const discovered = discoveredAssets.find((a) => a.name === name)
        return {
          name,
          fully_qualified_name: discovered?.fully_qualified_name || name,
          asset_type: discovered?.type || discovered?.asset_type || 'table',
          is_source: mode === 'source' || mode === 'both',
          is_destination: mode === 'destination' || mode === 'both',
          schema_metadata: discovered?.schema_metadata,
          connection_id: connectionId,
        }
      })
      return bulkCreateAssets(connectionId, { assets: assetsToCreate })
    },
    onSuccess: (data) => {
      const totalSuccess = data.successful_creates
      if (totalSuccess === data.total_requested) {
        toast.success('Bulk Import Complete', {
          description: `${data.successful_creates} assets created.`,
        })
      } else if (totalSuccess > 0) {
        toast.warning('Partial Import Success', {
          description: `${totalSuccess} assets processed (${data.successful_creates} new), ${data.failed_creates} failed.`,
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        })
      } else {
        toast.error('Import Failed', {
          description: 'No assets could be imported or updated.',
          icon: <XCircle className="h-4 w-4 text-destructive" />,
        })
      }

      if (totalSuccess > 0) {
        queryClient.invalidateQueries({ queryKey: ['assets', connectionId] })
        const successfulNames = new Set(
          [...selectedDiscovered].filter(
            (name) => !data.failures.some((f: { name: string; reason: string }) => f.name === name)
          )
        )
        setDiscoveredAssets(discoveredAssets.filter((a) => !successfulNames.has(a.name)))
        setSelectedDiscovered(new Set())
        setActiveView('managed')
      }
    },
    onError: (err: any) => {
      toast.error('Bulk Import Failed', {
        description: err.response?.data?.detail?.message || 'An unexpected error occurred.',
        icon: <ShieldAlert className="h-4 w-4 text-destructive" />,
      })
    },
  })

  const handleSelectDiscovered = (name: string, checked: boolean) => {
    setSelectedDiscovered((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(name)
      } else {
        newSet.delete(name)
      }
      return newSet
    })
  }

  const handleSelectAllDiscovered = (checked: boolean) => {
    if (checked) {
      setSelectedDiscovered(new Set(filteredDiscovered.map((a) => a.name)))
    } else {
      setSelectedDiscovered(new Set())
    }
  }

  // --- Internal Domain View Dispatcher ---
  if (isDomainAware) {
    return (
      <DomainBrowser
        connectionId={connectionId}
        connectionName={connectionName}
        connectorType={normalizedType}
        assets={discoveredAssets}
        registeredAssets={assets}
        isLoading={isLoading}
        onDiscover={onDiscover}
      />
    )
  }

  // --- Generic Assets View ---
  return (
    <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
      <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <div className="flex bg-muted/30 p-1 rounded-xl border border-border/20">
            <button
              onClick={() => setActiveView('managed')}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                activeView === 'managed'
                  ? 'bg-background text-primary shadow-sm shadow-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckCircle2 size={12} /> Registry ({assets?.length || 0})
            </button>
            <button
              onClick={() => setActiveView('discovery')}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                activeView === 'discovery'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles size={12} /> Discovery ({discoveredAssets.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-56 group">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
            <Input
              placeholder={`Filter ${activeView === 'managed' ? 'registry' : 'discovery'}...`}
              className="pl-8 h-8 rounded-lg bg-background/50 border-border/40 focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/5 transition-all shadow-none text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-md transition-all',
                  viewMode === 'list'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-md transition-all',
                  viewMode === 'grid'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              {isDomainAware && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 rounded-md transition-all',
                    viewMode === 'domain'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setViewMode('domain')}
                  title="Grouped Domain View"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
              )}
              {isFileBased && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 rounded-md transition-all',
                    viewMode === 'explorer'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setViewMode('explorer')}
                  title="File Explorer View"
                >
                  <Folder className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {activeView === 'discovery' ? (
              <>
                <AnimatePresence>
                  {selectedDiscovered.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20 border-none gap-1.5 text-[10px] font-bold"
                            disabled={bulkImportMutation.isPending}
                          >
                            {bulkImportMutation.isPending ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            Register {selectedDiscovered.size}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rounded-xl border-border/60 shadow-xl p-1"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              bulkImportMutation.mutate({
                                assetNames: Array.from(selectedDiscovered),
                                mode: 'source',
                              })
                            }
                            className="rounded-lg text-xs font-medium py-2 gap-2"
                          >
                            <Database className="h-3.5 w-3.5 text-primary" /> Import as Source(s)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              bulkImportMutation.mutate({
                                assetNames: Array.from(selectedDiscovered),
                                mode: 'destination',
                              })
                            }
                            className="rounded-lg text-xs font-medium py-2 gap-2"
                          >
                            <Download className="h-3.5 w-3.5 text-emerald-500" /> Import as
                            Destination(s)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              bulkImportMutation.mutate({
                                assetNames: Array.from(selectedDiscovered),
                                mode: 'both',
                              })
                            }
                            className="rounded-lg text-xs font-medium py-2 gap-2"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Import as Both
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  onClick={onDiscover}
                  size="icon"
                  variant="outline"
                  className="rounded-lg border-border/40 bg-background/50 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all h-8 w-8 shrink-0 shadow-none"
                  disabled={isLoading}
                  title="Discover new assets"
                >
                  <RefreshCw
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground',
                      isLoading && 'animate-spin text-primary'
                    )}
                  />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="rounded-lg shadow-sm h-8 px-3 gap-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Asset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <CreateAssetsDialog
        connectionId={connectionId}
        connectorType={connectorType}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
        <AnimatePresence mode="wait">
          {activeView === 'discovery' ? (
            <motion.div
              key="discovery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {filteredDiscovered.length > 0 ? (
                <>
                  {viewMode === 'explorer' && isFileBased ? (
                    <div className="h-[500px] border-b border-border/20">
                      <AssetFileExplorer
                        assets={filteredDiscovered}
                        selectedAssets={selectedDiscovered}
                        onToggleAsset={handleSelectDiscovered}
                        onToggleAll={handleSelectAllDiscovered}
                      />
                    </div>
                  ) : viewMode === 'list' ? (
                    <Table wrapperClassName="rounded-none border-none shadow-none">
                      <TableHeader className="bg-muted/30 border-b border-border/40 sticky top-0 z-10 backdrop-blur-md">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="w-12 px-4">
                            <Checkbox
                              checked={
                                selectedDiscovered.size > 0 &&
                                selectedDiscovered.size === filteredDiscovered.length
                              }
                              onCheckedChange={(checked) =>
                                handleSelectAllDiscovered(Boolean(checked))
                              }
                              className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            Asset Name
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70 text-right px-4">
                            Type
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDiscovered.map((asset, idx) => (
                          <TableRow
                            key={idx}
                            className={cn(
                              'hover:bg-amber-500/5 transition-colors border-b border-amber-500/10 group',
                              selectedDiscovered.has(asset.name) && 'bg-amber-500/5'
                            )}
                          >
                            <TableCell className="px-4 py-2.5">
                              <Checkbox
                                checked={selectedDiscovered.has(asset.name)}
                                onCheckedChange={(checked) =>
                                  handleSelectDiscovered(asset.name, Boolean(checked))
                                }
                                className="border-amber-500/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-foreground/80 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
                                  {asset.name}
                                </span>
                                {asset.fully_qualified_name &&
                                  asset.fully_qualified_name !== asset.name && (
                                    <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[300px]">
                                      {asset.fully_qualified_name}
                                    </span>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className="capitalize text-[9px] font-bold tracking-widest bg-muted/50 border-amber-500/20 text-muted-foreground"
                              >
                                {asset.type || asset.asset_type}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                      {filteredDiscovered.map((asset, idx) => (
                        <DiscoveredAssetCard
                          key={idx}
                          asset={asset}
                          selected={selectedDiscovered.has(asset.name)}
                          onSelect={(checked) => handleSelectDiscovered(asset.name, checked)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 space-y-10">
                      {groupedDiscovered.map(([type, items]) => (
                        <div key={type} className="space-y-4">
                          <div className="flex items-center gap-3 px-1">
                            <Badge className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                              {type}s
                            </Badge>
                            <div className="h-px flex-1 bg-amber-500/20" />
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {items.length} Potential Assets
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((asset, idx) => (
                              <DiscoveredAssetCard
                                key={idx}
                                asset={asset}
                                selected={selectedDiscovered.has(asset.name)}
                                onSelect={(checked) => handleSelectDiscovered(asset.name, checked)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="p-10 rounded-[3rem] bg-amber-500/5 ring-1 ring-amber-500/10 shadow-2xl relative group mb-8">
                    <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full animate-pulse group-hover:bg-amber-500/20 transition-all" />
                    <Sparkles className="h-20 w-20 text-amber-500/40 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">
                    Discover Potential Assets
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed opacity-80 max-w-sm mt-2">
                    Scan your connection to identify tables, files, or endpoints that can be managed
                    as Synqx assets.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDiscover}
                    disabled={isLoading}
                    className="mt-8 rounded-xl border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 font-bold gap-2 px-6"
                  >
                    <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                    {isLoading ? 'Scanning Connection...' : 'Start Discovery Scan'}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="managed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {isLoading && !assets ? (
                <div className="divide-y divide-border/20">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between items-center py-4 px-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredAssets.length > 0 ? (
                viewMode === 'explorer' && isFileBased ? (
                  <div className="h-[500px]">
                    <AssetFileExplorer assets={filteredAssets} readOnly={true} />
                  </div>
                ) : viewMode === 'list' ? (
                  <Table wrapperClassName="rounded-none border-none shadow-none">
                    <TableHeader className="bg-muted/20 border-b border-border/40 sticky top-0 z-10 backdrop-blur-md">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="px-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Asset
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Type
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Schema
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Volume
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Size
                        </TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Last Update
                        </TableHead>
                        <TableHead className="text-right px-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                      {filteredAssets.map((asset) => (
                        <AssetTableRow key={asset.id} asset={asset} connectionId={connectionId} />
                      ))}
                    </TableBody>
                  </Table>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {filteredAssets.map((asset) => (
                      <AssetGridItem key={asset.id} asset={asset} connectionId={connectionId} />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 space-y-10">
                    {groupedAssets.map(([type, items]) => (
                      <div key={type} className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                          <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                            {type}s
                          </Badge>
                          <div className="h-px flex-1 bg-border/40" />
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {items.length} Assets
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((asset) => (
                            <AssetGridItem
                              key={asset.id}
                              asset={asset}
                              connectionId={connectionId}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mb-6"
                  >
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                    <div className="relative h-24 w-24 glass-card rounded-[2rem] border-border/40 flex items-center justify-center shadow-xl">
                      {searchQuery ? (
                        <Search className="h-10 w-10 text-muted-foreground/30" />
                      ) : (
                        <Database className="h-10 w-10 text-muted-foreground/30" />
                      )}
                    </div>
                  </motion.div>
                  <h3 className="font-bold text-xl text-foreground">
                    {searchQuery ? 'No matching assets found' : 'No managed assets yet'}
                  </h3>
                  <p className="text-sm mt-2 max-w-sm leading-relaxed text-muted-foreground font-medium">
                    {searchQuery
                      ? `We couldn't find any assets matching "${searchQuery}". Try a broader term.`
                      : "You haven't added any assets to this connection yet. Register discovered items or add them manually."}
                  </p>
                  {!searchQuery && (
                    <div className="flex gap-3 mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-6 gap-2 font-bold"
                        onClick={() => setActiveView('discovery')}
                      >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        View Discovery
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl px-6 gap-2 font-bold shadow-lg shadow-primary/20"
                        onClick={() => setIsCreateOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Manually
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
