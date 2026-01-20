 
import React, { useState, useMemo } from 'react'
import {
  FileJson,
  Boxes,
  History,
  Lock,
  Map as MapIcon,
  RefreshCw,
  PanelRight,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { OSDUAncestryGraph } from './OSDUAncestryGraph'
import { InspectorHeader } from './inspector/InspectorHeader'
import { InspectorSidebar } from './inspector/InspectorSidebar'
import { InspectorPayload } from './inspector/InspectorPayload'
import { InspectorRelationships } from './inspector/InspectorRelationships'
import { InspectorPolicy } from './inspector/InspectorPolicy'
import { InspectorSpatial } from './inspector/InspectorSpatial'

interface OSDURecordInspectorProps {
  record: any
  isLoading: boolean
  onClose: () => void
  onNavigate: (id: string) => void
  onDownload?: () => void
}

export const OSDURecordInspector: React.FC<OSDURecordInspectorProps> = ({
  record,
  isLoading,
  onClose,
  onNavigate,
  onDownload,
}) => {
  const [activeTab, setActiveTab] = useState('payload')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const coordinates = useMemo(() => {
    if (!record?.spatial) return null
    const coords = record.spatial.geometries?.[0]?.coordinates || record.spatial.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lon: coords[0], lat: coords[1] }
    }
    return null
  }, [record])

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 250 }}
      className="absolute inset-0 z-[150] bg-background flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] border-l border-border/40"
    >
      <InspectorHeader
        record={record}
        isLoading={isLoading}
        onClose={onClose}
        onDownload={onDownload}
      />

      {/* --- INSPECTION VIEWPORT --- */}
      <div className="flex-1 flex min-h-0">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40">
            <RefreshCw className="h-12 w-12 text-primary animate-spin" strokeWidth={1} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">
              Materializing discovery frame...
            </span>
          </div>
        ) : record ? (
          <>
            <main className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-6 py-2 bg-muted/5 border-b border-border/40 shrink-0 flex items-center justify-between gap-4">
                  <TabsList className="bg-muted/20 p-1 h-9 rounded-xl self-start">
                    <TabsTrigger
                      value="payload"
                      className="gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-3"
                    >
                      <FileJson size={12} /> Payload
                    </TabsTrigger>
                    <TabsTrigger
                      value="relationships"
                      className="gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-3"
                    >
                      <Boxes size={12} /> Graph
                    </TabsTrigger>
                    <TabsTrigger
                      value="ancestry"
                      className="gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-3"
                    >
                      <History size={12} /> Lineage
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-3"
                    >
                      <Lock size={12} /> Policy
                    </TabsTrigger>
                    {coordinates && (
                      <TabsTrigger
                        value="map"
                        className="gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm h-7 px-3"
                      >
                        <MapIcon size={12} /> Spatial
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <Button
                    variant={isSidebarOpen ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="h-8 w-8 rounded-lg"
                    title="Toggle Sidebar"
                  >
                    <PanelRight size={16} className={isSidebarOpen ? "text-primary" : "text-muted-foreground"} />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 relative">
                  <TabsContent value="payload" className="h-full m-0 overflow-hidden bg-background">
                    <InspectorPayload record={record} />
                  </TabsContent>

                  <TabsContent
                    value="relationships"
                    className="h-full m-0 overflow-hidden bg-muted/5"
                  >
                    <InspectorRelationships record={record} onNavigate={onNavigate} />
                  </TabsContent>

                  <TabsContent value="ancestry" className="h-full m-0 relative overflow-hidden">
                    <OSDUAncestryGraph ancestryData={record.ancestry} rootId={record.details.id} />
                  </TabsContent>

                  <TabsContent value="security" className="h-full m-0 bg-muted/5">
                    <InspectorPolicy record={record} />
                  </TabsContent>

                  <TabsContent
                    value="map"
                    className="h-full m-0 flex flex-col"
                  >
                     <InspectorSpatial record={record} coordinates={coordinates} />
                  </TabsContent>
                </div>
              </Tabs>
            </main>

            <AnimatePresence initial={false}>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="h-full border-l border-border/40 bg-muted/5 overflow-hidden flex flex-col shrink-0"
                    >
                        <div className="w-80 h-full flex flex-col">
                            <InspectorSidebar record={record} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </motion.div>
  )
}
