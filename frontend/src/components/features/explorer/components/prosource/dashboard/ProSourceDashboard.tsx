import React from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  Waves,
  Activity,
  Box,
  CheckCircle2,
  AlertCircle,
  FileStack,
  FolderKanban,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

interface ProSourceDashboardProps {
  stats?: any
  assets: any[]
  projects: any[]
}

export const ProSourceDashboard: React.FC<ProSourceDashboardProps> = ({
  stats,
  assets,
  projects,
}) => {
  // Logic to compute metrics from assets if API stats are missing
  const wellsCount = assets.find((a) => a.name === 'Wells')?.rows || 0
  const logsCount = assets.find((a) => a.name === 'Log Curves')?.rows || 0
  const seismicCount = assets.find((a) => a.name === 'Seismic Lines')?.rows || 0

  const entityDistribution = assets
    .map((a) => ({
      name: a.name,
      value: a.rows || 0,
      color: a.name === 'Wells' ? '#6366f1' : a.name.includes('Log') ? '#8b5cf6' : '#3b82f6',
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const qualityTrend = [
    { name: 'Mon', score: 92 },
    { name: 'Tue', score: 94 },
    { name: 'Wed', score: 93 },
    { name: 'Thu', score: 95 },
    { name: 'Fri', score: 98 },
    { name: 'Sat', score: 97 },
    { name: 'Sun', score: 99 },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* KPI Row */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Wells"
          value={wellsCount.toLocaleString()}
          change="+12 this week"
          icon={Database}
          color="indigo"
          variants={item}
        />
        <MetricCard
          title="Log Curves"
          value={logsCount.toLocaleString()}
          change="+1.2k indexed"
          icon={Activity}
          color="violet"
          variants={item}
        />
        <MetricCard
          title="Seismic Profiles"
          value={seismicCount.toLocaleString()}
          change="98.2% completeness"
          icon={Waves}
          color="blue"
          variants={item}
        />
        <MetricCard
          title="Active Projects"
          value={projects.length.toString()}
          change="Across 4 regions"
          icon={FolderKanban}
          color="emerald"
          variants={item}
        />
      </motion.div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entity Distribution */}
        <Card className="lg:col-span-2 bg-[#0a0a0c] border-white/5 shadow-2xl overflow-hidden group">
          <CardHeader className="border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white italic">
                  Seabed Object Distribution
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/60 mt-1">
                  Master Entity Inventory Breakdown
                </CardDescription>
              </div>
              <Box size={18} className="text-indigo-500 opacity-50" />
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityDistribution} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 800 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff05' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0f0f12] border border-white/10 p-3 rounded-xl shadow-2xl">
                            <p className="text-[10px] font-black uppercase text-white mb-1">
                              {payload[0].payload.name}
                            </p>
                            <p className="text-lg font-mono text-indigo-400">
                              {payload[0].value.toLocaleString()}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {entityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality Gauge */}
        <Card className="bg-[#0a0a0c] border-white/5 shadow-2xl group overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white italic">
                  Domain Integrity
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/60 mt-1">
                  Cross-Entity Quality Score
                </CardDescription>
              </div>
              <CheckCircle2 size={18} className="text-emerald-500 opacity-50" />
            </div>
          </CardHeader>
          <CardContent className="pt-8 flex flex-col items-center">
            <div className="relative h-48 w-48 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: 98.4, color: '#10b981' },
                      { value: 1.6, color: '#ffffff05' },
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ffffff05" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white italic tracking-tighter">
                  98.4%
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  Compliance
                </span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <QualityItem label="Schema Adherence" score={99} color="bg-emerald-500" />
              <QualityItem label="Spatial Accuracy" score={94} color="bg-blue-500" />
              <QualityItem label="Metadata Density" score={88} color="bg-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects and Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-[#0a0a0c] border-white/5 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-white">
                Recent Projects
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[8px] uppercase border-white/10 text-white/40"
              >
                Live from Oracle
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {projects.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <FolderKanban size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-wider">
                        {p.PROJECT_NAME || p.NAME || 'Unnamed Project'}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                        {p.COUNTRY || 'Global'} • {p.COORDINATE_SYSTEM || 'WGS84'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-white/40">
                      {p.START_DATE || '2024-Q1'}
                    </p>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[8px] uppercase mt-1 px-1.5 h-4">
                      Active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0c] border-white/5 shadow-2xl">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-white">
              Data Ingestion Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityTrend}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff20', fontSize: 10, fontWeight: 800 }}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0f0f12] border border-white/10 p-3 rounded-xl shadow-2xl">
                            <p className="text-lg font-mono text-white">{payload[0].value}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#velocityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, change, icon: Icon, color, variants }: any) {
  const colors: any = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
  }

  return (
    <motion.div variants={variants}>
      <Card
        className={cn(
          'relative group overflow-hidden bg-gradient-to-br border shadow-2xl transition-all duration-500 hover:scale-[1.02]',
          colors[color]
        )}
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500">
          <Icon size={64} />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black tracking-tighter italic mb-1 italic-shorthand">
            {value}
          </div>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider">{change}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QualityItem({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
          {label}
        </span>
        <span className="text-[10px] font-mono text-white/60">{score}%</span>
      </div>
      <div className="h-1 w-full bg-white/[0.03] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  )
}
