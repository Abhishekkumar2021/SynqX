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
import { formatNumber } from '@/lib/utils'

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Partition Sovereignty Bar Chart */}
      <motion.div variants={itemVariants} className="lg:col-span-8 min-h-0 min-w-0">
        <DashboardWidget
          title="Authority Sovereignty"
          description="Entity schema distribution per verified authority domain"
          className="h-full glass-card"
        >
          <div className="h-[400px] w-full mt-6 min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sovereigntyData} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.GRID} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.TEXT, fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.TEXT, fontSize: 11, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
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
        </DashboardWidget>
      </motion.div>

      {/* Domain Composition Pie Chart */}
      <motion.div variants={itemVariants} className="lg:col-span-4 min-h-0 min-w-0">
        <DashboardWidget
          title="Functional Groups"
          description="Mapping of entity functional classifications"
          className="h-full glass-card"
        >
          <div className="h-[400px] w-full mt-6 relative min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <Pie
                  data={compositionData}
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={5}
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
              <span className="subtitle opacity-70">Registered</span>
              <span className="text-4xl font-black text-foreground mt-1">{totalKinds}</span>
            </div>
          </div>
        </DashboardWidget>
      </motion.div>

      {/* Source Provenance Bar Chart */}
      <motion.div variants={itemVariants} className="lg:col-span-12 min-h-0 min-w-0">
        <DashboardWidget
          title="Schema Origin Provenance"
          description="Distribution of registry definition sources across the partition"
          className="glass-card"
        >
          <div className="h-[350px] w-full mt-6 min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={provenanceData}
                layout="vertical"
                margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.GRID} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.TEXT, fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.TEXT, fontSize: 12, fontWeight: 700 }}
                  width={120}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.GRID }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
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
        </DashboardWidget>
      </motion.div>
    </div>
  )
}
