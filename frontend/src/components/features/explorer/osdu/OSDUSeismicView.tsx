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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

  const stats = useMemo(() => {
    return {
      projects: data.projects_total || data.projects?.length || 0,
      traces: data.traces_total || data.traces?.length || 0,
      bingrids: data.bingrids_total || data.bingrids?.length || 0,
      interpretations: data.interpretations_total || data.interpretations?.length || 0,
      activeProjects:
        data.projects?.filter((r) => r.data?.ProjectStatusID?.includes('Active')).length || 0,
    }
  }, [data])

  const currentTabResultsCount = useMemo(() => {
    if (activeTab === 'projects') return data.projects?.length || 0
    if (activeTab === 'traces') return data.traces?.length || 0
    if (activeTab === 'bingrids') return data.bingrids?.length || 0
    if (activeTab === 'interpretations') return data.interpretations?.length || 0
    return 0
  }, [activeTab, data])

  const currentTabTotalCount = useMemo(() => {
    if (activeTab === 'projects') return data.projects_total || 0
    if (activeTab === 'traces') return data.traces_total || 0
    if (activeTab === 'bingrids') return data.bingrids_total || 0
    if (activeTab === 'interpretations') return data.interpretations_total || 0
    return 0
  }, [activeTab, data])

  const renderCard = (item: any, type: string) => {
    const name =
      item.data?.Name ||
      item.data?.ProjectName ||
      item.data?.BinGridName ||
      item.id.split(':').pop()
    const id = item.id.split(':').pop()
    const source = item.kind.split(':')[1] || 'OSDU'

    let Icon = Waves
    let badge = 'PROJECT'
    let colorClass = 'text-orange-500'
    let bgClass = 'bg-orange-500/10'
    let borderClass = 'border-orange-500/20'

    if (type === 'traces') {
      Icon = FileDigit
      badge = 'SEGY_TRACE'
      colorClass = 'text-blue-500'
      bgClass = 'bg-blue-500/10'
      borderClass = 'border-blue-500/20'
    } else if (type === 'bingrids') {
      Icon = Grid3X3
      badge = 'BIN_GRID'
      colorClass = 'text-emerald-500'
      bgClass = 'bg-emerald-500/10'
      borderClass = 'border-emerald-500/20'
    } else if (type === 'interpretations') {
      Icon = Layers
      badge = 'INTERP_SET'
      colorClass = 'text-purple-500'
      bgClass = 'bg-purple-500/10'
      borderClass = 'border-purple-500/20'
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
                type === 'traces'
                  ? 'bg-blue-500'
                  : type === 'bingrids'
                    ? 'bg-emerald-500'
                    : type === 'interpretations'
                      ? 'bg-purple-500'
                      : 'bg-orange-500'
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
              <Globe size={10} /> {item.data?.OperatorID?.split(':').pop() || 'Internal'}
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
            onClick={() => onInspect(item.id)}
            className={cn(
              'flex-1 rounded-[1.25rem] h-10 gap-2 font-black uppercase text-[11px] tracking-widest text-white shadow-xl active:scale-95 transition-all',
              type === 'traces'
                ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                : type === 'bingrids'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  : type === 'interpretations'
                    ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
            )}
          >
            <Search size={14} /> Inspect Data
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
      item.data?.Name ||
      item.data?.ProjectName ||
      item.data?.BinGridName ||
      item.id.split(':').pop()
    const id = item.id.split(':').pop()
    const source = item.kind.split(':')[1] || 'OSDU'

    let Icon = Waves
    let colorClass = 'text-orange-500'
    let bgClass = 'bg-orange-500/10'

    if (type === 'traces') {
      Icon = FileDigit
      colorClass = 'text-blue-500'
      bgClass = 'bg-blue-500/10'
    } else if (type === 'bingrids') {
      Icon = Grid3X3
      colorClass = 'text-emerald-500'
      bgClass = 'bg-emerald-500/10'
    } else if (type === 'interpretations') {
      Icon = Layers
      colorClass = 'text-purple-500'
      bgClass = 'bg-purple-500/10'
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
              {item.data?.OperatorID?.split(':').pop() || 'Internal'}
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
              onInspect(item.id)
            }}
          >
            Inspect
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
            <MoreVertical size={14} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader
        icon={Waves}
        title="Seismic Discovery"
        subtitle="Seismic Domain Overview"
        iconColor="text-orange-500"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter seismic assets..."
        onRefresh={() => onOffsetChange(0)}
        totalCount={stats.projects + stats.traces + stats.bingrids + stats.interpretations}
        countLabel="Total Assets"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-[1600px] mx-auto pb-32 transition-all">
            {/* KPI Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Projects',
                  value: stats.projects,
                  icon: Waves,
                  color: 'text-orange-500',
                  bg: 'bg-orange-500/10',
                  border: 'border-orange-500/10',
                },
                {
                  label: 'Trace Volumes',
                  value: stats.traces,
                  icon: FileDigit,
                  color: 'text-blue-500',
                  bg: 'bg-blue-500/10',
                  border: 'border-blue-500/10',
                },
                {
                  label: 'Bin Grids',
                  value: stats.bingrids,
                  icon: Grid3X3,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-500/10',
                  border: 'border-emerald-500/10',
                },
                {
                  label: 'Interpretations',
                  value: stats.interpretations,
                  icon: Layers,
                  color: 'text-purple-500',
                  bg: 'bg-purple-500/10',
                  border: 'border-purple-500/10',
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
                  { id: 'projects', label: 'Projects', icon: Waves },
                  { id: 'traces', label: 'Trace Data', icon: FileDigit },
                  { id: 'bingrids', label: 'Bin Grids', icon: Grid3X3 },
                  { id: 'interpretations', label: 'Interpretations', icon: Layers },
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

              <TabsContent value="projects" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'projects')
                        : renderListItem(item, 'projects')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Projects Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="traces" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredTraces.length > 0 ? (
                    filteredTraces.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'traces')
                        : renderListItem(item, 'traces')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Trace Data Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="bingrids" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredBingrids.length > 0 ? (
                    filteredBingrids.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'bingrids')
                        : renderListItem(item, 'bingrids')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Bin Grids Found
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="interpretations" className="m-0 focus-visible:ring-0">
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
                      : 'flex flex-col bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm'
                  )}
                >
                  {filteredInterpretations.length > 0 ? (
                    filteredInterpretations.map((item) =>
                      viewMode === 'grid'
                        ? renderCard(item, 'interpretations')
                        : renderListItem(item, 'interpretations')
                    )
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        No Interpretations Found
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
