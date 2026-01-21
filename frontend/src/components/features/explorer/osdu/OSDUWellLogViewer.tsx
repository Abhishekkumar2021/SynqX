import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { FileDigit, Ruler, Activity, Loader2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api/connections'
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface OSDUWellLogViewerProps {
  welllogId: string
  name: string
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-card/90 backdrop-blur-2xl p-3 shadow-2xl ring-1 ring-white/5">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b border-white/10 pb-1.5">
          Depth: {label}m
        </p>
        <div className="space-y-1.5">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6 text-[10px] font-bold">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-muted-foreground uppercase tracking-tight">{p.name}:</span>
              </div>
              <span className="font-mono text-foreground">
                {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export const OSDUWellLogViewer: React.FC<OSDUWellLogViewerProps> = ({ welllogId, name }) => {
  const { id: connectionId } = useParams<{ id: string }>()

  const { data: logData, isLoading } = useQuery({
    queryKey: ['osdu', 'welllog-data', connectionId, welllogId],
    queryFn: () =>
      getConnectionMetadata(parseInt(connectionId!), 'get_log_data', {
        welllog_id: welllogId,
      }),
    enabled: !!welllogId,
  })

  // Determine available curves (excluding common depth columns)
  const curves = useMemo(() => {
    if (!logData || !Array.isArray(logData) || logData.length === 0) return []
    const keys = Object.keys(logData[0])
    return keys.filter((k) => !['MD', 'DEPTH', 'Depth', 'MeasuredDepth', 'index'].includes(k))
  }, [logData])

  const depthKey = useMemo(() => {
    if (!logData || !Array.isArray(logData) || logData.length === 0) return 'MD'
    const keys = Object.keys(logData[0])
    return keys.find((k) => ['MD', 'DEPTH', 'Depth', 'MeasuredDepth'].includes(k)) || 'MD'
  }, [logData])

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-40">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          Streaming WDMS curve data...
        </span>
      </div>
    )
  }

  if (!logData || logData.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/40 rounded-3xl bg-muted/5 opacity-40">
        <FileDigit size={40} strokeWidth={1} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          No curve data available for this log.
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-background/40 backdrop-blur-md border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="p-6 pb-0 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <Activity size={14} className="text-primary" /> Multi-Curve Analysis
            </h4>
            <div className="flex gap-2">
              {curves.slice(0, 4).map((c, i) => (
                <Badge
                  key={c}
                  variant="outline"
                  className={cn(
                    'text-[8px] font-black uppercase h-4.5',
                    i === 0 ? 'border-indigo-500/20 text-indigo-500' : 'opacity-40'
                  )}
                >
                  {c}
                </Badge>
              ))}
              {curves.length > 4 && (
                <Badge
                  variant="outline"
                  className="text-[8px] font-black uppercase h-4.5 opacity-40"
                >
                  +{curves.length - 4}
                </Badge>
              )}
            </div>
          </div>
          <div className="h-[500px] w-full p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={logData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey={depthKey}
                  type="number"
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'gray' }}
                  label={{
                    value: 'Depth (m)',
                    position: 'insideBottom',
                    offset: -10,
                    fontSize: 10,
                    fill: 'gray',
                    fontWeight: 'bold',
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'gray' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    paddingTop: '20px',
                  }}
                />
                {curves.slice(0, 5).map((curve, idx) => (
                  <Line
                    key={curve}
                    type="monotone"
                    dataKey={curve}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">
              Sample Points
            </span>
            <p className="text-xl font-black tracking-tighter text-primary">
              {logData.length.toLocaleString()}
            </p>
          </div>
          <div className="h-8 w-px bg-primary/10" />
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">
              Curves
            </span>
            <p className="text-xl font-black tracking-tighter text-primary">{curves.length}</p>
          </div>
          <div className="h-8 w-px bg-primary/10" />
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">
              Interval
            </span>
            <p className="text-xl font-black tracking-tighter text-primary">
              {Math.abs(logData[logData.length - 1][depthKey] - logData[0][depthKey]).toFixed(1)}m
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="rounded-xl border-primary/20 bg-background/50 backdrop-blur-sm px-4 h-10 font-black uppercase text-[10px] tracking-widest text-primary gap-2"
          >
            <Info size={14} /> WDMS Stream v3.0 Ready
          </Badge>
        </div>
      </div>
    </div>
  )
}

import { RefreshCw } from 'lucide-react'
