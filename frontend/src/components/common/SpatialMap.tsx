import React, { useMemo, useState, useEffect, useRef } from 'react'
import Globe from 'react-globe.gl'
import Map, { NavigationControl, Marker, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { 
  Database, 
  Globe as GlobeIcon, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Search as SearchIcon,
  Navigation,
  MapPin,
  Mountain,
  Loader2,
  X,
  Cuboid
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { calculateGeoContext } from '@/lib/osdu-spatial'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SpatialMapProps {
  latitude?: number
  longitude?: number
  geoJSON?: any 
  title?: string
  description?: string
  height?: string
  allowFullscreen?: boolean
}

export const SpatialMap: React.FC<SpatialMapProps> = ({
  latitude,
  longitude,
  geoJSON,
  title,
  description,
  height = '500px',
  allowFullscreen = true
}) => {
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 })
  const [globeAltitude, setGlobeAltitude] = useState(0.4)
  const [mapZoom, setMapZoom] = useState(12)
  
  // Intelligence States
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [inspectedPoint, setInspectedPoint] = useState<{ lat: number, lng: number, address?: string, elevation?: string } | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)

  const mapRef = useRef<any>(null)
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const isDark = theme === 'dark'

  // --- Resize Observer ---
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // --- Search & Inspection ---
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data && data[0]) {
        const { lat, lon, display_name } = data[0]
        const coords = { lat: parseFloat(lat), lng: parseFloat(lon) }
        if (viewMode === 'globe' && globeRef.current) {
          globeRef.current.pointOfView({ ...coords, altitude: 0.5 }, 2000)
        } else if (mapRef.current) {
          mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 12, duration: 2000 })
        }
        setInspectedPoint({ ...coords, address: display_name })
      }
    } catch (err) {
      console.error('Geocoding failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleMapClick = async (e: any) => {
    const lng = e.lngLat ? e.lngLat.lng : e.lng
    const lat = e.lngLat ? e.lngLat.lat : e.lat
    setInspectedPoint({ lat, lng })
    setIsInspecting(true)
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const geoData = await geoRes.json()
      const elevRes = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`)
      const elevData = await elevRes.json()
      setInspectedPoint(prev => prev ? ({
        ...prev,
        address: geoData.display_name,
        elevation: elevData.results?.[0]?.elevation ? `${elevData.results[0].elevation}m` : 'Unknown'
      }) : null)
    } catch (err) {
      console.error('Point inspection failed', err)
    } finally {
      setIsSearching(false)
      setIsInspecting(false)
    }
  }

  // --- View Control ---
  const resetView = () => {
    if (viewMode === 'globe' && globeRef.current && geoContext) {
      globeRef.current.pointOfView({ lat: geoContext.centerLat, lng: geoContext.centerLon, altitude: geoContext.hasShape ? 1.2 : 0.4 }, 1000)
    } else if (viewMode === 'map' && mapRef.current && geoContext) {
      mapRef.current.flyTo({ center: [geoContext.centerLon, geoContext.centerLat], zoom: latitude !== undefined ? 12 : 6, duration: 1000 })
    }
  }

  const zoomIn = () => {
    if (viewMode === 'globe' && globeRef.current) {
      const pov = globeRef.current.pointOfView()
      globeRef.current.pointOfView({ ...pov, altitude: Math.max(0.1, pov.altitude - 0.2) }, 500)
    } else if (mapRef.current) mapRef.current.zoomIn()
  }

  const zoomOut = () => {
    if (viewMode === 'globe' && globeRef.current) {
      const pov = globeRef.current.pointOfView()
      globeRef.current.pointOfView({ ...pov, altitude: Math.min(3, pov.altitude + 0.2) }, 500)
    } else if (mapRef.current) mapRef.current.zoomOut()
  }

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return
    try {
      if (!isFullscreen) await fullscreenRef.current.requestFullscreen()
      else if (document.exitFullscreen) await document.exitFullscreen()
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFs)
    return () => document.removeEventListener('fullscreenchange', handleFs)
  }, [])

  const geoContext = useMemo(() => {
    if (latitude !== undefined && longitude !== undefined) {
      return {
        centerLat: latitude,
        centerLon: longitude,
        bounds: [longitude - 0.01, latitude - 0.01, longitude + 0.01, latitude + 0.01] as [number, number, number, number],
        points: [{ lat: latitude, lng: longitude, name: title }],
        hasShape: false
      }
    }
    const context = calculateGeoContext(geoJSON)
    if (!context) return null
    return { ...context, points: !context.hasShape ? [{ lat: context.centerLat, lng: context.centerLon, name: title }] : [] }
  }, [geoJSON, latitude, longitude, title])

  const mapStyle = useMemo(() => isDark 
    ? 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json', [isDark])

  const stats = useMemo(() => {
    if (!geoJSON) return null
    const features = geoJSON.features || [geoJSON]
    const polygons = features.filter((f: any) => f.geometry?.type.includes('Polygon')).length
    const lines = features.filter((f: any) => f.geometry?.type.includes('LineString')).length
    const points = features.filter((f: any) => f.geometry?.type === 'Point').length
    return { polygons, lines, points, total: features.length }
  }, [geoJSON])

  const containerHeight = isFullscreen ? '100vh' : height

  return (
    <div
      ref={fullscreenRef}
      className={cn(
        "relative group bg-background transition-all duration-500",
        isFullscreen ? "fixed inset-0 z-[200]" : "w-full rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl"
      )}
      style={{ height: containerHeight }}
    >
      <div ref={containerRef} className="w-full h-full relative">
        {viewMode === 'globe' ? (
          <div className="w-full h-full animate-in fade-in duration-700">
            <Globe
              ref={globeRef}
              width={containerSize.width}
              height={containerSize.height}
              globeImageUrl={isDark ? "//unpkg.com/three-globe/example/img/earth-dark.jpg" : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"}
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl={isDark ? "//unpkg.com/three-globe/example/img/night-sky.png" : undefined}
              backgroundColor="rgba(0,0,0,0)"
              showAtmosphere atmosphereColor={isDark ? "#3b82f6" : "#60a5fa"} atmosphereAltitude={0.15}
              onGlobeClick={handleMapClick}
              polygonsData={geoJSON?.features?.filter((f: any) => f.geometry.type.includes('Polygon')) || []}
              polygonCapColor={() => isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.5)'}
              polygonSideColor={() => 'rgba(79, 70, 229, 0.1)'}
              polygonStrokeColor={() => '#4f46e5'}
              polygonLabel={(d: any) => `
                <div class="p-3 bg-card/95 border border-border/40 rounded-xl shadow-2xl backdrop-blur-md">
                  <b class="text-[11px] uppercase text-primary tracking-widest">${title || 'Discovery Area'}</b>
                  <div class="text-[10px] opacity-60 mt-1 font-bold">${d.properties?.FieldName || d.properties?.LineName || ''}</div>
                </div>
              `}
              pathsData={geoJSON?.features?.filter((f: any) => f.geometry.type.includes('LineString')).flatMap((f: any) => {
                const coords = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates.flat(1) : f.geometry.coordinates;
                return [{ coords: coords.map((c: any) => [c[1], c[0]]), name: f.properties?.LineName || 'Seismic Trace' }]
              }) || []}
              pathColor={() => isDark ? '#818cf8' : '#4f46e5'}
              pathDashLength={0.01} pathDashGap={0.004} pathDashAnimateTime={4000} pathStroke={3}
              pointsData={inspectedPoint ? [...(geoContext?.points || []), inspectedPoint] : (geoContext?.points || [])}
              pointColor={(d: any) => d === inspectedPoint ? '#10b981' : '#f43f5e'}
              pointAltitude={0.08} pointRadius={0.6}
              pointLabel={(d: any) => `
                <div class="p-3 bg-card/95 border border-border/40 rounded-xl shadow-2xl backdrop-blur-md">
                  <b class="text-[11px] uppercase ${d === inspectedPoint ? 'text-emerald-500' : 'text-rose-500'} tracking-widest">${d === inspectedPoint ? 'Target Location' : (d.name || 'Active Well')}</b>
                  <div class="text-[9px] opacity-40 mt-1 font-mono">${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}</div>
                </div>
              `}
            />
          </div>
        ) : (
          <div className="w-full h-full animate-in fade-in duration-500">
            <Map
              ref={mapRef}
              initialViewState={{ longitude: geoContext?.centerLon ?? 0, latitude: geoContext?.centerLat ?? 0, zoom: latitude !== undefined ? 12 : 6 }}
              mapStyle={mapStyle}
              style={{ width: '100%', height: '100%' }}
              onZoom={(e) => setMapZoom(e.viewState.zoom)}
              onClick={handleMapClick}
            >
              <NavigationControl position="top-right" showCompass />
              {geoJSON && (
                <Source type="geojson" data={geoJSON}>
                  <Layer id="poly-fill" type="fill" paint={{ 'fill-color': '#6366f1', 'fill-opacity': 0.2 }} filter={['==', '$type', 'Polygon']} />
                  <Layer id="poly-line" type="line" paint={{ 'line-color': '#4f46e5', 'line-width': 2.5 }} />
                </Source>
              )}
              {(latitude !== undefined && longitude !== undefined) && (
                <Marker longitude={longitude} latitude={latitude} anchor="bottom">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                    <div className="p-2.5 rounded-full bg-primary text-white shadow-2xl relative z-10 border-2 border-white/20 hover:scale-110 transition-transform cursor-pointer">
                      <Database size={18} />
                    </div>
                  </div>
                </Marker>
              )}
              {inspectedPoint && (
                <Marker longitude={inspectedPoint.lng} latitude={inspectedPoint.lat} anchor="bottom">
                  <div className="p-2 rounded-full bg-emerald-500 text-white shadow-xl animate-bounce border-2 border-white/40">
                    <MapPin size={16} />
                  </div>
                </Marker>
              )}
            </Map>
          </div>
        )}

        {/* --- Unified Header Control --- */}
        <div className="absolute top-6 left-6 right-6 z-40 flex items-center justify-between pointer-events-none">
          <div className="p-1 rounded-2xl bg-background/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex pointer-events-auto">
            <Button
              variant="ghost" size="sm"
              onClick={() => setViewMode('map')}
              className={cn("h-9 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2 transition-all", viewMode === 'map' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-muted/50")}
            >
              <Layers size={14} /> 2D
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setViewMode('globe')}
              className={cn("h-9 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2 transition-all", viewMode === 'globe' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-muted/50")}
            >
              <Cuboid size={14} /> 3D
            </Button>
          </div>

          <div className="flex-1 max-w-md mx-8 pointer-events-auto">
            <form onSubmit={handleSearch} className="relative group/search">
              <div className="relative flex items-center bg-background/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl h-11 px-4 overflow-hidden">
                <SearchIcon size={16} className="text-muted-foreground mr-3" />
                <input
                  type="text" placeholder="Search coordinates..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none flex-1 text-sm font-bold placeholder:text-muted-foreground/40"
                />
                <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 text-primary">
                  {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                </Button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex p-1 rounded-2xl bg-background/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
              <Button variant="ghost" size="icon" onClick={zoomIn} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary transition-colors"><ZoomIn size={16} /></Button>
              <Button variant="ghost" size="icon" onClick={zoomOut} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary transition-colors"><ZoomOut size={16} /></Button>
              <Button variant="ghost" size="icon" onClick={resetView} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary transition-colors"><RotateCcw size={16} /></Button>
              {allowFullscreen && (
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary transition-colors">
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* --- Intel Panel (Bottom Left) --- */}
        {inspectedPoint && (
          <div className="absolute bottom-6 left-6 z-40 w-[320px] animate-in slide-in-from-left-4 duration-500">
            <div className="bg-background/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                    <MapPin size={10} /> Location Intel
                  </span>
                  <button onClick={() => setInspectedPoint(null)} className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"><X size={14} /></button>
                </div>
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">Global Address</h5>
                  <p className="text-xs font-bold leading-relaxed line-clamp-2">{isInspecting ? 'Triangulating...' : (inspectedPoint.address || 'Standard Reference Frame')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-muted/30 border border-white/5">
                    <div className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1">Elevation</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <Mountain size={12} className="text-primary" />
                      {isInspecting ? '...' : (inspectedPoint.elevation || 'Calc...')}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30 border border-white/5">
                    <div className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1">CRS Origin</div>
                    <div className="text-[10px] font-bold font-mono">WGS84_GEO</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 right-6 z-30 pointer-events-none text-right">
          <h4 className="text-[14px] font-black text-foreground tracking-tighter uppercase leading-none">SynqX Spatial</h4>
          <p className="text-[8px] font-black text-muted-foreground/40 tracking-[0.3em] uppercase mt-1">Enterprise WebGL v4</p>
        </div>
      </div>
    </div>
  )
}
