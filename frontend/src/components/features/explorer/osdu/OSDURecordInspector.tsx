 
import React, { useState, useMemo } from 'react'
import {
  Download,
  Binary,
  Map as MapIcon,
  RefreshCw,
  Save,
  Shield,
  Activity,
  Navigation,
  Lock,
  Cpu,
  FileJson,
  Boxes,
  Fingerprint,
  Scale,
  ListTree,
  User,
  Globe,
  History,
  ArrowLeft,
  ArrowUpRight,
  Link2,
  ChevronRight,
  Copy,
  Trash2,
  X,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Separator } from '@/components/ui/separator'
import {motion} from 'framer-motion'
import { OSDUAncestryGraph } from './OSDUAncestryGraph'
import { SpatialMap } from '@/components/common/SpatialMap'
import { toast } from 'sonner'

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
  const [payloadView, setPayloadView] = useState<'structured' | 'raw'>('structured')

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const coordinates = useMemo(() => {
    if (!record?.spatial) return null
    const coords = record.spatial.geometries?.[0]?.coordinates || record.spatial.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lon: coords[0], lat: coords[1] }
    }
    return null
  }, [record])

  const flattenedData = useMemo(() => {
    if (!record?.details?.data) return []
    return Object.entries(record.details.data).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
  }, [record])

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 250 }}
      className="absolute inset-0 z-[150] bg-background flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] border-l border-border/40"
    >
      {/* --- TECHNICAL HEADER --- */}
      <header className="h-20 px-8 border-b border-border/40 bg-muted/5 backdrop-blur-xl flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-6 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-90 border border-border/40 shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[8px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary h-4.5"
              >
                Entity_ID
              </Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                {record?.details?.kind}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tighter text-foreground uppercase truncate leading-none">
              {isLoading ? 'Resolving Manifest...' : record?.details?.id?.split(':').pop()}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && record && (
            <div className="flex items-center gap-2">
              {record.details.kind?.includes('dataset--File') && (
                <Button
                  onClick={onDownload}
                  variant="soft"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2"
                >
                  <Download size={14} /> Download
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl border-border/40"
                      onClick={() => copyToClipboard(record.details.id, 'Registry ID')}
                    >
                      <Fingerprint size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase p-2">
                    Copy Registry ID
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          <Separator orientation="vertical" className="h-6 mx-2 opacity-10" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
          >
            <X size={20} />
          </Button>
        </div>
      </header>

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
            <main className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-8 bg-muted/5 border-b border-border/40 shrink-0 flex items-center justify-between">
                  <TabsList className="bg-transparent gap-8 h-12">
                    <TabsTrigger
                      value="payload"
                      className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"
                    >
                      <FileJson size={14} /> Payload
                    </TabsTrigger>
                    <TabsTrigger
                      value="relationships"
                      className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"
                    >
                      <Boxes size={14} /> Relationships
                    </TabsTrigger>
                    <TabsTrigger
                      value="ancestry"
                      className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"
                    >
                      <History size={14} /> Lineage
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"
                    >
                      <Lock size={14} /> Policy
                    </TabsTrigger>
                    {coordinates && (
                      <TabsTrigger
                        value="map"
                        className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full"
                      >
                        <MapIcon size={14} /> Spatial
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {activeTab === 'payload' && (
                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/40 h-8">
                      <Button
                        variant={payloadView === 'structured' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="text-[9px] font-black uppercase tracking-widest h-6 rounded-md px-3"
                        onClick={() => setPayloadView('structured')}
                      >
                        <ListTree size={12} className="mr-1.5" /> Structured
                      </Button>
                      <Button
                        variant={payloadView === 'raw' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="text-[9px] font-black uppercase tracking-widest h-6 rounded-md px-3"
                        onClick={() => setPayloadView('raw')}
                      >
                        <Binary size={12} className="mr-1.5" /> Raw JSON
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0 relative">
                  <TabsContent value="payload" className="h-full m-0 overflow-hidden bg-background">
                    {payloadView === 'raw' ? (
                      <CodeBlock
                        code={JSON.stringify(record.details, null, 2)}
                        language="json"
                        rounded={false}
                        maxHeight="100%"
                        className="!shadow-none border-0"
                      />
                    ) : (
                      <ScrollArea className="h-full">
                        <div className="p-8 max-w-5xl mx-auto space-y-6">
                          <div className="grid grid-cols-1 gap-px bg-border/40 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                            {flattenedData.map((item, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-12 bg-background hover:bg-muted/5 transition-colors group"
                              >
                                <div className="col-span-4 p-4 border-r border-border/40 bg-muted/5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    {item.key}
                                  </span>
                                </div>
                                <div className="col-span-8 p-4 flex items-center justify-between">
                                  <span className="text-[13px] font-medium text-foreground/80 break-all leading-relaxed font-mono">
                                    {item.value}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => copyToClipboard(item.value, item.key)}
                                  >
                                    <Copy size={12} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="relationships"
                    className="h-full m-0 overflow-hidden bg-muted/5"
                  >
                    <ScrollArea className="h-full">
                      <div className="p-10 space-y-12 max-w-5xl mx-auto pb-32">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-border/20 pb-4 px-1">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-sm">
                                <ArrowUpRight size={18} />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                                Outbound References
                              </h3>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold border-indigo-500/20 text-indigo-600 uppercase h-5"
                            >
                              {record.relationships.outbound.length} Nodes
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {record.relationships.outbound.map((rel: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 group hover:border-primary/40 transition-all shadow-sm"
                              >
                                <div className="flex flex-col min-w-0 pr-4">
                                  <span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1 tracking-widest leading-none">
                                    {rel.field}
                                  </span>
                                  <code className="text-xs font-bold truncate text-foreground/80 font-mono tracking-tighter">
                                    {rel.target_id}
                                  </code>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100"
                                    onClick={() => copyToClipboard(rel.target_id, 'Target ID')}
                                  >
                                    <Copy size={14} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2 bg-muted/30 border-border/40 hover:bg-primary hover:text-white transition-all shadow-sm"
                                    onClick={() => onNavigate(rel.target_id)}
                                  >
                                    Navigate <Navigation size={12} className="rotate-45" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-border/20 pb-4 px-1">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-sm">
                                <Link2 size={18} />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                                Inbound Dependencies
                              </h3>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold border-emerald-500/20 text-emerald-600 uppercase h-5"
                            >
                              {record.relationships.inbound.length} Nodes
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {record.relationships.inbound.map((rel: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 group hover:border-blue-500/40 transition-all shadow-sm"
                              >
                                <div className="flex flex-col min-w-0 pr-4">
                                  <span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1 tracking-widest leading-none">
                                    {rel.kind.split(':').pop()?.split('--').pop()}
                                  </span>
                                  <code className="text-xs font-bold truncate text-foreground/80 font-mono tracking-tighter">
                                    {rel.source_id}
                                  </code>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100"
                                    onClick={() => copyToClipboard(rel.source_id, 'Source ID')}
                                  >
                                    <Copy size={14} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2 bg-muted/30 border-border/40 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    onClick={() => onNavigate(rel.source_id)}
                                  >
                                    Inspect <ChevronRight size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="ancestry" className="h-full m-0 relative overflow-hidden">
                    <OSDUAncestryGraph ancestryData={record.ancestry} rootId={record.details.id} />
                  </TabsContent>

                  <TabsContent value="security" className="h-full m-0 bg-muted/5">
                    <ScrollArea className="h-full">
                      <div className="p-10 space-y-10 max-w-4xl mx-auto pb-32">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="p-8 rounded-[2.5rem] bg-card border border-border/40 space-y-8 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                              <Shield size={20} className="text-primary" />
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">
                                Access Control Domain
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                  <User size={12} className="text-blue-500" /> Owners
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {(record.details.acl?.owners || []).map((o: string) => (
                                    <Badge
                                      key={o}
                                      variant="secondary"
                                      className="bg-blue-500/10 text-blue-600 border-none text-[10px] font-bold h-7 px-3 lowercase"
                                    >
                                      {o}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                  <Globe size={12} className="text-amber-500" /> Viewers
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {(record.details.acl?.viewers || []).map((v: string) => (
                                    <Badge
                                      key={v}
                                      variant="secondary"
                                      className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold h-7 px-3 lowercase"
                                    >
                                      {v}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-8 rounded-[2.5rem] bg-card border border-border/40 space-y-8 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                              <Scale size={20} className="text-emerald-600" />
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">
                                Legal Compliance Registry
                              </span>
                            </div>
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                  Authenticated Legal Tags
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {(record.details.legal?.legaltags || []).map(
                                    (tag: string, idx: number) => (
                                      <Badge
                                        key={tag || `tag-${idx}`}
                                        variant="outline"
                                        className="text-[11px] font-bold border-border/40 bg-muted/20 px-4 h-8 rounded-xl uppercase tracking-tight shadow-sm"
                                      >
                                        {tag}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                              <Separator className="opacity-10" />
                              <div className="flex items-center justify-between bg-muted/10 p-4 rounded-2xl border border-border/40 shadow-inner">
                                <div className="flex items-center gap-3">
                                  <Globe size={16} className="text-muted-foreground/40" />
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    Data Residency
                                  </span>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 h-6 px-3 text-[10px] font-black uppercase tracking-widest">
                                  {record.details.legal?.otherRelevantDataCountries?.[0] ||
                                    'Global Juris'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="map"
                    className="h-full m-0 flex flex-col p-8 gap-6 bg-background"
                  >
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
                  </TabsContent>
                </div>
              </Tabs>
            </main>

            {/* --- SIDE METADATA SUMMARY --- */}
            <aside className="w-80 bg-muted/5 flex flex-col overflow-hidden shrink-0 border-l border-border/40">
              <div className="p-6 px-8 border-b border-border/40 bg-muted/10 shrink-0 uppercase tracking-[0.2em] font-black text-[10px] text-muted-foreground/60 flex items-center gap-3">
                <Activity size={14} /> Registry Profile
              </div>
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground/60 px-1 uppercase text-[10px] font-black tracking-widest">
                      <Cpu size={14} /> System Properties
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          label: 'Authority',
                          val: record.details.authority || 'OSDU',
                          icon: Globe,
                        },
                        {
                          label: 'Schema Source',
                          val: record.details.kind?.split(':')[1],
                          icon: Database,
                        },
                        { label: 'Version', val: record.details.version, icon: History },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="p-4 rounded-2xl bg-card border border-border/40 flex items-center justify-between shadow-sm hover:border-primary/20 transition-all"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">
                              {item.label}
                            </span>
                            <span className="text-[11px] font-bold text-foreground/80 uppercase truncate tracking-tight">
                              {item.val}
                            </span>
                          </div>
                          <item.icon size={14} className="text-muted-foreground/20 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-600/20 space-y-4 shadow-inner">
                    <div className="flex items-center gap-2 text-indigo-600/60 uppercase text-[9px] font-black tracking-widest">
                      <Activity size={12} /> Health Status
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-foreground/60 tracking-widest">
                        Metadata Verified
                      </span>
                      <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-8 border-t border-border/40 bg-muted/10 flex flex-col gap-3 shrink-0">
                <Button className="w-full h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                  <Save size={16} className="mr-2" /> Push Updates
                </Button>
                <Button
                  variant="ghost"
                  className="h-10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/5 transition-all"
                >
                  <Trash2 size={16} className="mr-2" /> Expunge Record
                </Button>
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </motion.div>
  )
}
