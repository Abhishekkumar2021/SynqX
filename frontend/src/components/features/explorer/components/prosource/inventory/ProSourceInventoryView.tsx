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
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getConnectionMetadata, getAssetDetails } from '@/lib/api'

// Sub-components
import { ResultsGrid } from '../../ResultsGrid'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<any>(assets[0] || null)
  const [activeTab, setActiveTab] = useState<'data' | 'documents'>('data')

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
        // In a real scenario, we'd pass specific entity IDs from selection,
        // but here we might list generally or need a specific ID.
        // For inventory view, listing ALL docs for a table might be heavy.
        // We'll limit or just show empty state until a record is picked?
        // Let's assume we want to show docs for the *sample* records if possible,
        // or just recent docs.
        entity_ids: [], // TODO: wired to selection or recent
      }),
    enabled: !!selectedEntity && activeTab === 'documents',
  })

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

  return (
    <div className="h-full flex overflow-hidden bg-[#020203]">
      {/* Sidebar: Entity Browser */}
      <aside className="w-80 border-r border-white/5 bg-black/20 backdrop-blur-3xl flex flex-col shrink-0">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 px-1">
              Object Discovery
            </h3>
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-indigo-400 transition-colors" />
              <Input
                placeholder="Search entities..."
                className="pl-9 h-10 bg-white/[0.03] border-white/5 rounded-xl text-xs font-medium focus:ring-indigo-500/20 placeholder:text-muted-foreground/30 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] rounded-xl border border-white/5">
            {['All', ...modules].map((module) => (
              <button
                key={module}
                className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all hover:bg-white/[0.05] text-muted-foreground/60 hover:text-white"
              >
                {module}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-3 pb-6 space-y-1 no-scrollbar">
          {filteredEntities.map((entity) => {
            const isActive = selectedEntity?.name === entity.name
            return (
              <button
                key={entity.name}
                onClick={() => setSelectedEntity(entity)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden',
                  isActive
                    ? 'bg-indigo-500/10 text-white shadow-2xl'
                    : 'text-muted-foreground/60 hover:bg-white/[0.03] hover:text-muted-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="entity-glow"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent"
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-500',
                      isActive
                        ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                        : 'bg-white/[0.03] text-current'
                    )}
                  >
                    <Layers size={14} />
                  </div>
                  <div className="text-left">
                    <p
                      className={cn(
                        'text-[11px] font-black uppercase tracking-wider transition-colors',
                        isActive ? 'text-white' : 'text-current'
                      )}
                    >
                      {entity.name}
                    </p>
                    <p className="text-[9px] font-bold opacity-40 uppercase">
                      {entity.metadata?.module || 'Entity'}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="relative z-10"
                  >
                    <ChevronRight size={14} className="text-indigo-400" />
                  </motion.div>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main Content: Data Explorer */}
      <section className="flex-1 flex flex-col relative overflow-hidden bg-black/40">
        <div className="px-8 py-6 border-b border-white/5 bg-black/20 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Box size={20} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white uppercase italic italic-shorthand">
                    {selectedEntity?.name || 'Select Entity'}
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono border-white/10 text-indigo-400 bg-indigo-500/5"
                  >
                    {selectedEntity?.metadata?.table || 'RAW_TABLE'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    {displayRowCount.toLocaleString()} records
                  </p>

                  {/* CRS Info */}
                  {assetDetails?.crs && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider">
                      <Globe size={10} />
                      {assetDetails.crs.NAME || 'WGS84'}
                    </div>
                  )}

                  {/* Unit System Info */}
                  {assetDetails?.unit_system && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 uppercase font-bold tracking-wider">
                      <Ruler size={10} />
                      {assetDetails.unit_system}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl shadow-inner">
                <button
                  onClick={() => setActiveTab('data')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2',
                    activeTab === 'data'
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'text-muted-foreground/60 hover:text-white'
                  )}
                >
                  <Database size={12} /> Data
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2',
                    activeTab === 'documents'
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'text-muted-foreground/60 hover:text-white'
                  )}
                >
                  <FileText size={12} /> Docs
                </button>
              </div>

              <div className="h-8 w-px bg-white/10 mx-2" />

              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl shadow-inner">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    viewMode === 'grid'
                      ? 'bg-white/[0.05] text-white shadow-xl'
                      : 'text-muted-foreground/40 hover:text-white'
                  )}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    viewMode === 'list'
                      ? 'bg-white/[0.05] text-white shadow-xl'
                      : 'text-muted-foreground/40 hover:text-white'
                  )}
                >
                  <ListIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {(isLoadingRecords && activeTab === 'data') ||
            (isLoadingDocs && activeTab === 'documents') ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/60 animate-pulse">
                  Streaming from Seabed...
                </p>
              </motion.div>
            ) : activeTab === 'data' ? (
              <motion.div
                key="data-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full"
              >
                <ResultsGrid
                  results={recordData?.results || []}
                  onSelectRow={(row) => onSelectRecord(row.ID || row.WELL_ID || row.UWI)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="doc-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full p-8"
              >
                {/* Document List View */}
                {!documentData?.documents || documentData.documents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">No associated documents found</p>
                    <p className="text-xs mt-2">Select a record to view specific files</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {/* Render docs here */}
                    {documentData.documents.map((doc: any, i: number) => (
                      <div
                        key={i}
                        className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <FileText size={20} />
                          </div>
                          <Badge variant="outline" className="text-[10px] border-white/10">
                            {doc.document_format}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-white truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {doc.document_type}
                        </p>
                        <p className="text-[9px] text-muted-foreground/50 mt-4 uppercase">
                          {new Date(doc.update_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
