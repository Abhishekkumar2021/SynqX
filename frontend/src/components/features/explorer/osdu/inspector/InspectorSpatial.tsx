import React, { useMemo, useState } from 'react'
import { Navigation, AlertTriangle, Info, Zap, MapPin, Layers, Download, Copy, CheckCircle2, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SpatialMap } from '@/components/common/SpatialMap'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface InspectorSpatialProps {
  record: any
  spatialData: { 
    point?: { lon: number; lat: number }
    geoJSON?: any
    source: string
    geometryType: string
    nodeCount: number
    isShape?: boolean
    warnings?: string[]
  } | null
}

export const InspectorSpatial: React.FC<InspectorSpatialProps> = ({ record, spatialData }) => {
  const [copied, setCopied] = useState<'coords' | 'geojson' | null>(null)

  const spatialMetrics = useMemo(() => {
    if (!spatialData) return null

    const source = spatialData.source || 'OSDU Meta'
    const isReprojected = source.includes('Reprojected')
    const isDeepSearch = source.includes('Deep Search')
    const isAsIngested = source.includes('As-Ingested')
    
    // Extract CRS info if reprojected
    let sourceCRS = null
    if (isReprojected) {
      const match = source.match(/from (.+)\)/)
      if (match) sourceCRS = match[1]
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'high'
    if (isDeepSearch || spatialData.warnings && spatialData.warnings.length > 2) {
      confidence = 'low'
    } else if (isAsIngested || spatialData.warnings && spatialData.warnings.length > 0) {
      confidence = 'medium'
    }

    return {
      source,
      isReprojected,
      isDeepSearch,
      isAsIngested,
      sourceCRS,
      confidence,
      geometryType: spatialData.geometryType || 'Unknown',
      nodeCount: spatialData.nodeCount || 0,
      isShape: spatialData.isShape || false,
      warnings: spatialData.warnings || []
    }
  }, [spatialData])

  const handleCopy = async (type: 'coords' | 'geojson') => {
    if (!spatialData?.point) return

    try {
      if (type === 'coords') {
        const coords = `${spatialData.point.lat.toFixed(6)}, ${spatialData.point.lon.toFixed(6)}`
        await navigator.clipboard.writeText(coords)
      } else {
        await navigator.clipboard.writeText(JSON.stringify(spatialData.geoJSON, null, 2))
      }
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = (format: 'geojson' | 'kml' | 'wkt') => {
    if (!spatialData?.geoJSON) return

    let content = ''
    let filename = ''
    let mimeType = ''

    const recordId = record.details?.id?.split(':').pop() || record.id?.split(':').pop() || 'spatial'

    if (format === 'geojson') {
      content = JSON.stringify(spatialData.geoJSON, null, 2)
      filename = `${recordId}.geojson`
      mimeType = 'application/geo+json'
    } else if (format === 'kml') {
      // Basic KML export (can be enhanced)
      content = convertToKML(spatialData.geoJSON, recordId)
      filename = `${recordId}.kml`
      mimeType = 'application/vnd.google-earth.kml+xml'
    } else if (format === 'wkt') {
      content = convertToWKT(spatialData.geoJSON)
      filename = `${recordId}.wkt`
      mimeType = 'text/plain'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const confidenceColors = {
    high: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
    medium: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
    low: 'text-rose-500 border-rose-500/20 bg-rose-500/5'
  }

  if (!spatialData || !spatialMetrics) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 gap-4 bg-background">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/50 border border-border/40">
          <MapPin size={32} />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            No Spatial Data
          </h3>
          <p className="text-xs text-muted-foreground/60 max-w-md">
            This record does not contain valid geographic coordinates or spatial metadata
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-8 gap-6 bg-background">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 relative">
            <Navigation size={20} />
            {spatialMetrics.warnings.length > 0 && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground leading-none">
                Spatial Intelligence
              </h3>
              {spatialMetrics.warnings.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help text-amber-500">
                        <AlertTriangle size={14} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-background border border-border p-3 max-w-sm">
                      <p className="text-[10px] font-black uppercase text-amber-500 mb-2 flex items-center gap-2">
                        <AlertTriangle size={12} /> Data Quality Warnings ({spatialMetrics.warnings.length})
                      </p>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {spatialMetrics.warnings.map((w, i) => (
                          <li key={i} className="text-[9px] leading-tight text-muted-foreground">• {w}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest">
                {spatialMetrics.geometryType} • WGS84
              </p>
              {spatialData.point && (
                <>
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCopy('coords')}
                          className="text-[10px] font-mono text-muted-foreground/80 hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          {spatialData.point.lat.toFixed(6)}, {spatialData.point.lon.toFixed(6)}
                          {copied === 'coords' ? (
                            <CheckCircle2 size={10} className="text-emerald-500" />
                          ) : (
                            <Copy size={10} className="opacity-0 group-hover:opacity-100" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-[10px] font-bold">Click to copy coordinates</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Confidence Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "h-6 text-[8px] font-black uppercase gap-1.5 transition-colors cursor-default",
                    confidenceColors[spatialMetrics.confidence]
                  )}
                >
                  {spatialMetrics.confidence === 'high' && <CheckCircle2 size={10} />}
                  {spatialMetrics.confidence === 'medium' && <Info size={10} />}
                  {spatialMetrics.confidence === 'low' && <AlertTriangle size={10} />}
                  {spatialMetrics.confidence} Confidence
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[10px] font-bold">Data quality assessment based on source and validation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Source Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "h-6 text-[8px] font-black uppercase gap-1.5 transition-colors cursor-default",
                    spatialMetrics.isReprojected ? "border-sky-500/20 text-sky-500 bg-sky-500/5" : 
                    spatialMetrics.isDeepSearch ? "border-purple-500/20 text-purple-500 bg-purple-500/5" :
                    spatialMetrics.isAsIngested ? "border-orange-500/20 text-orange-500 bg-orange-500/5" :
                    "border-indigo-500/20 text-indigo-500 bg-indigo-500/5"
                  )}
                >
                  {spatialMetrics.isReprojected && <Zap size={10} />}
                  {spatialMetrics.isDeepSearch && <Info size={10} />}
                  {spatialMetrics.isAsIngested && <Layers size={10} />}
                  {spatialMetrics.source.split('(')[0].trim()}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-[10px] font-bold mb-1">Metadata Origin</p>
                <p className="text-[9px] text-muted-foreground">{spatialMetrics.source}</p>
                {spatialMetrics.sourceCRS && (
                  <p className="text-[9px] text-sky-400 mt-1">Reprojected from: {spatialMetrics.sourceCRS}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Node Count Badge */}
          {spatialMetrics.nodeCount > 0 && (
            <Badge variant="outline" className="h-6 text-[8px] font-black uppercase border-border/40 bg-muted/20">
              {spatialMetrics.nodeCount.toLocaleString()} {spatialMetrics.isShape ? 'Vertices' : 'Point'}
            </Badge>
          )}

          {/* Download Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 text-[8px] font-black uppercase gap-1.5 px-2"
              >
                <Download size={12} />
                Export
                <ChevronDown size={10} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload('geojson')}>
                <span className="text-[10px] font-bold">GeoJSON</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('kml')}>
                <span className="text-[10px] font-bold">KML</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('wkt')}>
                <span className="text-[10px] font-bold">WKT</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopy('geojson')}>
                <span className="text-[10px] font-bold">
                  {copied === 'geojson' ? '✓ Copied!' : 'Copy GeoJSON'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl relative bg-muted/20">
        <SpatialMap
          latitude={spatialData.point?.lat}
          longitude={spatialData.point?.lon}
          geoJSON={spatialData.geoJSON}
          title={record.details?.id?.split(':').pop() || record.id?.split(':').pop()}
          description={record.details?.kind || record.kind}
          height="100%"
        />
        
        {/* Overlay Info */}
        {spatialMetrics.isShape && (
          <div className="absolute bottom-6 left-6 bg-background/95 backdrop-blur-sm border border-border/40 rounded-xl px-3 py-2 shadow-lg">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">
              Interactive Geometry • {spatialMetrics.nodeCount.toLocaleString()} Vertices
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to convert GeoJSON to KML (basic implementation)
function convertToKML(geoJSON: any, name: string): string {
  const coords = geoJSON.coordinates || geoJSON.features?.[0]?.geometry?.coordinates
  if (!coords) return ''

  const coordString = Array.isArray(coords[0]) 
    ? coords.map((c: number[]) => `${c[0]},${c[1]},0`).join(' ')
    : `${coords[0]},${coords[1]},0`

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <Placemark>
      <name>${name}</name>
      <Point>
        <coordinates>${coordString}</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`
}

// Helper function to convert GeoJSON to WKT (basic implementation)
function convertToWKT(geoJSON: any): string {
  const type = geoJSON.type || geoJSON.features?.[0]?.geometry?.type
  const coords = geoJSON.coordinates || geoJSON.features?.[0]?.geometry?.coordinates
  
  if (!coords) return ''

  if (type === 'Point') {
    return `POINT (${coords[0]} ${coords[1]})`
  } else if (type === 'LineString') {
    return `LINESTRING (${coords.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ')})`
  } else if (type === 'Polygon') {
    return `POLYGON ((${coords[0].map((c: number[]) => `${c[0]} ${c[1]}`).join(', ')}))`
  }
  
  return JSON.stringify(geoJSON)
}