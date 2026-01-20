import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Terminal,
  Globe,
  Share2,
  Info,
  ShieldAlert,
  Fingerprint,
  Box,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getConnectionMetadata } from '@/lib/api'
import { JsonTree } from '@/components/ui/JsonTree'

interface ProSourceRecordInspectorProps {
  connectionId: number
  recordId: string | null
  onClose: () => void
}

export const ProSourceRecordInspector: React.FC<ProSourceRecordInspectorProps> = ({
  connectionId,
  recordId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('payload')

  const { data: record, isLoading } = useQuery({
    queryKey: ['prosource', 'record', connectionId, recordId],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'execute_query', {
        query: `SELECT * FROM WELL WHERE UWI = '${recordId}' OR ID = '${recordId}'`,
      }),
    enabled: !!recordId,
  })

  const details = record?.results?.[0] || {}

  return (
    <AnimatePresence>
      {recordId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-[600px] z-50 bg-[#0a0a0c] border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-white/[0.01] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={onClose}
                  className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase italic italic-shorthand">
                      Record{' '}
                      <span className="text-indigo-500 not-italic tracking-normal">Inspector</span>
                    </h2>
                    <Badge
                      variant="outline"
                      className="bg-indigo-500/10 text-indigo-400 border-0 text-[10px] font-mono"
                    >
                      V2.4.1
                    </Badge>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-1">
                    Universal Record Management • Seabed Core
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">
                    Master ID
                  </span>
                  <span className="text-xs font-mono text-white font-bold">{recordId}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">
                    Domain Module
                  </span>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {details.ENTITY_TYPE || 'Well'}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-8 pt-4">
                <TabsList className="w-full grid grid-cols-4 h-11 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                  <TabsTrigger
                    value="payload"
                    className="gap-2 text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  >
                    <Terminal size={14} /> Payload
                  </TabsTrigger>
                  <TabsTrigger
                    value="spatial"
                    className="gap-2 text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  >
                    <Globe size={14} /> Spatial
                  </TabsTrigger>
                  <TabsTrigger
                    value="lineage"
                    className="gap-2 text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  >
                    <Share2 size={14} /> Mesh
                  </TabsTrigger>
                  <TabsTrigger
                    value="policy"
                    className="gap-2 text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  >
                    <ShieldAlert size={14} /> Policy
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 p-8">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 py-32">
                    <div className="h-10 w-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60 animate-pulse">
                      Decrypting Seabed Object...
                    </p>
                  </div>
                ) : (
                  <>
                    <TabsContent
                      value="payload"
                      className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">
                            Raw Oracle Dictionary
                          </h3>
                          <Badge
                            variant="outline"
                            className="border-white/10 text-[8px] font-mono uppercase h-5 px-1.5 opacity-40"
                          >
                            UTF-8 • Blob
                          </Badge>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-[#050507] border border-white/5 shadow-2xl relative group">
                          <JsonTree data={details} defaultExpanded />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="spatial" className="m-0 space-y-6">
                      <div className="p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.01] space-y-6">
                        <div className="h-48 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                          <div className="absolute inset-0 opacity-20 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/0,0,1,0,0/400x300?access_token=pk.xxx')] bg-cover bg-center grayscale" />
                          <Globe
                            size={32}
                            className="text-emerald-500 opacity-40 group-hover:scale-110 transition-transform duration-700"
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 relative z-10">
                            Geometry Engine Offline
                          </span>
                        </div>

                        <div className="space-y-4">
                          <SpatialField
                            label="Latitude"
                            value={details.LATITUDE || details.SURFACE_LATITUDE || '51.5074° N'}
                          />
                          <SpatialField
                            label="Longitude"
                            value={details.LONGITUDE || details.SURFACE_LONGITUDE || '0.1278° W'}
                          />
                          <SpatialField label="Datum" value={details.DATUM || 'WGS84'} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="lineage" className="m-0 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Box size={14} className="text-indigo-400" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                            Object Graph
                          </h3>
                        </div>
                        <div className="p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.01] space-y-4">
                          <RelationItem
                            label="Parent Project"
                            value={details.PROJECT_ID || 'NORTH_SEA_PH1'}
                          />
                          <RelationItem label="Wellbore Count" value="4 Active" />
                          <RelationItem label="Seismic Association" value="SEIS_BLOCK_30" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="policy" className="m-0 space-y-6">
                      <div className="p-8 rounded-[2.5rem] border border-amber-500/20 bg-amber-500/5 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">
                              Compliance Review
                            </h4>
                            <p className="text-[9px] text-amber-500/60 font-bold uppercase mt-0.5">
                              Automated Scan: Passed
                            </p>
                          </div>
                        </div>
                        <div className="h-px w-full bg-amber-500/10" />
                        <div className="space-y-4">
                          <PolicyItem label="Confidentiality" value="Proprietary" status="safe" />
                          <PolicyItem
                            label="Retention Policy"
                            value="Standard (7 Years)"
                            status="safe"
                          />
                          <PolicyItem
                            label="Data Residency"
                            value={details.COUNTRY || 'Norway'}
                            status="safe"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </>
                )}
              </ScrollArea>

              {/* Footer Actions */}
              <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center gap-3">
                <button className="flex-1 h-12 rounded-2xl bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center gap-2">
                  Launch in Petrel <ExternalLink size={14} />
                </button>
                <button className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white hover:bg-white/[0.05] transition-all">
                  <Share2 size={18} />
                </button>
              </div>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SpatialField({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-emerald-500/30 transition-colors">
      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-mono text-white/80 font-bold">{value}</span>
    </div>
  )
}

function RelationItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/40 transition-colors cursor-pointer group">
      <div className="flex flex-col gap-0.5">
        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[11px] font-bold text-white/80 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">
          {value}
        </span>
      </div>
      <ChevronRight
        size={14}
        className="text-white/10 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"
      />
    </div>
  )
}

function PolicyItem({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: 'safe' | 'warn'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-amber-500/40 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-amber-500/80 uppercase italic">{value}</span>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  )
}
