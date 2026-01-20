import React from 'react'
import { Navigation } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SpatialMap } from '@/components/common/SpatialMap'

interface InspectorSpatialProps {
  record: any
  coordinates: { lon: number; lat: number } | null
}

export const InspectorSpatial: React.FC<InspectorSpatialProps> = ({ record, coordinates }) => {
  return (
    <div className="h-full flex flex-col p-8 gap-6 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Navigation size={20} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground leading-none">
              Spatial Intelligence
            </h3>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
              WGS84 Reference Frame
            </p>
          </div>
        </div>
        <Badge className="bg-indigo-600 text-white border-none font-black h-6 uppercase tracking-[0.2em] text-[8px] px-3 shadow-lg shadow-indigo-600/20">
          Verified_Geometric_Context
        </Badge>
      </div>
      <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl relative">
        {coordinates && (
          <SpatialMap
            latitude={coordinates.lat}
            longitude={coordinates.lon}
            title={record.details.id.split(':').pop()}
            description={record.details.kind}
            height="100%"
          />
        )}
      </div>
    </div>
  )
}
