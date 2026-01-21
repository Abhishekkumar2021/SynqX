import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity,
  Database,
  Search,
  MoreVertical,
  FileDigit,
  GitCommit,
  Layers,
  PenTool,
  Calendar,
  Globe,
  Map,
  Box,
  ChevronLeft,
  Compass,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

  const stats = useMemo(() => {
    return {
      fields: data.fields_total || data.fields?.length || 0,
      wells: data.wells_total || data.wells?.length || 0,
      wellbores: data.wellbores_total || data.wellbores?.length || 0,
      logs: data.logs_total || data.logs?.length || 0,
      trajectories: data.trajectories_total || data.trajectories?.length || 0,
    }
  }, [data])

  const currentTabResultsCount = useMemo(() => {
    if (activeTab === 'fields') return data.fields?.length || 0
    if (activeTab === 'wells') return data.wells?.length || 0
    if (activeTab === 'wellbores') return data.wellbores?.length || 0
    if (activeTab === 'logs') return data.logs?.length || 0
    if (activeTab === 'trajectories') return data.trajectories?.length || 0
    return 0
  }, [activeTab, data])

  const currentTabTotalCount = useMemo(() => {
    if (activeTab === 'fields') return data.fields_total || 0
    if (activeTab === 'wells') return data.wells_total || 0
    if (activeTab === 'wellbores') return data.wellbores_total || 0
    if (activeTab === 'logs') return data.logs_total || 0
    if (activeTab === 'trajectories') return data.trajectories_total || 0
    return 0
  }, [activeTab, data])

  const renderCard = (item: any, type: string) => {
    const name =
      item.data?.FieldName || item.data?.FacilityName || item.data?.Name || item.id.split(':').pop()
    const id = item.id.split(':').pop()
    const source = item.kind.split(':')[1] || 'OSDU'

    let Icon = Database
    let badge = 'WELL'
    let colorClass = 'text-cyan-500'
    let bgClass = 'bg-cyan-500/10'
    let borderClass = 'border-cyan-500/20'

    if (type === 'fields') {
      Icon = Map
      badge = 'FIELD'
      colorClass = 'text-rose-500'
      bgClass = 'bg-rose-500/10'
      borderClass = 'border-rose-500/20'
    } else if (type === 'wellbores') {
      Icon = PenTool
      badge = 'WELLBORE'
      colorClass = 'text-indigo-500'
      bgClass = 'bg-indigo-500/10'
      borderClass = 'border-indigo-500/20'
    } else if (type === 'logs') {
      Icon = FileDigit
      badge = 'WELL_LOG'
      colorClass = 'text-emerald-500'
      bgClass = 'bg-emerald-500/10'
      borderClass = 'border-emerald-500/20'
    } else if (type === 'trajectories') {
      Icon = GitCommit
      badge = 'TRAJECTORY'
      colorClass = 'text-amber-500'
      bgClass = 'bg-amber-500/10'
      borderClass = 'border-amber-500/20'
    }

    return (
      <div key={item.id} className="metric-card p-6 flex flex-col gap-6 group">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shrink-0 border',
              bgClass,
              borderClass,
              colorClass
            )}
          >
            <Icon size={22} />
          </div>
          <div className="flex flex-col items-end gap-1.5 min-w-0">
            <Badge
              className={cn(
                'border-none text-[8px] font-black uppercase px-1.5 h-4 tracking-widest shadow-lg leading-none shrink-0 text-white',
                type === 'fields'
                  ? 'bg-rose-500'
                  : type === 'logs'
                    ? 'bg-emerald-500'
                    : type === 'trajectories'
                      ? 'bg-amber-500'
                      : type === 'wellbores'
                        ? 'bg-indigo-500'
                        : 'bg-cyan-500'
              )}
            >
              {badge}
            </Badge>
            <span className="text-[8px] font-mono text-muted-foreground/30 truncate max-w-[120px]">
              {id}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-lg tracking-tight uppercase truncate text-foreground/90 leading-tight">
            {name}
          </h3>
          <div className="flex items-center gap-2.5 opacity-60">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Globe size={10} />{' '}
              {item.data?.CurrentOperatorID?.split(':').pop() || 'Unknown Operator'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/20 border border-border/10 shadow-inner">
            <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1.5 mb-1">
              <Calendar size={10} /> Registered
            </span>
            <p className="text-[11px] font-black truncate text-foreground/60 leading-none">
              {item.createTime ? new Date(item.createTime).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border/10 shadow-inner">
            <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1.5 mb-1">
              <Database size={10} /> Source
            </span>
            <p className="text-[11px] font-black truncate text-foreground/60 uppercase leading-none">
              {source}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-auto">
          <Button
            onClick={() => {
              if (type === 'trajectories') {
                setActiveTrajectoryId(item.id)
              } else if (type === 'logs') {
                setActiveLogId(item.id)
              } else {
                onInspect(item.id)
              }
            }}
            className={cn(
              'flex-1 rounded-[1.25rem] h-10 gap-2 font-black uppercase text-[11px] tracking-widest text-white shadow-xl active:scale-95 transition-all',
              type === 'fields'
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                : type === 'logs'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  : type === 'trajectories'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    : type === 'wellbores'
                      ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
                      : 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20'
            )}
          >
            <Search size={14} />{' '}
            {type === 'trajectories'
              ? 'Plot Path'
              : type === 'logs'
                ? 'Plot Curves'
                : 'Inspect Data'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-[1.25rem] border-border/40 hover:bg-muted shadow-sm group-hover:bg-background shrink-0"
            onClick={() => onInspect(item.id)}
          >
            <MoreVertical size={16} />
          </Button>
        </div>
      </div>
    )
  }

  const renderListItem = (item: any, type: string) => {
    const name =
      item.data?.FieldName || item.data?.FacilityName || item.data?.Name || item.id.split(':').pop()
    const id = item.id.split(':').pop()
    const source = item.kind.split(':')[1] || 'OSDU'

    let Icon = Database
    let colorClass = 'text-cyan-500'
    let bgClass = 'bg-cyan-500/10'

    if (type === 'fields') {
      Icon = Map
      colorClass = 'text-rose-500'
      bgClass = 'bg-rose-500/10'
    } else if (type === 'wellbores') {
      Icon = PenTool
      colorClass = 'text-indigo-500'
      bgClass = 'bg-indigo-500/10'
    } else if (type === 'logs') {
      Icon = FileDigit
      colorClass = 'text-emerald-500'
      bgClass = 'bg-emerald-500/10'
    } else if (type === 'trajectories') {
      Icon = GitCommit
      colorClass = 'text-amber-500'
      bgClass = 'bg-amber-500/10'
    }

    return (
      <div
        key={item.id}
        className="flex items-center justify-between p-4 px-6 hover:bg-muted/10 transition-colors border-b border-border/10 group cursor-pointer"
        onClick={() => onInspect(item.id)}
      >
        <div className="flex items-center gap-6 min-w-0 flex-1">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm shrink-0',
              bgClass,
              colorClass,
              'border-current/10'
            )}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm uppercase tracking-tight truncate text-foreground/90">
              {name}
            </h4>
            <p className="text-[10px] font-mono text-muted-foreground/40 truncate uppercase">
              {item.id}
            </p>
          </div>
          <div className="hidden lg:flex flex-col gap-1 w-48">
            <span className="text-[8px] font-black uppercase text-muted-foreground/40 leading-none">
              Operator
            </span>
            <span className="text-[10px] font-bold truncate uppercase">
              {item.data?.CurrentOperatorID?.split(':').pop() || 'Internal'}
            </span>
          </div>
          <div className="hidden md:flex flex-col gap-1 w-32">
            <span className="text-[8px] font-black uppercase text-muted-foreground/40 leading-none">
              Registered
            </span>
            <span className="text-[10px] font-bold uppercase">
              {item.createTime ? new Date(item.createTime).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest px-3"
            onClick={(e) => {
              e.stopPropagation()
              if (type === 'trajectories') setActiveTrajectoryId(item.id)
              else if (type === 'logs') setActiveLogId(item.id)
              else onInspect(item.id)
            }}
          >
            {type === 'trajectories' || type === 'logs' ? 'Plot' : 'Inspect'}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
            <MoreVertical size={14} />
          </Button>
        </div>
      </div>
    )
  }

  if (activeLogId) {
    return (
      <div className="h-full flex flex-col bg-background animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="h-16 px-8 border-b border-border/10 flex items-center justify-between shrink-0 bg-muted/5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-muted"
              onClick={() => setActiveLogId(null)}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black tracking-tighter text-foreground uppercase flex items-center gap-3 leading-none">
                <FileDigit className="text-primary" size={20} /> Well Log Visualizer
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                WDMS Curve analysis for log{' '}
                <span className="text-primary">{activeLogId.split(':').pop()}</span>
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest"
          >
            WDMS_V3_READY
          </Badge>
        </div>
        <ScrollArea className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <OSDUWellLogViewer welllogId={activeLogId} name={activeLogId} />
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (activeTrajectoryId) {
    return (
      <div className="h-full flex flex-col bg-background animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="h-16 px-8 border-b border-border/10 flex items-center justify-between shrink-0 bg-muted/5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-muted"
              onClick={() => setActiveTrajectoryId(null)}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black tracking-tighter text-foreground uppercase flex items-center gap-3 leading-none">
                <Compass className="text-primary" size={20} /> Path Deviation Trace
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                Survey station analysis for trajectory{' '}
                <span className="text-primary">{activeTrajectoryId.split(':').pop()}</span>
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest"
          >
            WDMS_SURVEY_STREAM
          </Badge>
        </div>
        <ScrollArea className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <OSDUTrajectoryViewer trajectoryId={activeTrajectoryId} name={activeTrajectoryId} />
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader
        icon={Database}
        title="Well Delivery"
        subtitle="Wellbore Domain Overview"
        iconColor="text-cyan-500"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter well assets..."
        onRefresh={() => onOffsetChange(0)}
        totalCount={stats.fields + stats.wells + stats.wellbores + stats.logs + stats.trajectories}
        countLabel="Total Assets"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-[1600px] mx-auto pb-32 transition-all">
            {/* KPI Header */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                {
                  label: 'Fields',
                  value: stats.fields,
                  icon: Map,
                  color: 'text-rose-500',
                  bg: 'bg-rose-500/10',
                  border: 'border-rose-500/10',
                },
                {
                  label: 'Wells',
                  value: stats.wells,
                  icon: Database,
                  color: 'text-cyan-500',
                  bg: 'bg-cyan-500/10',
                  border: 'border-cyan-500/10',
                },
                {
                  label: 'Wellbores',
                  value: stats.wellbores,
                  icon: PenTool,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-500/10',
                  border: 'border-indigo-500/10',
                },
                {
                  label: 'Well Logs',
                  value: stats.logs,
                  icon: FileDigit,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-500/10',
                  border: 'border-emerald-500/10',
                },
                {
                  label: 'Trajectories',
                  value: stats.trajectories,
                  icon: GitCommit,
                  color: 'text-amber-500',
                  bg: 'bg-amber-500/10',
                  border: 'border-amber-500/10',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="metric-card p-5 flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">
                      {kpi.label}
                    </p>
                    <h3 className="text-2xl font-black tracking-tighter text-foreground leading-none">
                      {kpi.value}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border shadow-inner',
                      kpi.bg,
                      kpi.color,
                      kpi.border
                    )}
                  >
                    <kpi.icon size={20} />
                  </div>
                </div>
              ))}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val)
                onOffsetChange(0)
              }}
              className="space-y-6"
            >
              <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/40 h-auto inline-flex">
                {[
                  { id: 'fields', label: 'Fields', icon: Map },
                  { id: 'wells', label: 'Wells', icon: Database },
                  { id: 'wellbores', label: 'Wellbores', icon: PenTool },
                  { id: 'logs', label: 'Well Logs', icon: FileDigit },
                  { id: 'trajectories', label: 'Trajectories', icon: GitCommit },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    <tab.icon size={14} /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="fields" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredFields.length > 0 ? (
                    filteredFields.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'fields')
                        : renderListItem(item, 'fields')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Fields Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="wells" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredWells.length > 0 ? (
                    filteredWells.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'wells')
                        : renderListItem(item, 'wells')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Wells Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="wellbores" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredWellbores.length > 0 ? (
                    filteredWellbores.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'wellbores')
                        : renderListItem(item, 'wellbores')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Wellbores Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((item) =>
                      viewMode === 'grid' ? renderCard(item, 'logs') : renderListItem(item, 'logs')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Well Logs Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="trajectories" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredTrajectories.length > 0 ? (
                    filteredTrajectories.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'trajectories')
                        : renderListItem(item, 'trajectories')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Trajectories Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <MeshFooter
          pageOffset={pageOffset}
          limit={limit}
          totalAvailable={currentTabTotalCount}
          currentCount={currentTabResultsCount}
          isLoading={isLoading}
          onOffsetChange={onOffsetChange}
        />
      </div>
    </div>
  )
}
