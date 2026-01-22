import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity,
  Waves,
  Map as MapIcon,
  Globe,
  Calendar,
  Database,
  Search,
  MoreVertical,
  FileDigit,
  Grid3X3,
  Layers,
  Box,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { MeshFooter } from './mesh/MeshFooter'
import { OSDUDiscoveryList, type Column } from './shared/OSDUDiscoveryList'
import { SpatialMap } from '@/components/common/SpatialMap'
import { extractOSDUSpatialData } from '@/lib/osdu-spatial'

interface OSDUSeismicViewProps {
  data: {
    projects: any[]
    projects_total?: number
    traces: any[]
    traces_total?: number
    bingrids: any[]
    bingrids_total?: number
    interpretations: any[]
    interpretations_total?: number
  }
  onInspect: (id: string) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
  limit: number
  isLoading?: boolean
}

export const OSDUSeismicView: React.FC<OSDUSeismicViewProps> = ({
  data,
  onInspect,
  pageOffset,
  onOffsetChange,
  limit,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState('projects')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')

  // 1. Initialize ALL Fuzzy Search Hooks
  const filteredProjects = useFuzzySearch(data.projects || [], search, {
    keys: ['id', 'kind', 'data.ProjectName'],
    threshold: 0.3,
  })

  const filteredTraces = useFuzzySearch(data.traces || [], search, {
    keys: ['id', 'kind', 'data.Name'],
    threshold: 0.3,
  })

  const filteredBingrids = useFuzzySearch(data.bingrids || [], search, {
    keys: ['id', 'kind', 'data.BinGridName'],
    threshold: 0.3,
  })

  const filteredInterpretations = useFuzzySearch(data.interpretations || [], search, {
    keys: ['id', 'kind', 'data.Name'],
    threshold: 0.3,
  })

  // 2. Derive results based on active tab
  const currentResults = useMemo(() => {
    if (activeTab === 'projects') return filteredProjects
    if (activeTab === 'traces') return filteredTraces
    if (activeTab === 'bingrids') return filteredBingrids
    if (activeTab === 'interpretations') return filteredInterpretations
    return []
  }, [activeTab, filteredProjects, filteredTraces, filteredBingrids, filteredInterpretations])

  const mapGeoJSON = useMemo(() => {
    if (viewMode !== 'map') return null
    const features = currentResults
      .map((item) => extractOSDUSpatialData(item)?.geoJSON?.features || [])
      .flat()

    return features.length > 0 ? { type: 'FeatureCollection', features } : null
  }, [currentResults, viewMode])

  const stats = useMemo(() => {
    return {
      projects: data.projects_total || data.projects?.length || 0,
      traces: data.traces_total || data.traces?.length || 0,
      bingrids: data.bingrids_total || data.bingrids?.length || 0,
      interpretations: data.interpretations_total || data.interpretations?.length || 0,
    }
  }, [data])

  const currentTabTotalCount = useMemo(() => {
    if (activeTab === 'projects') return data.projects_total || 0
    if (activeTab === 'traces') return data.traces_total || 0
    if (activeTab === 'bingrids') return data.bingrids_total || 0
    if (activeTab === 'interpretations') return data.interpretations_total || 0
    return 0
  }, [activeTab, data])

  const renderCard = (item: any, type: string) => {
    const name = item.data?.Name || item.data?.ProjectName || item.data?.BinGridName || item.id.split(':').pop()
    const id = item.id.split(':').pop()
    const source = item.kind.split(':')[1] || 'OSDU'

    let Icon = Waves
    let badge = 'PROJECT'
    let colorClass = 'text-orange-500'
    let bgClass = 'bg-orange-500/10'
    let borderClass = 'border-orange-500/20'

    if (type === 'traces') { Icon = FileDigit; badge = 'SEGY_TRACE'; colorClass = 'text-blue-500'; bgClass = 'bg-blue-500/10'; borderClass = 'border-blue-500/20'; }
    else if (type === 'bingrids') { Icon = Grid3X3; badge = 'BIN_GRID'; colorClass = 'text-emerald-500'; bgClass = 'bg-emerald-500/10'; borderClass = 'border-emerald-500/20'; }
    else if (type === 'interpretations') { Icon = Layers; badge = 'INTERP_SET'; colorClass = 'text-purple-500'; bgClass = 'bg-purple-500/10'; borderClass = 'border-purple-500/20'; }

    return (
      <div key={item.id} className="metric-card p-6 flex flex-col gap-6 group">
        <div className="flex items-start justify-between">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center border shadow-md', bgClass, borderClass, colorClass)}>
            <Icon size={22} />
          </div>
          <Badge className={cn('text-[8px] font-black uppercase px-1.5 h-4', type === 'traces' ? 'bg-blue-500' : type === 'bingrids' ? 'bg-emerald-500' : type === 'interpretations' ? 'bg-purple-500' : 'bg-orange-500')}>
            {badge}
          </Badge>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg tracking-tight uppercase truncate">{name}</h3>
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase flex items-center gap-1.5"><Globe size={10} /> {item.data?.OperatorID?.split(':').pop() || 'Internal'}</span>
        </div>
        <div className="flex items-center gap-2.5 mt-auto">
          <Button onClick={() => onInspect(item.id)} className="flex-1 rounded-xl h-10 gap-2 font-black uppercase text-[11px] bg-primary/90">
            <Search size={14} /> Inspect
          </Button>
        </div>
      </div>
    )
  }

  const commonColumns: Column<any>[] = [
    { header: 'Operator', accessor: (item) => <div className="flex items-center gap-2"><Globe size={12} className="opacity-40" /><span>{item.data?.OperatorID?.split(':').pop() || 'Internal'}</span></div>, width: 'w-1/4' },
    { header: 'Source', accessor: (item) => <Badge variant="outline" className="text-[9px] font-black uppercase">{item.kind?.split(':')[1] || 'OSDU'}</Badge>, width: 'w-32' },
    { header: 'Registered', accessor: (item) => <div className="flex items-center gap-2 opacity-60"><Calendar size={12} /><span>{item.createTime ? new Date(item.createTime).toLocaleDateString() : 'N/A'}</span></div>, width: 'w-40' },
  ]

  const getItemDisplayName = (item: any) => item.data?.Name || item.data?.ProjectName || item.data?.BinGridName || item.id.split(':').pop() || ''
  const getItemId = (item: any) => item.id.split(':').pop() || ''

  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader icon={Waves} title="Seismic Discovery" subtitle="Seismic Domain Overview" iconColor="text-orange-500" search={search} onSearchChange={setSearch} totalCount={stats.projects + stats.traces + stats.bingrids + stats.interpretations} viewMode={viewMode} onViewModeChange={setViewMode} onRefresh={() => onOffsetChange(0)} />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 w-full">
          <div className="p-6 space-y-8 max-w-[1600px] mx-auto pb-32 overflow-x-hidden">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); onOffsetChange(0); }} className="space-y-6">
              <TabsList className="bg-muted/50 p-1 rounded-2xl border h-auto inline-flex">
                <TabsTrigger value="projects" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background"><Waves size={14} /> Projects</TabsTrigger>
                <TabsTrigger value="traces" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background"><FileDigit size={14} /> Trace Data</TabsTrigger>
                <TabsTrigger value="bingrids" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background"><Grid3X3 size={14} /> Bin Grids</TabsTrigger>
                <TabsTrigger value="interpretations" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background"><Layers size={14} /> Interpretations</TabsTrigger>
              </TabsList>

              {['projects', 'traces', 'bingrids', 'interpretations'].map(tab => (
                <TabsContent key={tab} value={tab} className="m-0 focus-visible:ring-0">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {currentResults.length > 0 ? currentResults.map(item => renderCard(item, tab)) : <EmptyState message={`No ${tab} found`} />}
                    </div>
                  ) : viewMode === 'list' ? (
                    <OSDUDiscoveryList items={currentResults} columns={commonColumns} onInspect={onInspect} icon={tab === 'projects' ? Waves : tab === 'traces' ? FileDigit : tab === 'bingrids' ? Grid3X3 : Layers} iconColor="text-primary" iconBg="bg-primary/10" getDisplayName={getItemDisplayName} getId={getItemId} isLoading={isLoading} />
                  ) : (
                    <div className="h-[600px] w-full"><SpatialMap geoJSON={mapGeoJSON} height="100%" title={`Seismic ${tab}`} description={`Visualizing ${currentResults.length} records`} /></div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </ScrollArea>
        <MeshFooter pageOffset={pageOffset} limit={limit} totalAvailable={currentTabTotalCount} currentCount={currentResults.length} isLoading={!!isLoading} onOffsetChange={onOffsetChange} />
      </div>
    </div>
  )
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="col-span-full py-20 text-center opacity-40">
    <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
    <p className="text-[10px] font-black uppercase tracking-[0.2em]">{message}</p>
  </div>
)