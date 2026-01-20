import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Waves, Map as MapIcon } from 'lucide-react'

interface OSDUSeismicViewProps {
  records: any[]
}

export const OSDUSeismicView: React.FC<OSDUSeismicViewProps> = ({ records }) => {
  const stats = useMemo(() => {
    const formats: Record<string, number> = {}

    records.forEach((r) => {
      const f = r.data?.ResourceSecurityClassification?.split(':').pop() || 'Unknown'
      formats[f] = (formats[f] || 0) + 1
    })

    return {
      count: records.length,
      formats: Object.entries(formats).map(([name, value]) => ({ name, value })),
    }
  }, [records])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-background/50 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Seismic Surveys
            </CardTitle>
            <Waves className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
          </CardContent>
        </Card>
        <Card className="bg-background/50 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Ecosystem Coverage
            </CardTitle>
            <MapIcon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              SDMS <span className="text-xs text-muted-foreground font-normal">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5 opacity-40">
        <Activity className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-bold">Seismic DDMS Visualization</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
          Specialized seismic trace viewing and SEG-Y header inspection coming soon.
        </p>
      </div>
    </div>
  )
}
