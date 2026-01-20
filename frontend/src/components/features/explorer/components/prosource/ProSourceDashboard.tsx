import React, { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import {
  Database,
  HardDrive,
  Layers,
  ShieldCheck,
  Activity,
  Globe,
  FileText,
  Box,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { data: diagnostics, isLoading } = useQuery({
    queryKey: ['prosource', 'diagnostics', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_dashboard_diagnostics'),
  })

  const totalDocs = useMemo(
    () => diagnostics?.doc_formats?.reduce((acc: number, curr: any) => acc + curr.VALUE, 0) || 0,
    [diagnostics]
  )

  return (
    <ScrollArea className="h-full bg-muted/5">
      <div className="p-8 max-w-[1800px] mx-auto space-y-8 pb-32">
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Schema Objects',
              val: assets.length,
              icon: Layers,
              color: 'text-indigo-500',
              bg: 'bg-indigo-500/10',
            },
            {
              label: 'Unstructured Files',
              val: totalDocs,
              icon: FileText,
              color: 'text-rose-500',
              bg: 'bg-rose-500/10',
            },
            {
              label: 'Domain Clusters',
              val: Object.keys(diagnostics?.domain_counts || {}).length,
              icon: Database,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
            },
            {
              label: 'Active Sessions',
              val: 'Active',
              icon: Activity,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
            },
          ].map((kpi, i) => (
            <Card
              key={i}
              className="bg-background/50 border-border/40 shadow-sm group hover:border-primary/30 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl border',
                      kpi.bg,
                      kpi.color,
                      kpi.color.replace('text-', 'border-').replace('500', '500/20')
                    )}
                  >
                    <kpi.icon size={20} />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-black uppercase border-border/40"
                  >
                    Real-time
                  </Badge>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tighter">
                  {typeof kpi.val === 'number' ? formatNumber(kpi.val) : kpi.val}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">
                  {kpi.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <DashboardWidget title="Entity Distribution by Functional Module" icon={Database}>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(diagnostics?.domain_counts || {}).map(([name, value]) => ({
                      name,
                      value,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dx={-10} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                      {Object.keys(diagnostics?.domain_counts || {}).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardWidget>
          </div>

          <div className="lg:col-span-4">
            <DashboardWidget title="Object Type Breakdown" icon={Box}>
              <div className="h-[400px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diagnostics?.entity_types?.map((t: any) => ({
                        name: t.LABEL,
                        value: t.VALUE,
                      }))}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {diagnostics?.entity_types?.map((_: any, index: number) => (
                        <Cell
                          key={`cell-pie-${index}`}
                          fill={COLORS[(index + 2) % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                    Typed
                  </span>
                  <span className="text-4xl font-black text-foreground">
                    {diagnostics?.entity_types?.length || 0}
                  </span>
                </div>
              </div>
            </DashboardWidget>
          </div>

          <div className="lg:col-span-6">
            <DashboardWidget title="Unstructured Format Distribution" icon={FileText}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={diagnostics?.doc_formats?.map((f: any) => ({
                      name: f.LABEL,
                      value: f.VALUE,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 'bold' }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {diagnostics?.doc_formats?.map((_: any, index: number) => (
                        <Cell
                          key={`cell-doc-${index}`}
                          fill={COLORS[(index + 4) % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardWidget>
          </div>

          <div className="lg:col-span-6">
            <DashboardWidget title="Schema Source Provenance" icon={Globe}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={diagnostics?.schema_sources?.map((s: any) => ({
                      name: s.LABEL,
                      value: s.VALUE,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fontWeight: 'bold' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                      fill="#6366f1"
                      opacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardWidget>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
