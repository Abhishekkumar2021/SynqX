import React from 'react'
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
import { motion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'
import { DashboardWidget } from '@/components/features/dashboard/DashboardWidget'
import { cn, formatNumber } from '@/lib/utils'

interface DashboardChartsProps {
  sovereigntyData: any[]
  compositionData: any[]
  provenanceData: any[]
  totalKinds: number
  itemVariants: any
}

const getThemeColors = (theme: string | undefined) => {
  const isDark = theme === 'dark'
  return {
    GRID: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    TEXT: isDark ? '#94a3b8' : '#64748b', // Slate-400 / Slate-500
    CHART_COLORS: isDark
      ? ['#818cf8', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf']
      : ['#4f46e5', '#10b981', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#db2777', '#0d9488'],
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-4 rounded-xl z-[1000]">
        <p className="subtitle mb-2 pb-2 border-b border-border/50">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shadow-[0_0_8px]"
                  style={{ backgroundColor: p.color || p.fill }}
                />
                <span className="text-xs font-bold text-foreground">{p.name}</span>
              </div>
              <span className="text-xs font-black text-foreground">{formatNumber(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  sovereigntyData,
  compositionData,
  provenanceData,
  totalKinds,
  itemVariants,
}) => {
  const { theme } = useTheme()
  const colors = getThemeColors(theme)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Partition Sovereignty Bar Chart */}
      <motion.div variants={itemVariants} className="lg:col-span-8 min-h-0 min-w-0">
        <DashboardWidget
          title="Authority Sovereignty"
          description="Schema distribution per authority domain"
          className="h-full glass-card"
        >
          {({ isMaximized }) => (
            <div
              className={cn(
                'w-full mt-4 min-h-0 min-w-0',
                isMaximized ? 'h-full pb-10' : 'h-[300px]'
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sovereigntyData}
                  margin={{ top: 10, right: 30, bottom: 10, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.GRID} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.TEXT, fontSize: isMaximized ? 12 : 10, fontWeight: 600 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.TEXT, fontSize: isMaximized ? 12 : 10, fontWeight: 600 }}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={isMaximized ? 64 : 32}>
                    {sovereigntyData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors.CHART_COLORS[index % colors.CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashboardWidget>
      </motion.div>

      {/* Domain Composition Pie Chart */}
      <motion.div variants={itemVariants} className="lg:col-span-4 min-h-0 min-w-0">
        <DashboardWidget
          title="Functional Groups"
          description="Entity classification mapping"
          className="h-full glass-card"
        >
          {({ isMaximized }) => (
            <div
              className={cn(
                'w-full mt-4 relative min-h-0 min-w-0',
                isMaximized ? 'h-full pb-10' : 'h-[300px]'
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <Pie
                    data={compositionData}
                    innerRadius={isMaximized ? 140 : 70}
                    outerRadius={isMaximized ? 200 : 100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {compositionData.map((_, index) => (
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
                <span
                  className={cn(
                    'font-black uppercase text-muted-foreground/50 tracking-widest leading-none',
                    isMaximized ? 'text-sm' : 'text-[9px]'
                  )}
                >
                  Total
                </span>
                <span
                  className={cn(
                    'font-black text-foreground mt-1 tracking-tighter',
                    isMaximized ? 'text-5xl' : 'text-3xl'
                  )}
                >
                  {totalKinds}
                </span>
              </div>
            </div>
          )}
        </DashboardWidget>
      </motion.div>

      {/* Source Provenance Bar Chart */}
      <motion.div variants={itemVariants} className="lg:col-span-12 min-h-0 min-w-0">
        <DashboardWidget
          title="Origin Provenance"
          description="Registry definition sources across the partition"
          className="glass-card"
        >
          {({ isMaximized }) => (
            <div
              className={cn(
                'w-full mt-4 min-h-0 min-w-0',
                isMaximized ? 'h-full pb-10' : 'h-[280px]'
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={provenanceData}
                  layout="vertical"
                  margin={{ top: 10, right: 40, left: 40, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.GRID} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.TEXT, fontSize: isMaximized ? 12 : 10, fontWeight: 600 }}
                    dy={5}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.TEXT, fontSize: isMaximized ? 14 : 11, fontWeight: 700 }}
                    width={isMaximized ? 150 : 100}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={isMaximized ? 48 : 24}>
                    {provenanceData.map((_, index) => (
                      <Cell
                        key={`cell-prov-${index}`}
                        fill={colors.CHART_COLORS[(index + 4) % colors.CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashboardWidget>
      </motion.div>
    </div>
  )
}
