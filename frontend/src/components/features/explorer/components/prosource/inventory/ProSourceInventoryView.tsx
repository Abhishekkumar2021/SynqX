import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Database,
  Filter,
  ArrowRight,
  ChevronRight,
  Zap,
  Box,
  FileText,
  Globe,
  Ruler,
  Star,
  MoreVertical,
  Download,
  Terminal,
  Table as TableIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getConnectionMetadata, getAssetDetails } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

// Sub-components
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'
import { ProSourceRecordInspector } from '../ProSourceRecordInspector'

interface ProSourceInventoryViewProps {
  connectionId: number
  assets: any[]
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onSelectRecord: (id: string) => void
}

export const ProSourceInventoryView: React.FC<ProSourceInventoryViewProps> = ({
  connectionId,
  assets,
  viewMode,
  onViewModeChange,
  onSelectRecord,
}) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<any>(assets[0] || null)
  const [activeTab, setActiveTab] = useState<'data' | 'documents'>('data')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  // 1. Fetch live details (CRS, Units, Exact Count)
  const { data: assetDetails } = useQuery({
    queryKey: ['prosource', 'asset-details', connectionId, selectedEntity?.name],
    queryFn: () => getAssetDetails(connectionId, selectedEntity?.name),
    enabled: !!selectedEntity,
  })

  // 2. Fetch sample data
  const { data: recordData, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['prosource', 'records', connectionId, selectedEntity?.name],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'execute_query', {
        query: `SELECT * FROM ${selectedEntity?.metadata?.table || selectedEntity?.name} FETCH FIRST 100 ROWS ONLY`,
      }),
    enabled: !!selectedEntity && activeTab === 'data',
  })

  // 3. Fetch documents (if tab active)
  const { data: documentData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['prosource', 'documents', connectionId, selectedEntity?.name],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'list_documents', {
        entity_table: selectedEntity?.metadata?.table || selectedEntity?.name,
        entity_ids: [],
      }),
    enabled: !!selectedEntity && activeTab === 'documents',
  })

  const toggleFavorite = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(favorites)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setFavorites(next)
  }

  const filteredEntities = useMemo(() => {
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.metadata?.module?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [assets, searchQuery])

  const modules = Array.from(new Set(assets.map((a) => a.metadata?.module || 'Other')))

  // Use live count if available, else estimated
  const displayRowCount = assetDetails?.rows ?? selectedEntity?.rows ?? 0

  const handleOpenSQL = () => {
    // Navigate to SQL Explorer with pre-filled query
    // Note: Assuming we can pass query via state or URL param in the future.
    // For now just navigation.
    navigate(`/explorer/sql/${connectionId}`)
  }

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* Sidebar: Entity Browser */}
      <aside className="w-80 border-r border-border/40 bg-muted/10 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-4 space-y-4 border-b border-border/40">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 px-1">
              Seabed Inventory
            </h3>
            <div className="relative group">
              <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search entities..."
                className="pl-9 h-9 bg-background/50 border-border/40 rounded-xl text-xs font-medium focus:ring-primary/10 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex items-center gap-1.5">
              {['All', ...modules].map((module) => (
                <Badge
                  key={module}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-[9px] font-bold uppercase tracking-wider border-border/40 bg-background/50"
                >
                  {module}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {filteredEntities.map((entity) => {
              const isActive = selectedEntity?.name === entity.name
              const isFav = favorites.has(entity.name)
              return (
                <button
                  key={entity.name}
                  onClick={() => setSelectedEntity(entity)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group relative',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  <div className="relative z-10 flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                        isActive
                          ? 'bg-background text-primary shadow-sm'
                          : 'bg-muted/30 text-muted-foreground/50'
                      )}
                    >
                      <TableIcon size={14} />
                    </div>
                    <div className="text-left min-w-0">
                      <p
                        className={cn(
                          'text-[11px] font-bold truncate transition-colors leading-tight',
                          isActive ? 'text-primary' : 'text-foreground/80'
                        )}
                      >
                        {entity.name}
                      </p>
                      <p className="text-[9px] font-medium opacity-50 uppercase tracking-wide truncate">
                        {entity.metadata?.module || 'Entity'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div 
                        role="button"
                        onClick={(e) => toggleFavorite(entity.name, e)}
                        className={cn("p-1 rounded-md hover:bg-background/80 transition-colors", isFav && "opacity-100 text-amber-400")}
                     >
                        <Star size={12} fill={isFav ? "currentColor" : "none"} />
                     </div>
                  </div>
                  
                  {isActive && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <section className="flex-1 flex flex-col relative overflow-hidden bg-background/50">
        <div className="px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/5">
                <Box size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tight truncate">
                    {selectedEntity?.name || 'Select Entity'}
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono border-primary/20 text-primary bg-primary/5"
                  >
                    {selectedEntity?.metadata?.table || 'RAW_TABLE'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1.5 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-2 py-0.5 rounded-md">
                    <Database size={10} className="text-muted-foreground/60" />
                    {displayRowCount.toLocaleString()} rows
                  </div>

                  {assetDetails?.crs && (
                    <>
                      <div className="w-px h-3 bg-border/60" />
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
                        <Globe size={10} />
                        {assetDetails.crs.NAME || assetDetails.crs.name || 'WGS84'}
                      </div>
                    </>
                  )}

                  {assetDetails?.unit_system && (
                    <>
                      <div className="w-px h-3 bg-border/60" />
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">
                        <Ruler size={10} />
                        {assetDetails.unit_system}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 gap-2 text-xs font-bold border-border/40 hover:bg-muted/50"
                        onClick={handleOpenSQL}
                    >
                      <Terminal size={14} className="text-muted-foreground" />
                      SQL Editor
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Query this entity in SQL Lab</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="h-6 w-px bg-border/40 mx-1" />

              <div className="flex p-1 bg-muted/20 rounded-xl border border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('data')}
                  className={cn(
                    "h-7 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    activeTab === 'data' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Data
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('documents')}
                  className={cn(
                    "h-7 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    activeTab === 'documents' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Docs
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative p-1">
          <AnimatePresence mode="wait">
            {(isLoadingRecords && activeTab === 'data') ||
            (isLoadingDocs && activeTab === 'documents') ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-6"
              >
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative bg-background p-4 rounded-2xl border border-border/40 shadow-xl">
                        <Zap className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80">
                    Retrieving Metadata
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                    Fetching records from ProSource...
                    </p>
                </div>
              </motion.div>
            ) : activeTab === 'data' ? (
              <motion.div
                key="data-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full rounded-xl overflow-hidden border border-border/20 shadow-inner bg-card/20"
              >
                <ResultsGrid
                  data={recordData}
                  isLoading={isLoadingRecords}
                  noBorder
                  noBackground
                  onSelectRows={(indices) => {
                     // Get the first selected row (assuming single selection for inspector for now)
                     const index = Array.from(indices)[0]
                     if (index !== undefined && recordData?.results?.[index]) {
                        setSelectedRecord(recordData.results[index])
                     }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="doc-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full p-6 overflow-y-auto custom-scrollbar"
              >
                {!documentData?.documents || documentData.documents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
                    <div className="p-6 rounded-3xl bg-muted/30 border border-dashed border-border/60">
                        <FileText size={40} className="opacity-50" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-foreground/70">No Documents Found</p>
                        <p className="text-xs mt-1">This entity has no associated files.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {documentData.documents.map((doc: any, i: number) => (
                      <div
                        key={i}
                        className="group relative p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        <div className="flex items-start justify-between mb-3 relative z-10">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                            <FileText size={18} />
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-bold h-5 px-2 bg-muted/50">
                            {doc.document_format || 'FILE'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 relative z-10">
                            <h4 className="text-sm font-bold text-foreground truncate leading-tight" title={doc.name}>
                            {doc.name}
                            </h4>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            {doc.document_type || 'Unknown Type'}
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground font-medium relative z-10">
                            <span>{new Date(doc.update_date).toLocaleDateString()}</span>
                            <Download size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {selectedRecord && (
          <ProSourceRecordInspector
            connectionId={connectionId}
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}