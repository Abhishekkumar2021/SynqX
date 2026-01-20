import React from 'react'
import Map, { NavigationControl, Marker, Popup } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Database } from 'lucide-react'

interface SpatialMapProps {
  latitude: number
  longitude: number
  title?: string
  description?: string
  height?: string
}

export const SpatialMap: React.FC<SpatialMapProps> = ({
  latitude,
  longitude,
  title,
  description,
  height = '400px',
}) => {
  const [showPopup, setShowPopup] = React.useState(true)

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-border/40 shadow-xl relative group"
      style={{ height }}
    >
      <Map
        initialViewState={{
          longitude: longitude,
          latitude: latitude,
          zoom: 10,
        }}
        mapStyle="https://demotiles.maplibre.org/style.json"
      >
        <NavigationControl position="top-right" />

        <Marker
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            setShowPopup(true)
          }}
        >
          <div className="p-2 rounded-full bg-primary text-white shadow-lg shadow-primary/40 animate-bounce">
            <Database size={16} />
          </div>
        </Marker>

        {showPopup && (
          <Popup
            longitude={longitude}
            latitude={latitude}
            anchor="top"
            onClose={() => setShowPopup(false)}
            closeButton={false}
            className="z-50"
          >
            <div className="p-3 min-w-[150px]">
              <h4 className="text-xs font-black uppercase tracking-tight text-foreground">
                {title || 'Data Asset'}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                {description || 'Spatial coordinate context'}
              </p>
              <div className="mt-2 pt-2 border-t border-border/10 flex items-center gap-2">
                <code className="text-[9px] font-mono opacity-40">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </code>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 pointer-events-none border-2 border-primary/5 rounded-2xl" />
    </div>
  )
}
