import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Globe, Ruler, RefreshCw, Box, Search, LayoutGrid, List as ListIcon, Download, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProSourceReferenceViewProps {
  connectionId: number
}

export const ProSourceReferenceView: React.FC<ProSourceReferenceViewProps> = ({ connectionId }) => {
  const [activeTab, setActiveTab] = useState('crs')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: crsData, isLoading: isLoadingCRS, refetch: refetchCRS } = useQuery({
    queryKey: ['prosource', 'refs', 'crs', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_crs', { limit: 200 }),
    enabled: activeTab === 'crs',
  })

  const { data: unitData, isLoading: isLoadingUnits, refetch: refetchUnits } = useQuery({
    queryKey: ['prosource', 'refs', 'units', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_units', { limit: 200 }),
    enabled: activeTab === 'units',
  })

  const currentData = useMemo(() => {
    const data = activeTab === 'crs' ? (crsData?.results || crsData) : (unitData?.results || unitData)
    if (!Array.isArray(data)) return []
    return data.filter((item: any) => 
        Object.values(item).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
    )
  }, [activeTab, crsData, unitData, search])

  const isLoading = activeTab === 'crs' ? isLoadingCRS : isLoadingUnits
  const refetch = activeTab === 'crs' ? refetchCRS : refetchUnits

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20 shadow-inner group">
                <Globe size={24} className="group-hover:rotate-12 transition-transform" />
            </div>
            <div>
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    Geodetic & Measurement Standards
                    <Badge variant="secondary" className="h-5 px-2 bg-amber-500/10 text-amber-600 border-none text-[9px] font-black uppercase">
                        {currentData.length} Records
                    </Badge>
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">Global Spatial Reference Systems & Unit Definitions</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="bg-muted p-1 rounded-xl border border-border/20 shadow-inner">
                    <TabsTrigger value="crs" className="gap-2 text-[9px] font-black uppercase tracking-widest px-4 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all">
                        <Globe size={14} /> CRS
                    </TabsTrigger>
                    <TabsTrigger value="units" className="gap-2 text-[9px] font-black uppercase tracking-widest px-4 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all">
                        <Ruler size={14} /> Units
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="relative group w-64">
                <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-all group-focus-within:text-amber-500" />
                <Input 
                    placeholder="Search standards..." 
                    className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-amber-500/10 shadow-sm text-[11px] font-bold placeholder:uppercase"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="flex bg-muted p-1 rounded-xl border border-border/20 shadow-inner">
                <Button variant="ghost" size="sm" className={cn("h-8 px-3 gap-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-amber-600 ring-1 ring-border/40" : "text-muted-foreground")} onClick={() => setViewMode('grid')}>
                    <LayoutGrid size={14} /> Grid
                </Button>
                <Button variant="ghost" size="sm" className={cn("h-8 px-3 gap-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-background shadow-sm text-amber-600 ring-1 ring-border/40" : "text-muted-foreground")} onClick={() => setViewMode('list')}>
                    <ListIcon size={14} /> List
                </Button>
            </div>

            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw size={18} className={cn(isLoading && "animate-spin text-amber-500")} />
            </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-[1600px] mx-auto w-full pb-32">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-6 opacity-40">
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-500/20 blur-3xl animate-pulse rounded-full" />
                        <RefreshCw className="h-12 w-12 animate-spin text-amber-600 relative z-10" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 animate-pulse">Scanning Geodetic Framework...</span>
                </div>
            ) : currentData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-48 opacity-20 grayscale">
                    <Box size={80} strokeWidth={1} />
                    <p className="mt-6 font-black uppercase text-[10px] tracking-[0.3em]">No standards found</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentData.map((item: any, i: number) => (
                        <div key={i} className="p-6 rounded-[2.5rem] bg-card border border-border/40 hover:border-amber-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col gap-5 relative overflow-hidden shadow-sm">
                            <div className="flex items-start justify-between relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center group-hover:bg-amber-500/10 transition-colors shadow-inner text-muted-foreground group-hover:text-amber-600">
                                    {activeTab === 'crs' ? <Globe size={24} /> : <Ruler size={24} />}
                                </div>
                                <Badge variant="outline" className="text-[8px] font-black h-5 px-2 bg-muted/30 border-none uppercase tracking-widest">
                                    {item.CODE || item.code || 'REF'}
                                </Badge>
                            </div>
                            
                            <div className="min-w-0 space-y-1 relative z-10">
                                <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight truncate group-hover:text-amber-600 transition-colors">
                                    {item.NAME || item.name || 'Untitled Standard'}
                                </h4>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate opacity-60">
                                    {item.DESCRIPTION || item.description || 'Global Reference Object'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/20 border border-border/10">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[7px] font-black uppercase text-muted-foreground/40">Type</span>
                                    <span className="text-[9px] font-bold text-foreground/70 truncate">{item.DIMENSION_TYPE || item.type || 'Standard'}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[7px] font-black uppercase text-muted-foreground/40">Authority</span>
                                    <span className="text-[9px] font-bold text-foreground/70">{item.AUTHORITY || 'EPSG'}</span>
                                </div>
                            </div>

                            {activeTab === 'crs' && item.OPENGIS_WELL_KNOWN_TEXT && (
                                <div className="p-3 rounded-xl bg-black/40 border border-border/5 relative z-10">
                                    <span className="text-[7px] font-black uppercase text-amber-500/60 block mb-1">WKT Payload</span>
                                    <p className="text-[8px] font-mono text-muted-foreground line-clamp-3 leading-relaxed break-all opacity-40">
                                        {item.OPENGIS_WELL_KNOWN_TEXT}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10 relative z-10">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-amber-500/10 hover:text-amber-600 transition-all active:scale-90 border border-transparent hover:border-amber-500/20">
                                    <Download size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted active:scale-90 border border-transparent">
                                    <Hash size={16} />
                                </Button>
                            </div>

                            {/* Decorative gradient */}
                            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-amber-500/5 blur-3xl rounded-full group-hover:bg-amber-500/10 transition-colors" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-xl backdrop-blur-sm">
                    <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        <div className="col-span-2">Standard_Code</div>
                        <div className="col-span-5">Identity_Reference</div>
                        <div className="col-span-2">Dimension_Type</div>
                        <div className="col-span-2 text-center">Source_Authority</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>
                    <div className="divide-y divide-border/10">
                        {currentData.map((item: any, i: number) => (
                            <div key={i} className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-amber-500/[0.02] transition-colors group">
                                <div className="col-span-2">
                                    <code className="text-[10px] font-mono font-black text-amber-600 bg-amber-500/5 px-2 py-1 rounded-md">{item.CODE || item.code}</code>
                                </div>
                                <div className="col-span-5 flex items-center gap-4">
                                    <div className="h-9 w-9 rounded-xl bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/10 transition-colors shadow-inner">
                                        {activeTab === 'crs' ? <Globe size={16} /> : <Ruler size={16} />}
                                    </div>
                                    <div className="min-w-0 flex flex-col gap-0.5">
                                        <span className="text-[13px] font-black truncate text-foreground/80 uppercase group-hover:text-amber-600 transition-colors">{item.NAME || item.name}</span>
                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest truncate">{item.DESCRIPTION}</span>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <Badge variant="secondary" className="bg-muted/50 text-foreground/60 border-none text-[8px] font-black uppercase tracking-widest h-5">{item.DIMENSION_TYPE || 'Standard'}</Badge>
                                </div>
                                <div className="col-span-2 text-center text-[10px] font-bold text-muted-foreground/60 uppercase">
                                    {item.AUTHORITY || '---'}
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-amber-500/10 hover:text-amber-600 transition-all"><Download size={16} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </ScrollArea>
    </div>
  )
}
