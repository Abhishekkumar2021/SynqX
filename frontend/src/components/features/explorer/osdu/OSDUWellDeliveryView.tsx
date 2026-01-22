import React, { useMemo, useState } from 'react'
import {
  Activity,
  Database,
  Search,
  MoreVertical,
  FileDigit,
  GitCommit,
  PenTool,
  Calendar,
  Globe,
  Map,
  ChevronLeft,
  Compass,
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
import { OSDUTrajectoryViewer } from './OSDUTrajectoryViewer'
import { OSDUWellLogViewer } from './OSDUWellLogViewer'
import { OSDUDiscoveryList, type Column } from './shared/OSDUDiscoveryList'
import { SpatialMap } from '@/components/common/SpatialMap'
import { extractOSDUSpatialData } from '@/lib/osdu-spatial'

interface OSDUWellDeliveryViewProps {
  data: {
    fields: any[]
    fields_total?: number
    wells: any[]
    wells_total?: number
    wellbores: any[]
    wellbores_total?: number
    logs: any[]
    logs_total?: number
    trajectories: any[]
    trajectories_total?: number
  }
  onInspect: (id: string) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
  limit: number
  isLoading?: boolean
}

export const OSDUWellDeliveryView: React.FC<OSDUWellDeliveryViewProps> = ({
  data,
  onInspect,
  pageOffset,
  onOffsetChange,
  limit,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState('fields')
  const [search, setSearch] = useState('')
  const [activeTrajectoryId, setActiveTrajectoryId] = useState<string | null>(null)
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')

  // 1. Initialize ALL Fuzzy Search Hooks
  const filteredFields = useFuzzySearch(data.fields || [], search, {
    keys: ['id', 'kind', 'data.FieldName'],
    threshold: 0.3,
  })

  const filteredWells = useFuzzySearch(data.wells || [], search, {
    keys: ['id', 'kind', 'data.FacilityName'],
    threshold: 0.3,
  })

  const filteredWellbores = useFuzzySearch(data.wellbores || [], search, {
    keys: ['id', 'kind', 'data.FacilityName'],
    threshold: 0.3,
  })

  const filteredLogs = useFuzzySearch(data.logs || [], search, {
    keys: ['id', 'kind', 'data.Name'],
    threshold: 0.3,
  })

  const filteredTrajectories = useFuzzySearch(data.trajectories || [], search, {
    keys: ['id', 'kind', 'data.Name'],
    threshold: 0.3,
  })

  // 2. Drive results based on active tab
  const currentResults = useMemo(() => {
    if (activeTab === 'fields') return filteredFields
    if (activeTab === 'wells') return filteredWells
    if (activeTab === 'wellbores') return filteredWellbores
    if (activeTab === 'logs') return filteredLogs
    if (activeTab === 'trajectories') return filteredTrajectories
    return []
  }, [activeTab, filteredFields, filteredWells, filteredWellbores, filteredLogs, filteredTrajectories])

  const mapGeoJSON = useMemo(() => {
    if (viewMode !== 'map') return null
    const features = currentResults
      .map((item) => extractOSDUSpatialData(item)?.geoJSON?.features || [])
      .flat()

    return features.length > 0 ? { type: 'FeatureCollection', features } : null
  }, [currentResults, viewMode])

  const stats = useMemo(() => {
    return {
      fields: data.fields_total || data.fields?.length || 0,
      wells: data.wells_total || data.wells?.length || 0,
      wellbores: data.wellbores_total || data.wellbores?.length || 0,
      logs: data.logs_total || data.logs?.length || 0,
      trajectories: data.trajectories_total || data.trajectories?.length || 0,
    }
  }, [data])

  const currentTabTotalCount = useMemo(() => {
    if (activeTab === 'fields') return data.fields_total || 0
    if (activeTab === 'wells') return data.wells_total || 0
    if (activeTab === 'wellbores') return data.wellbores_total || 0
    if (activeTab === 'logs') return data.logs_total || 0
    if (activeTab === 'trajectories') return data.trajectories_total || 0
    return 0
  }, [activeTab, data])

  const renderCard = (item: any, type: string) => {
    const name = item.data?.FieldName || item.data?.FacilityName || item.data?.Name || item.id.split(':').pop()
    const id = item.id.split(':').pop()
    const source = item.kind.split(':')[1] || 'OSDU'

    let Icon = Database
    let badge = 'WELL'
    let colorClass = 'text-cyan-500'
    let bgClass = 'bg-cyan-500/10'
    let borderClass = 'border-cyan-500/20'

    if (type === 'fields') { Icon = Map; badge = 'FIELD'; colorClass = 'text-rose-500'; bgClass = 'bg-rose-500/10'; borderClass = 'border-rose-500/20'; }
    else if (type === 'wellbores') { Icon = PenTool; badge = 'WELLBORE'; colorClass = 'text-indigo-500'; bgClass = 'bg-indigo-500/10'; borderClass = 'border-indigo-500/20'; }
    else if (type === 'logs') { Icon = FileDigit; badge = 'WELL_LOG'; colorClass = 'text-emerald-500'; bgClass = 'bg-emerald-500/10'; borderClass = 'border-emerald-500/20'; }
    else if (type === 'trajectories') { Icon = GitCommit; badge = 'TRAJECTORY'; colorClass = 'text-amber-500'; bgClass = 'bg-amber-500/10'; borderClass = 'border-amber-500/20'; }

    return (
      <div key={item.id} className="metric-card p-6 flex flex-col h-full gap-6 group">
        <div className="flex items-start justify-between">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center border shadow-md', bgClass, borderClass, colorClass)}>
            <Icon size={22} />
          </div>
          <Badge className="text-[8px] font-black uppercase px-1.5 h-4">{badge}</Badge>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg tracking-tight uppercase truncate">{name}</h3>
          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase flex items-center gap-1.5"><Globe size={10} /> {item.data?.CurrentOperatorID?.split(':').pop() || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-2.5 mt-auto">
          <Button onClick={() => { if (type === 'trajectories') setActiveTrajectoryId(item.id); else if (type === 'logs') setActiveLogId(item.id); else onInspect(item.id); }} className="flex-1 rounded-xl h-10 gap-2 font-black uppercase text-[11px] bg-primary/90 shadow-xl shadow-primary/20">
            <Search size={14} /> {type === 'trajectories' ? 'Plot Path' : type === 'logs' ? 'Plot Curves' : 'Inspect'}
          </Button>
        </div>
      </div>
    )
  }

  const commonColumns: Column<any>[] = [
    { header: 'Operator', accessor: (item) => <div className="flex items-center gap-2"><Globe size={12} className="opacity-40" /><span>{item.data?.CurrentOperatorID?.split(':').pop() || 'Internal'}</span></div>, width: 'w-1/4' },
    { header: 'Source', accessor: (item) => <Badge variant="outline" className="text-[9px] font-black uppercase">{item.kind?.split(':')[1] || 'OSDU'}</Badge>, width: 'w-32' },
    { header: 'Registered', accessor: (item) => <div className="flex items-center gap-2 opacity-60"><Calendar size={12} /><span>{item.createTime ? new Date(item.createTime).toLocaleDateString() : 'N/A'}</span></div>, width: 'w-40' },
  ]

  const getItemDisplayName = (item: any) => item.data?.FieldName || item.data?.FacilityName || item.data?.Name || item.id.split(':').pop() || ''
  const getItemId = (item: any) => item.id.split(':').pop() || ''

  if (activeLogId) {
    return (
      <div className="h-full flex flex-col bg-background animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="h-16 px-8 border-b flex items-center justify-between shrink-0 bg-muted/5">
          <div className="flex items-center gap-4"><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setActiveLogId(null)}><ChevronLeft size={20} /></Button><div className="space-y-0.5"><h2 className="text-xl font-black uppercase flex items-center gap-3"><FileDigit className="text-primary" size={20} /> Well Log Visualizer</h2><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">WDMS Curve analysis for log <span className="text-primary">{activeLogId.split(':').pop()}</span></p></div></div>
          <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px]">WDMS_V3_READY</Badge>
        </div>
        <ScrollArea className="flex-1 p-8"><div className="max-w-7xl mx-auto"><OSDUWellLogViewer welllogId={activeLogId} name={activeLogId} /></div></ScrollArea>
      </div>
    )
  }

  if (activeTrajectoryId) {
    return (
      <div className="h-full flex flex-col bg-background animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="h-16 px-8 border-b flex items-center justify-between shrink-0 bg-muted/5">
          <div className="flex items-center gap-4"><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setActiveTrajectoryId(null)}><ChevronLeft size={20} /></Button><div className="space-y-0.5"><h2 className="text-xl font-black uppercase flex items-center gap-3"><Compass className="text-primary" size={20} /> Path Deviation Trace</h2><p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Survey station analysis for trajectory <span className="text-primary">{activeTrajectoryId.split(':').pop()}</span></p></div></div>
          <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px]">WDMS_SURVEY_STREAM</Badge>
        </div>
        <ScrollArea className="flex-1 p-8"><div className="max-w-7xl mx-auto"><OSDUTrajectoryViewer trajectoryId={activeTrajectoryId} name={activeTrajectoryId} /></div></ScrollArea>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader icon={Database} title="Well Delivery" subtitle="Wellbore Domain Overview" iconColor="text-cyan-500" search={search} onSearchChange={setSearch} totalCount={stats.fields + stats.wells + stats.wellbores + stats.logs + stats.trajectories} viewMode={viewMode} onViewModeChange={setViewMode} onRefresh={() => onOffsetChange(0)} />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 w-full">
          <div className="p-6 space-y-8 max-w-[1600px] mx-auto pb-32 overflow-x-hidden">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); onOffsetChange(0); }} className="space-y-6">
              <TabsList className="bg-muted/50 p-1 rounded-2xl border h-auto inline-flex">
                <TabsTrigger value="fields" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase data-[state=active]:bg-background"><Map size={14} className="mr-2" /> Fields</TabsTrigger>
                <TabsTrigger value="wells" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase data-[state=active]:bg-background"><Database size={14} className="mr-2" /> Wells</TabsTrigger>
                <TabsTrigger value="wellbores" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase data-[state=active]:bg-background"><PenTool size={14} className="mr-2" /> Wellbores</TabsTrigger>
                <TabsTrigger value="logs" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase data-[state=active]:bg-background"><FileDigit size={14} className="mr-2" /> Well Logs</TabsTrigger>
                <TabsTrigger value="trajectories" className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase data-[state=active]:bg-background"><GitCommit size={14} className="mr-2" /> Trajectories</TabsTrigger>
              </TabsList>

              {['fields', 'wells', 'wellbores', 'logs', 'trajectories'].map(tab => (
                <TabsContent key={tab} value={tab} className="m-0 focus-visible:ring-0">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {currentResults.length > 0 ? currentResults.map(item => renderCard(item, tab)) : <EmptyState message={`No ${tab} found`} />}
                    </div>
                  ) : viewMode === 'list' ? (
                    <OSDUDiscoveryList items={currentResults} columns={tab === 'logs' || tab === 'trajectories' ? [...commonColumns, { header: 'Visuals', accessor: (item) => <Button variant="outline" size="sm" className="h-7 rounded-lg text-[8px] font-black uppercase gap-1.5" onClick={(e) => { e.stopPropagation(); if (tab === 'logs') setActiveLogId(item.id); else setActiveTrajectoryId(item.id); }}>{tab === 'logs' ? <FileDigit size={11} /> : <Compass size={11} />} Plot</Button>, width: 'w-32' }] : commonColumns} onInspect={onInspect} icon={tab === 'fields' ? Map : tab === 'wells' ? Database : tab === 'wellbores' ? PenTool : tab === 'logs' ? FileDigit : GitCommit} iconColor="text-primary" iconBg="bg-primary/10" getDisplayName={getItemDisplayName} getId={getItemId} isLoading={isLoading} />
                  ) : (
                    <div className="h-[600px] w-full"><SpatialMap geoJSON={mapGeoJSON} height="100%" title={`Asset ${tab}`} description={`Visualizing ${currentResults.length} records`} /></div>
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