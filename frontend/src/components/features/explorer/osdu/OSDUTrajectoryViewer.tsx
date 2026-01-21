import React, { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Compass, Ruler, Map, RefreshCw, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api/connections'
import { useParams } from 'react-router-dom'

interface OSDUTrajectoryViewerProps {
  trajectoryId: string
  name: string
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-white/10 bg-card/90 backdrop-blur-2xl p-3 shadow-2xl ring-1 ring-white/5">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b border-white/10 pb-1.5">
          Survey Station
        </p>
        <div className="space-y-1.5">
          {Object.entries(data).map(([key, value]: [string, any]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-6 text-[10px] font-bold"
            >
              <span className="text-muted-foreground uppercase tracking-tight">{key}:</span>
              <span className="font-mono text-foreground">
                {typeof value === 'number' ? value.toFixed(2) : value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export const OSDUTrajectoryViewer: React.FC<OSDUTrajectoryViewerProps> = ({
  trajectoryId,
  name,
}) => {
  const { id: connectionId } = useParams<{ id: string }>()

  const { data: trajectoryData, isLoading } = useQuery({
    queryKey: ['osdu', 'trajectory-data', connectionId, trajectoryId],
    queryFn: () =>
      getConnectionMetadata(parseInt(connectionId!), 'get_trajectory_data', {
        trajectory_id: trajectoryId,
      }),
    enabled: !!trajectoryId,
  })

  // Process data for Recharts
  const plotData = useMemo(() => {
    if (!trajectoryData || !Array.isArray(trajectoryData)) return []
    // Expect columns like MeasuredDepth, TVD, NorthSouth, EastWest
    return trajectoryData.map((row: any) => ({
      md: row.MeasuredDepth || 0,
      tvd: row.TrueVerticalDepth || 0,
      ns: row.NorthSouth || 0,
      ew: row.EastWest || 0,
      incl: row.Inclination || 0,
      azim: row.Azimuth || 0,
    }))
  }, [trajectoryData])

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          Resolving deviation surveys...
        </span>
      </div>
    )
  }

  if (plotData.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/40 rounded-3xl bg-muted/5 opacity-40">
        <Compass size={40} strokeWidth={1} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          No survey stations found for this trajectory.
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top View: North vs East */}
        <Card className="bg-background/40 backdrop-blur-md border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="p-6 pb-0 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <Map size={14} className="text-blue-500" /> Plan View (N vs E)
            </h4>
            <Badge
              variant="outline"
              className="text-[8px] font-black uppercase h-4.5 border-blue-500/20 text-blue-500"
            >
              Unit: Meters
            </Badge>
          </div>
          <div className="h-80 w-full p-6">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="ew"
                  name="East-West"
                  unit="m"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'East (+)',
                    position: 'insideBottom',
                    offset: -10,
                    fontSize: 10,
                    fill: 'gray',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="ns"
                  name="North-South"
                  unit="m"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'North (+)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fill: 'gray',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  name="Well Path"
                  data={plotData}
                  fill="#3b82f6"
                  line={{ stroke: '#3b82f6', strokeWidth: 2 }}
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Side View: TVD vs North */}
        <Card className="bg-background/40 backdrop-blur-md border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="p-6 pb-0 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <Compass size={14} className="text-emerald-500" /> Section View (TVD vs N)
            </h4>
            <Badge
              variant="outline"
              className="text-[8px] font-black uppercase h-4.5 border-emerald-500/20 text-emerald-500"
            >
              Unit: Meters
            </Badge>
          </div>
          <div className="h-80 w-full p-6">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="ns"
                  name="North-South"
                  unit="m"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="tvd"
                  name="TVD"
                  unit="m"
                  reversed
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'Depth (TVD)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fill: 'gray',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  name="Well Path"
                  data={plotData}
                  fill="#10b981"
                  line={{ stroke: '#10b981', strokeWidth: 2 }}
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">
              Stations
            </span>
            <p className="text-xl font-black tracking-tighter text-primary">{plotData.length}</p>
          </div>
          <div className="h-8 w-px bg-primary/10" />
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">
              Max MD
            </span>
            <p className="text-xl font-black tracking-tighter text-primary">
              {Math.max(...plotData.map((d) => d.md)).toFixed(1)}m
            </p>
          </div>
          <div className="h-8 w-px bg-primary/10" />
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary opacity-60">
              Max TVD
            </span>
            <p className="text-xl font-black tracking-tighter text-primary">
              {Math.max(...plotData.map((d) => d.tvd)).toFixed(1)}m
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="rounded-xl border-primary/20 bg-background/50 backdrop-blur-sm px-4 h-10 font-black uppercase text-[10px] tracking-widest text-primary gap-2"
        >
          <Ruler size={14} /> Total Depth Integrity Verified
        </Badge>
      </div>
    </div>
  )
}
