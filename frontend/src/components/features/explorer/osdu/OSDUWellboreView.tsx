import React, { useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Database, Activity, TrendingUp, Globe, ChevronRight, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { DashboardWidget } from '@/components/features/dashboard/DashboardWidget'
import { ScrollArea } from '@/components/ui/scroll-area'

interface OSDUWellboreViewProps {
  records: any[]
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
      <CardContent className="p-6 relative">
        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
          <Icon size={100} />
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-xl border shadow-inner', variants[variant])}>
                <Icon size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                {title}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black tracking-tighter text-foreground tabular-nums">
                {value}
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                {subtext}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const OSDUWellboreView: React.FC<OSDUWellboreViewProps> = ({ records }) => {
  const { theme } = useTheme()
  const colors = useMemo(() => getThemeColors(theme), [theme])

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

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-8xl mx-auto flex flex-col h-full overflow-hidden">
      <div className="space-y-1 shrink-0 px-1">
        <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase flex items-center gap-3">
          <Database className="text-primary" /> Wellbore Intelligence
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Domain-specific specialized view for master-data--Well entities.
        </p>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-8 pb-20">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
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

          {/* Charts Row */}
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.GRID} />
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

          {/* Rankings List */}
          <Card className="bg-background/40 backdrop-blur-md border-border/40 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-border/5 bg-muted/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold uppercase">Provider League</CardTitle>
                <CardDescription className="text-xs">
                  Ranking of operators by successful asset registration
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/5">
                {stats.operators.map((op, i) => (
                  <div
                    key={op.name}
                    className="px-8 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                        <span className="text-xs font-black">{i + 1}</span>
                      </div>
                      <span className="font-bold text-sm text-foreground/80 group-hover:text-primary transition-colors">
                        {op.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">
                          Registered Wells
                        </span>
                        <span className="font-mono text-sm font-bold text-foreground/60">
                          {op.value}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
