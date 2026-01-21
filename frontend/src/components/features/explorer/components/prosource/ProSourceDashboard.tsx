import React, { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Database, Layers, Activity, Globe, FileText, Box, RefreshCw } from 'lucide-react'
import { formatNumber, cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { useTheme } from '@/hooks/useTheme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { DashboardWidget } from '@/components/features/dashboard/DashboardWidget'
import { Button } from '@/components/ui/button'

interface ProSourceDashboardProps {
  connectionId: number
  assets: any[]
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
}

const getThemeColors = (theme: string | undefined) => {
  const isDark = theme === 'dark'
  return {
    GRID: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    TEXT: isDark ? '#94a3b8' : '#64748b',
    CHART_COLORS: isDark
      ? ['#818cf8', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf']
      : ['#4f46e5', '#10b981', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#db2777', '#0d9488'],
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-4 rounded-xl z-[1000] border border-white/10 shadow-2xl">
        <p className="subtitle mb-2 pb-2 border-b border-border/50 text-[10px] font-black uppercase tracking-widest opacity-60">
          {label || 'DATA_POINT'}
        </p>
        <div className="flex flex-col gap-2">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shadow-[0_0_8px]"
                  style={{ backgroundColor: p.color || p.fill }}
                />
                <span className="text-xs font-bold text-foreground uppercase tracking-tight">
                  {p.name}
                </span>
              </div>
              <span className="text-xs font-black text-primary tabular-nums">
                {formatNumber(p.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export const ProSourceDashboard: React.FC<ProSourceDashboardProps> = ({ connectionId, assets }) => {
  const { theme } = useTheme()
  const colors = getThemeColors(theme)

  const {
    data: diagnostics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['prosource', 'diagnostics', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_dashboard_diagnostics'),
  })

  const totalDocs = useMemo(
    () =>
      diagnostics?.doc_formats?.reduce(
        (acc: number, curr: any) => acc + (curr.VALUE || curr.value || 0),
        0
      ) || 0,
    [diagnostics]
  )

  const entityDistribution = useMemo(() => {
    return Object.entries(diagnostics?.domain_counts || {})
      .map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))
  }, [diagnostics])

  const kpis = [
    {
      label: 'Contextual Models',
      value: assets.length,
      icon: Layers,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/15 dark:bg-blue-500/20',
    },
    {
      label: 'Unstructured Assets',
      value: totalDocs,
      icon: FileText,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/15 dark:bg-rose-500/20',
    },
    {
      label: 'Functional Domains',
      value: Object.keys(diagnostics?.domain_counts || {}).length,
      icon: Database,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    },
    {
      label: 'Network Latency',
      value: `${diagnostics?.latency_ms || 0}ms`,
      icon: Activity,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    },
  ]

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <ScrollArea className="flex-1">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-8 space-y-10 max-w-[1800px] mx-auto pb-48"
        >
          {/* KPI Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => (
              <motion.div key={i} variants={itemVariants}>
                <div className="metric-card group relative overflow-hidden">
                  <div
                    className={cn(
                      'absolute left-0 top-0 bottom-0 w-1',
                      kpi.bg.replace('/15', '').replace('/20', '')
                    )}
                  />
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110 group-hover:rotate-3',
                        kpi.bg,
                        kpi.color
                      )}
                    >
                      <kpi.icon size={28} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="subtitle mb-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                        {kpi.label}
                      </p>
                      <h4 className="text-3xl font-black tracking-tighter leading-none text-foreground tabular-nums">
                        {typeof kpi.value === 'number' ? formatNumber(kpi.value) : kpi.value}
                      </h4>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <motion.div className="lg:col-span-8" variants={itemVariants}>
              <DashboardWidget
                title="SOCIOTECHNICAL_ENTITY_DISTRIBUTION"
                icon={Database}
                description="Clustering of Seabed objects by functional submodel"
                className="glass-card h-full"
              >
                <div className="h-[450px] w-full pt-8">
                  {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-30">
                      <RefreshCw className="animate-spin text-primary" size={32} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                        Calculating Projections...
                      </span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={entityDistribution}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
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
                          tick={{
                            fontSize: 9,
                            fontWeight: '900',
                            fill: colors.TEXT,
                          }}
                          angle={-45}
                          textAnchor="end"
                          dy={20}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fontSize: 10,
                            fontWeight: 'bold',
                            fill: colors.TEXT,
                          }}
                          dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          barSize={32}
                          animationDuration={1500}
                        >
                          {entityDistribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors.CHART_COLORS[index % colors.CHART_COLORS.length]}
                              fillOpacity={0.8}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </DashboardWidget>
            </motion.div>

            <motion.div className="lg:col-span-4" variants={itemVariants}>
              <DashboardWidget
                title="OBJECT_TYPE_SPECIFICATION"
                icon={Box}
                description="Technical metadata signatures"
                className="glass-card h-full"
              >
                <div className="h-[450px] w-full relative pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={diagnostics?.entity_types?.map((t: any) => ({
                          name: (t.LABEL || t.label || 'Unknown').toUpperCase(),
                          value: t.VALUE || t.value,
                        }))}
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                        animationDuration={1500}
                      >
                        {diagnostics?.entity_types?.map((_: any, index: number) => (
                          <Cell
                            key={`cell-pie-${index}`}
                            fill={colors.CHART_COLORS[(index + 2) % colors.CHART_COLORS.length]}
                            fillOpacity={0.9}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-2">
                    <span className="subtitle opacity-70">Signatures</span>
                    <span className="text-5xl font-black text-foreground tracking-tighter tabular-nums">
                      {diagnostics?.entity_types?.length || 0}
                    </span>
                    <div className="mt-4 h-1 w-12 bg-primary/20 rounded-full" />
                  </div>
                </div>
              </DashboardWidget>
            </motion.div>

            <motion.div className="lg:col-span-6" variants={itemVariants}>
              <DashboardWidget
                title="UNSTRUCTURED_FORMAT_INDEX"
                icon={FileText}
                description="Global index by MIME type"
                className="glass-card"
              >
                <div className="h-[350px] w-full pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={diagnostics?.doc_formats?.map((f: any) => ({
                        name: (f.LABEL || f.label || 'Unknown').toUpperCase(),
                        value: f.VALUE || f.value,
                      }))}
                      layout="vertical"
                      margin={{ left: 20, right: 40 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke={colors.GRID}
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 9,
                          fontWeight: '900',
                          fill: colors.TEXT,
                        }}
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                        {diagnostics?.doc_formats?.map((_: any, index: number) => (
                          <Cell
                            key={`cell-doc-${index}`}
                            fill={colors.CHART_COLORS[(index + 4) % colors.CHART_COLORS.length]}
                            fillOpacity={0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </DashboardWidget>
            </motion.div>

            <motion.div className="lg:col-span-6" variants={itemVariants}>
              <DashboardWidget
                title="SCHEMA_SOURCE_PROVENANCE"
                icon={Globe}
                description="Data lineage roots"
                className="glass-card"
              >
                <div className="h-[350px] w-full pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={diagnostics?.schema_sources?.map((s: any) => ({
                        name: (s.LABEL || s.label || 'Internal').toUpperCase(),
                        value: s.VALUE || s.value,
                      }))}
                      margin={{ bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.GRID} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 9,
                          fontWeight: '900',
                          fill: colors.TEXT,
                        }}
                      />
                      <YAxis axisLine={false} tickLine={false} hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        barSize={32}
                        fill={colors.CHART_COLORS[0]}
                        fillOpacity={0.6}
                      >
                        {diagnostics?.schema_sources?.map((_: any, index: number) => (
                          <Cell
                            key={`cell-src-${index}`}
                            fill={colors.CHART_COLORS[(index + 1) % colors.CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </DashboardWidget>
            </motion.div>
          </div>

          {/* Connection health footer */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between p-8 border border-border/40 rounded-[2.5rem] bg-card/20 backdrop-blur-sm shadow-2xl"
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Protocol_Healthy
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-foreground/60 tracking-widest leading-none mb-1.5">
                  Session_Identity
                </span>
                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                  {diagnostics?.driver_info || 'Oracle Thin Driver'} / Seabed Context
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] gap-3 bg-background hover:bg-muted transition-all active:scale-95 shadow-sm border-border/40"
                onClick={() => refetch()}
              >
                <RefreshCw size={16} className={cn(isLoading && 'animate-spin')} /> Global_Rescan
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </ScrollArea>
    </div>
  )
}
