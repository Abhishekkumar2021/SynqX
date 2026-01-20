 
import React, { useMemo } from 'react'
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
  Cell as PieCell,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, Layers, Globe, Shield, Users, ShieldCheck } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'
import { DashboardWidget } from '@/components/features/dashboard/DashboardWidget'

interface OSDUDashboardProps {
  kinds: any[]
  groups: any[]
  legalTags: any[]
}

const getThemeColors = (theme: string | undefined) => {
  const isDark = theme === 'dark'
  return {
    PRIMARY: isDark ? '#6366f1' : '#4f46e5',
    GRID: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    TEXT: isDark ? '#cbd5e1' : '#475569',
    CHART_COLORS: isDark
      ? ['#818cf8', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf']
      : ['#4f46e5', '#10b981', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#db2777', '#0d9488'],
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-2xl p-4 shadow-2xl z-[1000] ring-1 ring-white/10">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80 mb-3 border-b border-border/10 pb-2">
          {label}
        </p>
        <div className="flex flex-col gap-2.5">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-2 w-2 rounded-full shadow-[0_0_8px]"
                  style={{ backgroundColor: p.color || p.fill }}
                />
                <span className="text-[12px] font-bold text-foreground">{p.name}</span>
              </div>
              <span className="text-[12px] font-black text-foreground">
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
}

export const OSDUDashboard: React.FC<OSDUDashboardProps> = ({ kinds, groups, legalTags }) => {
  const { theme } = useTheme()
  const colors = getThemeColors(theme)

  const analytics = useMemo(() => {
    const totalKinds = kinds.length
    const totalGroups = groups.length
    const totalTags = legalTags.length
    const totalRecords = kinds.reduce((acc, k) => acc + (k.rows || 0), 0)

    const authMap: Record<string, number> = {}
    kinds.forEach((k) => (authMap[k.authority] = (authMap[k.authority] || 0) + 1))
    const sovereigntyData = Object.entries(authMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const groupMap: Record<string, number> = {}
    kinds.forEach((k) => (groupMap[k.group] = (groupMap[k.group] || 0) + 1))
    const compositionData = Object.entries(groupMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const sourceMap: Record<string, number> = {}
    kinds.forEach((k) => (sourceMap[k.source] = (sourceMap[k.source] || 0) + 1))
    const provenanceData = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const cleanedGroups = Array.from(
      new Set(
        groups.map((g) => {
          return g.name.replace(/^data\.|^service\.|^users\./, '')
        })
      )
    ).map((name) => ({ displayName: name }))

    return {
      totalKinds,
      totalGroups,
      totalTags,
      totalRecords,
      sovereigntyData,
      compositionData,
      provenanceData,
      cleanedGroups,
      uniqueAuthorities: sovereigntyData.length,
    }
  }, [kinds, groups, legalTags])

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <ScrollArea className="flex-1">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-8 space-y-10 max-w-[1800px] mx-auto pb-32"
        >
          {/* --- HIGH-CONTRAST KPI STRIP --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Schema Manifests',
                value: analytics.totalKinds,
                icon: Layers,
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-500/15 dark:bg-blue-500/20',
              },
              {
                label: 'Partition Records',
                value: analytics.totalRecords,
                icon: Database,
                color: 'text-indigo-600 dark:text-indigo-400',
                bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
              },
              {
                label: 'Policy Coverage',
                value: analytics.totalTags,
                icon: ShieldCheck,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
              },
              {
                label: 'Active Authorities',
                value: analytics.uniqueAuthorities,
                icon: Globe,
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-500/15 dark:bg-amber-500/20',
              },
            ].map((kpi, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Card
                  className="border-border/40 bg-card shadow-md group hover:border-primary/40 hover:shadow-xl transition-all border-l-4"
                  style={{ borderLeftColor: colors.CHART_COLORS[i] }}
                >
                  <CardContent className="p-6 flex items-center gap-6">
                    <div
                      className={cn(
                        'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm',
                        kpi.bg,
                        kpi.color
                      )}
                    >
                      <kpi.icon size={28} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-2.5">
                        {kpi.label}
                      </p>
                      <h4 className="text-3xl font-black tracking-tighter leading-none text-foreground">
                        {formatNumber(kpi.value)}
                      </h4>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Partition Sovereignty Bar Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-8 min-h-0 min-w-0">
              <DashboardWidget
                title="Authority Sovereignty"
                description="Entity schema distribution per verified authority domain"
                className="h-full border-border/40 bg-card shadow-md"
              >
                <div className="h-[400px] w-full mt-10 min-h-0 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.sovereigntyData}
                      margin={{ top: 30, right: 40, bottom: 30, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.GRID} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: colors.TEXT, fontSize: 11, fontWeight: 800 }}
                        dy={15}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: colors.TEXT, fontSize: 11, fontWeight: 800 }}
                        dx={-5}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                        {analytics.sovereigntyData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors.CHART_COLORS[index % colors.CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </DashboardWidget>
            </motion.div>

            {/* Domain Composition Pie Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-4 min-h-0 min-w-0">
              <DashboardWidget
                title="Functional Groups"
                description="Mapping of entity functional classifications"
                className="h-full border-border/40 bg-card shadow-md"
              >
                <div className="h-[400px] w-full mt-10 relative min-h-0 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 30, right: 30, left: 30, bottom: 30 }}>
                      <Pie
                        data={analytics.compositionData}
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {analytics.compositionData.map((_, index) => (
                          <PieCell
                            key={`cell-${index}`}
                            fill={colors.CHART_COLORS[index % colors.CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                      Registered
                    </span>
                    <span className="text-4xl font-black text-foreground">
                      {analytics.totalKinds}
                    </span>
                  </div>
                </div>
              </DashboardWidget>
            </motion.div>

            {/* Source Provenance Bar Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-12 min-h-0 min-w-0">
              <DashboardWidget
                title="Schema Origin Provenance"
                description="Distribution of registry definition sources across the partition"
                className="border-border/40 bg-card shadow-md"
              >
                <div className="h-[300px] w-full mt-10 min-h-0 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.provenanceData}
                      layout="vertical"
                      margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke={colors.GRID}
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: colors.TEXT, fontSize: 11, fontWeight: 800 }}
                        dy={5}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: colors.TEXT, fontSize: 12, fontWeight: 900 }}
                        width={100}
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                        {analytics.provenanceData.map((_, index) => (
                          <Cell
                            key={`cell-prov-${index}`}
                            fill={colors.CHART_COLORS[(index + 4) % colors.CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </DashboardWidget>
            </motion.div>

            {/* --- HIGH-CONTRAST GOVERNANCE SECTION --- */}
            <motion.div variants={itemVariants} className="lg:col-span-12">
              <Card className="border-border/40 bg-card shadow-lg ring-1 ring-white/5">
                <CardContent className="p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-sm">
                        <Shield size={28} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-widest leading-none text-foreground">
                          Security & Sovereignty Registry
                        </h4>
                        <p className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-widest opacity-80">
                          Entitlement domains and compliance verification
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end mr-6">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Pulse Status
                        </span>
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                            Registry Sync: Active
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="h-12 rounded-2xl font-black uppercase text-[11px] border-border/60 px-8 hover:bg-muted shadow-md transition-all"
                      >
                        Audit Security
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-border/20 pb-4 px-1">
                        <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground/70 flex items-center gap-3">
                          <Users size={16} className="text-primary" /> Entitlement Domains
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-primary text-primary-foreground border-none text-[11px] font-black h-6 px-3"
                        >
                          {analytics.totalGroups}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {analytics.cleanedGroups.slice(0, 48).map((g: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-muted/40 text-[11px] font-bold border-border/40 text-foreground px-3.5 py-1.5 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-default max-w-[240px] truncate uppercase tracking-tight shadow-sm"
                            title={g.displayName}
                          >
                            {g.displayName}
                          </Badge>
                        ))}
                        {analytics.totalGroups > 48 && (
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-black bg-muted/80 border-none px-4 h-7 text-foreground"
                          >
                            +{analytics.totalGroups - 48} ADDITIONAL
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-border/20 pb-4 px-1">
                        <span className="text-xs font-black uppercase tracking-[0.25em] text-foreground/70 flex items-center gap-3">
                          <ShieldCheck size={16} className="text-emerald-500" /> Compliance Suite
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-600 text-white border-none text-[11px] font-black h-6 px-3"
                        >
                          {analytics.totalTags}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {legalTags.slice(0, 8).map((t: any, idx: number) => (
                          <div
                            key={t.name || `tag-${idx}`}
                            className="flex items-center justify-between p-5 rounded-[1.5rem] bg-card border border-border/40 hover:border-emerald-500/40 hover:shadow-lg transition-all shadow-md group"
                          >
                            <div className="flex flex-col min-w-0 pr-4">
                              <span className="text-xs font-black text-foreground truncate uppercase tracking-tight">
                                {t.name}
                              </span>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                                Verified Context
                              </span>
                            </div>
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </ScrollArea>
    </div>
  )
}
