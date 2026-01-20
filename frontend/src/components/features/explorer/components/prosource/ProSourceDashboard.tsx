import React, { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import {
  Database,
  Layers,
  Activity,
  Globe,
  FileText,
  Box,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber, cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
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

const COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 backdrop-blur-xl border border-border/40 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 border-b pb-1">
          {label}
        </p>
        <div className="flex items-center gap-4 justify-between">
          <span className="text-xs font-bold">{payload[0].name}:</span>
          <span className="text-xs font-black text-primary">{formatNumber(payload[0].value)}</span>
        </div>
      </div>
    )
  }
  return null
}

export const ProSourceDashboard: React.FC<ProSourceDashboardProps> = ({ connectionId, assets }) => {
  const { data: diagnostics, isLoading, refetch } = useQuery({
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
    return Object.entries(diagnostics?.domain_counts || {}).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
    })).sort((a, b) => (b.value as number) - (a.value as number))
  }, [diagnostics])

  return (
    <ScrollArea className="h-full bg-muted/5 relative">
      <div className="p-10 max-w-[1800px] mx-auto space-y-12 pb-48">
        {/* KPI Section - Overhauled */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              label: 'Contextual Models',
              sub: 'Seabed Schema Objects',
              val: assets.length,
              icon: Layers,
              color: 'text-indigo-500',
              bg: 'bg-indigo-500/10',
              border: 'border-indigo-500/20'
            },
            {
              label: 'Unstructured Assets',
              sub: 'Knowledge Base Index',
              val: totalDocs,
              icon: FileText,
              color: 'text-rose-500',
              bg: 'bg-rose-500/10',
              border: 'border-rose-500/20'
            },
            {
              label: 'Functional Domains',
              sub: 'Semantic Clusters',
              val: Object.keys(diagnostics?.domain_counts || {}).length,
              icon: Database,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20'
            },
            {
              label: 'Network Latency',
              sub: 'Oracle Thin Protocol',
              val: `${diagnostics?.latency_ms || 0}ms`,
              icon: Activity,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
              border: 'border-amber-500/20'
            },
          ].map((kpi, i) => (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
            >
                <Card
                className="bg-card/40 border-border/40 shadow-2xl backdrop-blur-md group hover:border-primary/40 transition-all duration-500 relative overflow-hidden"
                >
                <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                    <div
                        className={cn(
                        'p-4 rounded-[1.25rem] border transition-all duration-500 shadow-inner group-hover:scale-110 group-hover:rotate-6',
                        kpi.bg,
                        kpi.color,
                        kpi.border
                        )}
                    >
                        <kpi.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge
                            variant="outline"
                            className="text-[8px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-500 bg-emerald-500/5 px-2 h-5"
                        >
                            Live_Stream
                        </Badge>
                        <span className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-tighter">Verified_Context</span>
                    </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-4xl font-black text-foreground tracking-tighter tabular-nums leading-none">
                        {typeof kpi.val === 'number' ? formatNumber(kpi.val) : kpi.val}
                        </div>
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black text-foreground/80 uppercase tracking-widest leading-relaxed">
                            {kpi.label}
                            </p>
                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">{kpi.sub}</p>
                        </div>
                    </div>
                    
                    {/* Background decoration */}
                    <div className={cn("absolute -right-4 -bottom-4 h-24 w-24 blur-3xl opacity-10 rounded-full transition-all duration-700 group-hover:scale-150 group-hover:opacity-20", kpi.bg.replace('/10', ''))} />
                </CardContent>
                </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid - Overhauled */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <DashboardWidget 
                title="SOCIOTECHNICAL_ENTITY_DISTRIBUTION" 
                icon={Database}
                description="High-level clustering of Seabed objects by functional submodel"
            >
              <div className="h-[450px] w-full pt-8">
                {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-30">
                        <RefreshCw className="animate-spin text-primary" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Calculating Projections...</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entityDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: '900', fill: 'hsl(var(--muted-foreground))' }}
                            angle={-45}
                            textAnchor="end"
                            dy={20}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground)/0.5)' }} 
                            dx={-10} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary)/0.03)' }} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40} animationDuration={1500}>
                        {entityDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                )}
              </div>
            </DashboardWidget>
          </div>

          <div className="lg:col-span-4">
            <DashboardWidget 
                title="OBJECT_TYPE_SPECIFICATION" 
                icon={Box}
                description="ProSource technical metadata breakdown"
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
                          fill={COLORS[(index + 2) % COLORS.length]}
                          opacity={0.9}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.4em] mb-1">
                    Signatures
                  </span>
                  <span className="text-5xl font-black text-foreground tracking-tighter">
                    {diagnostics?.entity_types?.length || 0}
                  </span>
                  <div className="mt-4 h-1 w-12 bg-primary/20 rounded-full" />
                </div>
              </div>
            </DashboardWidget>
          </div>

          <div className="lg:col-span-6">
            <DashboardWidget 
                title="UNSTRUCTURED_FORMAT_INDEX" 
                icon={FileText}
                description="Global index of knowledge objects by MIME type"
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
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fontWeight: '900', fill: 'hsl(var(--muted-foreground))' }}
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                      {diagnostics?.doc_formats?.map((_: any, index: number) => (
                        <Cell
                          key={`cell-doc-${index}`}
                          fill={COLORS[(index + 4) % COLORS.length]}
                          opacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardWidget>
          </div>

          <div className="lg:col-span-6">
            <DashboardWidget 
                title="SCHEMA_SOURCE_PROVENANCE" 
                icon={Globe}
                description="Data lineage roots across the enterprise"
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fontWeight: '900', fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis axisLine={false} tickLine={false} hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      radius={[8, 8, 0, 0]}
                      barSize={32}
                      fill="hsl(var(--primary))"
                      opacity={0.6}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardWidget>
          </div>
        </div>
        
        {/* Connection health footer */}
        <div className="flex items-center justify-between p-8 border border-border/40 rounded-[2.5rem] bg-card/20 backdrop-blur-sm">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Protocol_Healthy</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-foreground/60 tracking-widest leading-none mb-1">Session_Identity</span>
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                        {diagnostics?.driver_info || 'Oracle Thin Driver'} / Seabed Context
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="outline" className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-background hover:bg-muted transition-all active:scale-95 shadow-sm" onClick={() => refetch()}>
                    <RefreshCw size={14} /> Global_Rescan
                </Button>
            </div>
        </div>
      </div>
    </ScrollArea>
  )
}
