import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import {
  Database,
  Activity,
  TrendingUp,
  Globe,
  Ruler,
  Compass,
  Calendar,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { DashboardWidget } from '@/components/features/dashboard/DashboardWidget'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OSDUTrajectoryViewer } from './OSDUTrajectoryViewer'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { OSDUDiscoveryList, type Column } from './shared/OSDUDiscoveryList'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

interface OSDUWellboreViewProps {
  records: any[]
  onInspect: (id: string) => void
  isLoading?: boolean
}

// --- Premium Color Palette ---
const getThemeColors = (theme: string | undefined) => {
  const isDark = theme === 'dark'
  return {
    PRIMARY: isDark ? '#6366f1' : '#4f46e5',
    SUCCESS: isDark ? '#10b981' : '#059669',
    GRID: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    TEXT: isDark ? '#94a3b8' : '#64748b',
    CHART_COLORS: [
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#3b82f6',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
    ],
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-2xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95 min-w-48 z-[1000] ring-1 ring-white/5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-white/10 pb-1.5">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-6 text-[11px] font-bold"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                  style={{
                    backgroundColor: entry.color || entry.fill,
                    boxShadow: `0 0 10px ${entry.color || entry.fill}40`,
                  }}
                />
                <span className="text-muted-foreground uppercase tracking-tight">
                  {entry.name}:
                </span>
              </div>
              <span className="font-mono text-foreground font-bold tracking-tight">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const StatsCard = ({ title, value, subtext, icon: Icon, variant = 'primary' }: any) => {
  const variants: any = {
    primary: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }

  return (
    <Card className="bg-background/40 backdrop-blur-md border-border/40 shadow-sm overflow-hidden group hover:border-primary/30 transition-all duration-500">
      <CardContent className="p-4 relative">
        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
          <Icon size={80} />
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={cn('p-1.5 rounded-lg border shadow-inner', variants[variant])}>
                <Icon size={14} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                {title}
              </span>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-2xl font-black tracking-tighter text-foreground tabular-nums leading-none">
                {value}
              </h3>
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                {subtext}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const OSDUWellboreView: React.FC<OSDUWellboreViewProps> = ({
  records,
  onInspect,
  isLoading,
}) => {
  const { theme } = useTheme()
  const [activeTrajectoryId, setActiveTrajectoryId] = React.useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const colors = useMemo(() => getThemeColors(theme), [theme])

  const filteredRecords = useFuzzySearch(records || [], search, {
    keys: ['id', 'data.ProjectName', 'data.ElementName', 'data.CurrentOperatorID'],
    threshold: 0.3,
  })

  const stats = useMemo(() => {
    let totalDepth = 0
    let activeWells = 0
    const operatorCounts: Record<string, number> = {}
    const depthData: any[] = []

    records.forEach((r, idx) => {
      const depth = r.data?.VerticalMeasurements?.[0]?.VerticalMeasurement || 0
      totalDepth += depth

      if (depth > 0 && idx < 20) {
        depthData.push({
          name: r.data?.ElementName || r.id.split(':').pop(),
          depth: depth,
          id: r.id, // Keep ID for drill down
        })
      }

      if (r.data?.FacilityEvents?.[0]?.FacilityEventTypeID?.includes('Spud')) {
        activeWells++
      }

      const op = r.data?.CurrentOperatorID?.split(':').pop() || 'Unknown'
      operatorCounts[op] = (operatorCounts[op] || 0) + 1
    })

    return {
      count: records.length,
      avgDepth: records.length ? Math.round(totalDepth / records.length) : 0,
      active: activeWells,
      operators: Object.entries(operatorCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      depthData: depthData.sort((a, b) => b.depth - a.depth),
    }
  }, [records])

  const columns: Column<any>[] = [
    {
      header: 'Operator',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-muted-foreground/40" />
          <span className="uppercase">
            {item.data?.CurrentOperatorID?.split(':').pop() || 'Internal'}
          </span>
        </div>
      ),
      width: 'w-1/4',
    },
    {
      header: 'Depth',
      accessor: (item) => (
        <div className="flex items-center gap-2 font-mono text-indigo-500">
          <Ruler size={12} />
          <span>{item.data?.VerticalMeasurements?.[0]?.VerticalMeasurement || '0'}m</span>
        </div>
      ),
      width: 'w-32',
    },
    {
      header: 'Source',
      accessor: (item) => (
        <Badge
          variant="outline"
          className="text-[9px] font-black uppercase tracking-tighter border-border/40"
        >
          {item.kind?.split(':')[1] || 'OSDU'}
        </Badge>
      ),
      width: 'w-32',
    },
    {
      header: 'Registered',
      accessor: (item) => (
        <div className="flex items-center gap-2 opacity-60">
          <Calendar size={12} />
          <span>{item.createTime ? new Date(item.createTime).toLocaleDateString() : 'N/A'}</span>
        </div>
      ),
      width: 'w-40',
    },
  ]

  const getItemDisplayName = (item: any) =>
    item.data?.ProjectName || item.data?.ElementName || item.id.split(':').pop() || ''

  const getItemId = (item: any) => item.id.split(':').pop() || ''

  if (activeTrajectoryId) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-8xl mx-auto flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-muted"
                onClick={() => setActiveTrajectoryId(null)}
              >
                <ChevronLeft size={20} />
              </Button>
              <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase flex items-center gap-3">
                <Compass className="text-primary" /> Path Deviation Trace
              </h2>
            </div>
            <p className="text-sm text-muted-foreground font-medium ml-13">
              Survey station analysis for trajectory{' '}
              <span className="text-foreground font-bold">
                {activeTrajectoryId.split(':').pop()}
              </span>
            </p>
          </div>
          <Badge
            variant="outline"
            className="h-9 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest"
          >
            WDMS_SURVEY_STREAM
          </Badge>
        </div>

        <ScrollArea className="flex-1 -mx-4 px-4 overflow-y-auto">
          <OSDUTrajectoryViewer trajectoryId={activeTrajectoryId} name={activeTrajectoryId} />
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader
        icon={Database}
        title="Wellbore Intelligence"
        subtitle="Well Master & WDMS Analytics"
        iconColor="text-indigo-500"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter well records..."
        totalCount={records.length}
        countLabel="Total Wells"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-[1600px] mx-auto pb-32 transition-all">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <StatsCard
                title="Total Wells"
                value={stats.count}
                subtext="Master Data Records"
                icon={Database}
                variant="primary"
              />
              <StatsCard
                title="Mean Depth"
                value={`${stats.avgDepth}m`}
                subtext="Vertical Measurement"
                icon={Ruler}
                variant="success"
              />
              <StatsCard
                title="Active Ops"
                value={stats.active}
                subtext="Recent Spud Events"
                icon={Activity}
                variant="warning"
              />
              <StatsCard
                title="Operators"
                value={stats.operators.length}
                subtext="Service Providers"
                icon={Globe}
                variant="info"
              />
            </div>

            {/* Charts Row - Only show in Grid Mode for density */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                  <DashboardWidget
                    title="Operator Distribution"
                    description="Well volume across top data providers"
                    icon={TrendingUp}
                    className="h-112.5"
                  >
                    <div className="h-full w-full p-6 pb-10">
                      <ResponsiveContainer width="100%" height="100%" key={`well-op-${theme}`}>
                        <LineChart
                          data={stats.operators}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={colors.GRID}
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontStyle: 'bold', fill: colors.TEXT }}
                            dy={10}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: colors.TEXT }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Well Count"
                            stroke={colors.PRIMARY}
                            strokeWidth={4}
                            dot={{ r: 6, fill: colors.PRIMARY, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            animationDuration={1500}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </DashboardWidget>
                </div>

                <div className="lg:col-span-4">
                  <DashboardWidget
                    title="Depth Variance"
                    description="Comparison of well verticality"
                    icon={Ruler}
                    className="h-112.5"
                  >
                    <div className="h-full w-full p-6">
                      <ResponsiveContainer width="100%" height="100%" key={`well-depth-${theme}`}>
                        <BarChart data={stats.depthData} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={true}
                            vertical={false}
                            stroke={colors.GRID}
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 9, fontStyle: 'bold', fill: colors.TEXT }}
                            width={80}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          />
                          <Bar dataKey="depth" name="Depth (m)" radius={[0, 4, 4, 0]} barSize={16}>
                            {stats.depthData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={colors.CHART_COLORS[index % colors.CHART_COLORS.length]}
                                fillOpacity={0.8}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </DashboardWidget>
                </div>
              </div>
            )}

            {/* List Row */}
            {viewMode === 'list' ? (
              <OSDUDiscoveryList
                items={filteredRecords}
                columns={columns}
                onInspect={onInspect}
                icon={Database}
                iconColor="text-indigo-500"
                iconBg="bg-indigo-500/10"
                getDisplayName={getItemDisplayName}
                getId={getItemId}
                isLoading={isLoading}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                    Master Record Discovery
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredRecords.slice(0, 50).map((well, i) => (
                    <Card
                      key={well.id}
                      className="bg-background/40 backdrop-blur-md border-border/40 hover:border-primary/30 transition-all group cursor-pointer overflow-hidden relative"
                      onClick={() => onInspect(well.id)}
                    >
                      <div className="p-6 flex flex-col h-full gap-6">
                        <div className="flex items-start justify-between">
                          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Database size={20} />
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[8px] font-black uppercase border-border/40 bg-muted/20"
                          >
                            WELL
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-bold text-lg leading-tight truncate uppercase tracking-tight">
                            {getItemDisplayName(well)}
                          </h4>
                          <p className="text-[10px] font-mono text-muted-foreground/40 truncate uppercase">
                            {well.id}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-auto">
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/10">
                            <span className="text-[8px] font-black uppercase text-muted-foreground/40 block mb-1">
                              Depth
                            </span>
                            <span className="text-xs font-bold font-mono">
                              {well.data?.VerticalMeasurements?.[0]?.VerticalMeasurement || '0'}m
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/10">
                            <span className="text-[8px] font-black uppercase text-muted-foreground/40 block mb-1">
                              Operator
                            </span>
                            <span className="text-xs font-bold truncate block">
                              {well.data?.CurrentOperatorID?.split(':').pop() || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 rounded-xl h-9 text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              onInspect(well.id)
                            }}
                          >
                            <Search size={14} /> Inspect
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-xl border-border/40"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveTrajectoryId(
                                well.id.replace(
                                  'master-data--Well',
                                  'master-data--WellboreTrajectory'
                                )
                              )
                            }}
                          >
                            <Compass size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
