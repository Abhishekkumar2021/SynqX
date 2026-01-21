import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Globe,
  Ruler,
  RefreshCw,
  Box,
  Search,
  LayoutGrid,
  List as ListIcon,
  Download,
  Hash,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { motion, AnimatePresence } from 'framer-motion'

interface ProSourceReferenceViewProps {
  connectionId: number
}

export const ProSourceReferenceView: React.FC<ProSourceReferenceViewProps> = ({ connectionId }) => {
  const [activeTab, setActiveTab] = useState('crs')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedCodes, setSelectedIds] = useState<Set<string>>(new Set())

  const {
    data: crsData,
    isLoading: isLoadingCRS,
    refetch: refetchCRS,
  } = useQuery({
    queryKey: ['prosource', 'refs', 'crs', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_crs', { limit: 200 }),
    enabled: activeTab === 'crs',
  })

  const {
    data: unitData,
    isLoading: isLoadingUnits,
    refetch: refetchUnits,
  } = useQuery({
    queryKey: ['prosource', 'refs', 'units', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_units', { limit: 200 }),
    enabled: activeTab === 'units',
  })

  const rawData = useMemo(() => {
    return activeTab === 'crs' ? crsData?.results || crsData : unitData?.results || unitData
  }, [activeTab, crsData, unitData])

  const currentData = useMemo(() => {
    if (!Array.isArray(rawData)) return []
    return rawData.filter((item: any) =>
      Object.values(item).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
    )
  }, [rawData, search])

  const isLoading = activeTab === 'crs' ? isLoadingCRS : isLoadingUnits
  const refetch = activeTab === 'crs' ? refetchCRS : refetchUnits

  const handleDownload = (items: any[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prosource_${activeTab}_export_${Date.now()}.json`
    a.click()
    toast.success(`${items.length} records exported`)
  }

  const toggleSelectAll = () => {
    if (selectedCodes.size === currentData.length && currentData.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(currentData.map((item: any) => item.CODE || item.code)))
    }
  }

  const toggleSelect = (code: string) => {
    const next = new Set(selectedCodes)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setSelectedIds(next)
  }

  return (
    <div className="h-full flex flex-col bg-muted/5 relative overflow-hidden">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20 shadow-inner group">
            <Globe size={24} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              Technical Standards
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-amber-500/10 text-amber-600 border-none text-[9px] font-black uppercase"
              >
                {currentData.length} Records
              </Badge>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">
              Global Geodetic Framework & Measurement Definitions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {selectedCodes.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-1.5 shadow-lg shadow-amber-500/5"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  {selectedCodes.size} Selected
                </span>
                <div className="h-4 w-px bg-amber-500/20 mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest text-amber-600 hover:bg-amber-500/10"
                  onClick={() =>
                    handleDownload(
                      currentData.filter((item: any) => selectedCodes.has(item.CODE || item.code))
                    )
                  }
                >
                  <Download size={14} /> Bulk_Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-amber-600 hover:bg-amber-500/10 p-0 flex items-center justify-center"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v)
              setSelectedIds(new Set())
            }}
            className="w-auto"
          >
            <TabsList className="bg-muted p-1 rounded-xl border border-border/20 shadow-inner">
              <TabsTrigger
                value="crs"
                className="gap-2 text-[9px] font-black uppercase tracking-widest px-4 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all"
              >
                <Globe size={14} /> CRS
              </TabsTrigger>
              <TabsTrigger
                value="units"
                className="gap-2 text-[9px] font-black uppercase tracking-widest px-4 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all"
              >
                <Ruler size={14} /> Units
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative group w-64">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-all group-focus-within:text-amber-500" />
            <Input
              placeholder="Filter standards..."
              className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-amber-500/10 shadow-sm text-[11px] font-bold placeholder:uppercase"
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
                  ? 'bg-background shadow-sm text-amber-600 ring-1 ring-border/40'
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
                  ? 'bg-background shadow-sm text-amber-600 ring-1 ring-border/40'
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
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all shadow-sm bg-background border-border/40"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-amber-500')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="w-full pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-6 opacity-40">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-3xl animate-pulse rounded-full" />
                <RefreshCw className="h-12 w-12 animate-spin text-amber-600 relative z-10" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 animate-pulse">
                Scanning Geodetic Framework...
              </span>
            </div>
          ) : currentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 opacity-20 grayscale gap-6">
              <Box size={80} strokeWidth={1} />
              <p className="font-black uppercase text-[10px] tracking-[0.3em]">
                No standards discovered
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1600px] mx-auto">
              {currentData.map((item: any, i: number) => {
                const code = item.CODE || item.code || item.NAME || item.name
                const isSelected = selectedCodes.has(code)
                return (
                  <div
                    key={i}
                    onClick={() => toggleSelect(code)}
                    className={cn(
                      'p-6 rounded-[2.5rem] bg-card border transition-all duration-500 group flex flex-col gap-5 relative overflow-hidden shadow-sm cursor-pointer hover:shadow-2xl hover:-translate-y-1',
                      isSelected
                        ? 'border-amber-500/40 bg-amber-500/[0.02] shadow-xl shadow-amber-500/5'
                        : 'border-border/40 hover:border-amber-500/20'
                    )}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner',
                          isSelected
                            ? 'bg-amber-500/20 text-amber-600 scale-110'
                            : 'bg-muted/20 text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-600'
                        )}
                      >
                        {activeTab === 'crs' ? (
                          <Globe size={24} strokeWidth={1.5} />
                        ) : (
                          <Ruler size={24} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[8px] font-black h-5 px-2 uppercase tracking-widest border-none transition-colors',
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted/30 text-muted-foreground/60'
                          )}
                        >
                          {item.CODE || item.code || 'REF'}
                        </Badge>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(code)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'h-5 w-5 rounded-lg border-2 transition-all',
                            isSelected
                              ? 'bg-amber-500 border-amber-500'
                              : 'border-border/40 group-hover:border-amber-500/40'
                          )}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1.5 relative z-10 flex-1">
                      <h4
                        className={cn(
                          'text-[13px] font-black uppercase tracking-tight truncate transition-colors',
                          isSelected
                            ? 'text-amber-600'
                            : 'text-foreground group-hover:text-amber-600'
                        )}
                      >
                        {item.NAME || item.name || 'Untitled Standard'}
                      </h4>
                      <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest truncate">
                        {item.DESCRIPTION || item.description || 'Global Reference Object'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/20 border border-border/10 relative z-10">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">
                          Dimension
                        </span>
                        <span className="text-[9px] font-bold text-foreground/70 truncate">
                          {item.DIMENSION_TYPE || item.dimension_type || item.type || 'Standard'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">
                          Authority
                        </span>
                        <span className="text-[9px] font-bold text-foreground/70">
                          {item.AUTHORITY || item.authority || 'EPSG'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10 relative z-10">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload([item])
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-amber-500/10 hover:text-amber-600 transition-all active:scale-90 border border-transparent hover:border-amber-500/20 shadow-sm"
                      >
                        <Download size={16} />
                      </Button>
                      <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Decorative gradient */}
                    <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-amber-500/[0.03] blur-3xl rounded-full group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="w-full">
              <div className="grid grid-cols-12 gap-4 px-10 py-4 border-b bg-muted/50 backdrop-blur-xl sticky top-0 z-20 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shadow-sm">
                <div className="col-span-1 flex items-center gap-4">
                  <Checkbox
                    checked={currentData.length > 0 && selectedCodes.size === currentData.length}
                    onCheckedChange={toggleSelectAll}
                    className="h-4.5 w-4.5 rounded-md"
                  />
                  CODE
                </div>
                <div className="col-span-5 px-4">Identity_Reference</div>
                <div className="col-span-2">Dimension_Type</div>
                <div className="col-span-2 text-center">Source_Authority</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              <div className="divide-y divide-border/5 bg-background/30">
                {currentData.map((item: any, i: number) => {
                  const code = item.CODE || item.code
                  const isSelected = selectedCodes.has(code)
                  return (
                    <div
                      key={i}
                      onClick={() => toggleSelect(code)}
                      className={cn(
                        'grid grid-cols-12 gap-4 px-10 py-5 items-center transition-colors group cursor-pointer border-b border-border/5 hover:bg-amber-500/[0.02]',
                        isSelected && 'bg-amber-500/[0.03]'
                      )}
                    >
                      <div className="col-span-1 flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(code)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4.5 w-4.5 rounded-md border-border/40"
                        />
                        <code className="text-[10px] font-mono font-black text-amber-600/80">
                          {code}
                        </code>
                      </div>
                      <div className="col-span-5 flex items-center gap-4 px-4">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner',
                            isSelected
                              ? 'bg-amber-500/20 text-amber-600'
                              : 'bg-muted/20 text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-600'
                          )}
                        >
                          {activeTab === 'crs' ? <Globe size={18} /> : <Ruler size={18} />}
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span
                            className={cn(
                              'text-[13px] font-black truncate uppercase transition-colors',
                              isSelected
                                ? 'text-amber-600'
                                : 'text-foreground/80 group-hover:text-amber-600'
                            )}
                          >
                            {item.NAME || item.name}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest truncate">
                            {item.DESCRIPTION || item.description}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Badge
                          variant="secondary"
                          className="bg-muted/50 text-foreground/60 border-none text-[8px] font-black uppercase tracking-widest h-5"
                        >
                          {item.DIMENSION_TYPE || item.type || 'Standard'}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-center text-[10px] font-bold text-muted-foreground/60 uppercase">
                        {item.AUTHORITY || item.authority || '---'}
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-amber-500/10 hover:text-amber-600 transition-all shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload([item])
                          }}
                        >
                          <Download size={16} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
