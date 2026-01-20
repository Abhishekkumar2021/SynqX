import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Map as MapIcon,
  Search,
  Filter,
  LocateFixed,
  Layers,
  Maximize2,
  Compass,
  Globe,
  MapPin,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProSourceSpatialViewProps {
  connectionId: number
  onSelectRecord: (id: string) => void
}

export const ProSourceSpatialView: React.FC<ProSourceSpatialViewProps> = ({
  connectionId,
  onSelectRecord,
}) => {
  const [activeLayer, setActiveTab] = useState('wells')

  return (
    <div className="h-full flex overflow-hidden bg-[#020203]">
      {/* Map Control Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-black/20 flex flex-col shrink-0">
        <div className="p-6 space-y-8 flex-1 overflow-auto no-scrollbar">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Regional Context
            </h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                placeholder="Search region or basin..."
                className="pl-9 h-10 bg-white/[0.03] border-white/5 rounded-xl text-xs font-medium focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Data Layers
            </h3>
            <div className="space-y-2">
              <LayerButton
                label="Wells & Wellbores"
                count={1420}
                isActive={activeLayer === 'wells'}
                onClick={() => setActiveTab('wells')}
                color="emerald"
              />
              <LayerButton
                label="Seismic Surveys"
                count={84}
                isActive={activeLayer === 'seismic'}
                onClick={() => setActiveTab('seismic')}
                color="blue"
              />
              <LayerButton
                label="Licence Blocks"
                count={12}
                isActive={activeLayer === 'licence'}
                onClick={() => setActiveTab('licence')}
                color="indigo"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Coordinate Reference
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white/40 uppercase">Global System</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono border-white/10 text-emerald-400 h-5 px-1.5"
                >
                  WGS84
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white/40 uppercase">Project Datum</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono border-white/10 text-white/40 h-5 px-1.5"
                >
                  ED50
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-emerald-500/5 border-t border-emerald-500/10">
          <div className="flex items-center gap-3 mb-2">
            <Compass size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase text-emerald-500">
              Spatial Integrity
            </span>
          </div>
          <p className="text-[9px] text-emerald-500/60 leading-relaxed">
            Spatial verification engine is active. No overlapping geometries detected in current
            project extent.
          </p>
        </div>
      </aside>

      {/* Interactive Map Surface */}
      <main className="flex-1 relative bg-[#050507] overflow-hidden group">
        {/* Mock Map Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/0,0,1,0,0/1200x800?access_token=pk.xxx')] bg-cover bg-center grayscale contrast-125" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#020203] via-transparent to-transparent" />
        </div>

        {/* Map Overlays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Mock Markers */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 bg-emerald-500 rounded-full blur-[2px] animate-pulse"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 h-3 w-3 bg-emerald-500 rounded-full blur-[1px]"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-2 w-2 bg-blue-500 rounded-full"
          />
        </div>

        {/* Map UI Controls */}
        <div className="absolute top-8 right-8 flex flex-col gap-2">
          <MapControlButton icon={LocateFixed} label="Target Current" />
          <MapControlButton icon={Layers} label="Layer Config" />
          <MapControlButton icon={Maximize2} label="Fullscreen" />
        </div>

        {/* Floating Search Status */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 flex items-center gap-6 shadow-2xl pointer-events-auto transition-transform hover:translate-y-[-4px]">
          <div className="flex items-center gap-3">
            <Globe size={14} className="text-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                Scanning Region
              </span>
              <span className="text-[8px] font-bold text-white/40 uppercase mt-1">
                North Sea • Quadrant 30
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-emerald-400">142</span>
            <span className="text-[8px] font-bold text-white/40 uppercase">Entities in View</span>
          </div>
        </div>

        {/* Zoom Level Marker */}
        <div className="absolute bottom-8 right-8 p-3 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
          <span className="text-[9px] font-mono text-white/40 uppercase font-black">
            Zoom: 14.5z
          </span>
        </div>
      </main>
    </div>
  )
}

function LayerButton({ label, count, isActive, onClick, color }: any) {
  const colors: any = {
    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
    blue: 'border-blue-500/20 text-blue-400 bg-blue-500/5',
    indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group',
        isActive
          ? colors[color]
          : 'border-white/5 text-muted-foreground/60 hover:bg-white/[0.03] hover:text-muted-foreground'
      )}
    >
      <div className="flex items-center gap-3">
        <MapPin
          size={14}
          className={cn(
            'transition-transform duration-500',
            isActive ? 'scale-110 rotate-12' : 'scale-100 opacity-40'
          )}
        />
        <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <Badge variant="outline" className="text-[9px] font-mono border-0 bg-white/5 opacity-60">
        {count}
      </Badge>
    </button>
  )
}

function MapControlButton({ icon: Icon, label }: any) {
  return (
    <button className="h-10 w-10 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 hover:scale-110 transition-all shadow-2xl relative group">
      <Icon size={18} />
      <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-[#0f0f12] border border-white/10 text-[9px] font-black uppercase text-white tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl">
        {label}
      </span>
    </button>
  )
}
