import {
  FileJson,
  FileText,
  Database,
  Shield,
  X,
  Download,
  Copy,
  ExternalLink,
  Activity,
  Info,
  LayoutList,
  Map as MapIcon,
  RefreshCw,
  Hash,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { cn, formatNumber } from '@/lib/utils'
import { toast } from 'sonner'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SpatialMap } from '@/components/common/SpatialMap'

interface ProSourceRecordInspectorProps {
  connectionId: number
  assetName?: string
  record: any
  isLoading?: boolean
  onClose: () => void
  onNavigate: (id: string, asset?: string) => void
}

export const ProSourceRecordInspector: React.FC<ProSourceRecordInspectorProps> = ({
  connectionId,
  assetName,
  record,
  isLoading,
  onClose,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState('data')

  // Derive key properties for header
  const recordId = record?.ID || record?.id || record?.UWI || record?.well_id || 'Unknown'
  const recordName =
    record?.NAME || record?.name || record?.well_name || record?.WELL_NAME || 'Unnamed Record'
  const recordType = record?.TYPE || record?.type || 'Entity'

  // Detect coordinates
  const coords = useMemo(() => {
    if (!record) return null
    const lat = record.LATITUDE || record.latitude || record.Y_COORD || record.y_coord
    const lon = record.LONGITUDE || record.longitude || record.X_COORD || record.x_coord
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon }
    return null
  }, [record])

  // Fetch documents for this specific record
  const { data: documentData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['prosource', 'record-documents', connectionId, recordId],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'list_documents', {
        entity_ids: [recordId],
      }),
    enabled: !!record,
  })

  const documents = useMemo(() => documentData?.results || documentData || [], [documentData])

  // Fetch relationships for this record
  const { data: relationshipData, isLoading: isLoadingLineage } = useQuery({
    queryKey: ['prosource', 'record-relationships', connectionId, assetName, recordId],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'find_relationships', {
        asset: assetName,
        record: record,
      }),
    enabled: !!record && !!assetName && activeTab === 'lineage',
  })

  // Fetch column metadata for the technical tab
  const { data: colMetadata, isLoading: isLoadingMeta } = useQuery({
    queryKey: ['prosource', 'col-meta', connectionId, assetName],
    queryFn: () => getConnectionMetadata(connectionId, 'infer_schema', { asset: assetName }),
    enabled: !!assetName && activeTab === 'metadata',
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Filter out large/complex objects for the "Properties" quick view
  const simpleProperties = useMemo(() => {
    if (!record) return []
    return Object.entries(record).filter(
      ([_, v]) => typeof v !== 'object' && v !== null && String(v).length < 50
    )
  }, [record])

  // React Flow State for Lineage
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Transform relationships into Graph
  React.useEffect(() => {
    if (!record) return

    if (!relationshipData) {
      setNodes([
        {
          id: 'center',
          type: 'default',
          data: { label: recordName },
          position: { x: 0, y: 0 },
          style: {
            background: 'hsl(var(--primary) / 0.1)',
            border: '1px solid hsl(var(--primary) / 0.2)',
            borderRadius: '1rem',
            width: 180,
            fontWeight: 'bold',
            padding: '10px',
            fontSize: '12px',
          },
        },
      ])
      return
    }

    const newNodes = [
      {
        id: 'center',
        type: 'default',
        data: { label: recordName },
        position: { x: 0, y: 0 },
        style: {
          background: 'hsl(var(--primary) / 0.1)',
          border: '1px solid hsl(var(--primary) / 0.2)',
          borderRadius: '1rem',
          width: 180,
          fontWeight: 'bold',
          padding: '10px',
          fontSize: '12px',
        },
      },
    ]
    const newEdges: any[] = []

    relationshipData.forEach((rel: any, i: number) => {
      const nodeId = `node-${i}`
      const angle = (i / relationshipData.length) * 2 * Math.PI
      const radius = 250
      newNodes.push({
        id: nodeId,
        type: 'default',
        data: {
          label: `${rel.target}: ${rel.target_value}`,
          targetId: rel.target_value,
          targetAsset: rel.target,
        },
        position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
        style: {
          background: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.75rem',
          fontSize: '10px',
          width: 150,
          cursor: 'pointer',
          padding: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        },
      })
      newEdges.push({
        id: `edge-${i}`,
        source: 'center',
        target: nodeId,
        label: rel.type,
        animated: true,
        style: { stroke: 'hsl(var(--primary) / 0.3)' },
      })
    })
    setNodes(newNodes)
    setEdges(newEdges)
  }, [relationshipData, recordName, setNodes, setEdges, record])

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full md:w-[600px] xl:w-[800px] z-50 bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl flex flex-col"
    >
      <div className="flex flex-col border-b border-border/40 bg-muted/10">
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-5 overflow-hidden">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0 group">
              <Database size={24} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 h-6 px-2"
                >
                  {recordType}
                </Badge>
                {recordId && (
                  <div
                    className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md cursor-pointer hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => copyToClipboard(String(recordId))}
                  >
                    <span className="truncate max-w-[200px]">{recordId}</span>
                    <Copy size={10} className="opacity-60" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-black text-foreground truncate uppercase tracking-tight leading-none">
                {isLoading ? 'Resolving Entity...' : recordName}
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-muted h-10 w-10 active:scale-90 transition-all"
          >
            <X size={20} />
          </Button>
        </div>
        {!isLoading && record && (
          <div className="px-6 pb-4 flex items-center gap-6 overflow-x-auto no-scrollbar text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              <span>Context_Resolved</span>
            </div>
            <div className="w-px h-3 bg-border/40" />
            <div className="flex items-center gap-2">
              <Info size={14} />
              <span>{Object.keys(record).length} Fields</span>
            </div>
            <div className="w-px h-3 bg-border/40" />
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-4 border-none bg-primary/5 text-primary text-[8px]"
              >
                {assetName}
              </Badge>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40">
            <RefreshCw className="h-12 w-12 text-primary animate-spin" strokeWidth={1} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">
              Materializing discovery frame...
            </span>
          </div>
        ) : record ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 py-2 border-b border-border/40 bg-muted/5">
              <TabsList className="bg-muted/30 p-1 h-10 rounded-xl w-full justify-start overflow-x-auto no-scrollbar border border-border/20">
                <TabsTrigger
                  value="data"
                  className="flex-1 text-[10px] font-black uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                >
                  <FileJson size={14} /> Payload
                </TabsTrigger>
                <TabsTrigger
                  value="metadata"
                  className="flex-1 text-[10px] font-black uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                >
                  <LayoutList size={14} /> Schema
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex-1 text-[10px] font-black uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                >
                  <FileText size={14} /> Docs
                </TabsTrigger>
                <TabsTrigger
                  value="lineage"
                  className="flex-1 text-[10px] font-black uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                >
                  <Shield size={14} /> Lineage
                </TabsTrigger>
                {coords && (
                  <TabsTrigger
                    value="spatial"
                    className="flex-1 text-[10px] font-black uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                  >
                    <MapIcon size={14} /> Spatial
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden bg-muted/5 relative">
              <TabsContent value="data" className="h-full m-0 p-0 absolute inset-0 flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-8 space-y-10 pb-32">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-3">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        Identity_Attributes
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {simpleProperties.slice(0, 16).map(([key, value]) => (
                          <div
                            key={key}
                            className="p-4 rounded-2xl bg-card border border-border/40 flex flex-col gap-1.5 hover:border-primary/20 transition-all shadow-sm"
                          >
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">
                              {key}
                            </span>
                            <span className="text-[11px] font-bold text-foreground/80 truncate">
                              {value === null ? (
                                <span className="opacity-20 italic">---</span>
                              ) : (
                                String(value)
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator className="bg-border/10" />
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-3">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          Raw_Payload_Manifest
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 bg-primary/5 text-primary hover:bg-primary/10"
                          onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                        >
                          <Copy size={12} /> Copy_JSON
                        </Button>
                      </div>
                      <CodeBlock
                        code={JSON.stringify(record, null, 2)}
                        language="json"
                        className="bg-black/40 border-border/20 text-[11px] font-mono leading-relaxed"
                        rounded
                      />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="h-full m-0 p-0 absolute inset-0">
                <ScrollArea className="h-full">
                  <div className="p-8 space-y-8 pb-32">
                    <div className="flex items-center justify-between px-2">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                          Technical_Specification
                        </h4>
                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                          Deep schema inspection for {assetName}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl gap-2 font-black uppercase text-[9px] tracking-widest"
                      >
                        <Download size={12} /> Export_DD
                      </Button>
                    </div>

                    <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
                      <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        <div className="col-span-5">Attribute_Field</div>
                        <div className="col-span-3">Data_Type</div>
                        <div className="col-span-4">Measurement_Context</div>
                      </div>
                      <div className="divide-y divide-border/5">
                        {isLoadingMeta ? (
                          <div className="p-20 flex justify-center opacity-30">
                            <RefreshCw className="animate-spin" />
                          </div>
                        ) : (
                          colMetadata?.columns?.map((col: any, i: number) => (
                            <div
                              key={i}
                              className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-primary/[0.02] transition-colors group"
                            >
                              <div className="col-span-5 flex flex-col gap-0.5">
                                <span className="text-[11px] font-black text-foreground/80 uppercase group-hover:text-primary transition-colors">
                                  {col.name}
                                </span>
                                <span className="text-[8px] font-medium text-muted-foreground/40 truncate leading-tight">
                                  {col.description || 'Standard technical attribute'}
                                </span>
                              </div>
                              <div className="col-span-3">
                                <code className="text-[9px] font-mono font-black text-primary/60 bg-primary/5 px-2 py-0.5 rounded-md">
                                  {col.type}
                                </code>
                              </div>
                              <div className="col-span-4 flex items-center gap-3">
                                {col.metadata?.unit && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-muted text-[8px] font-black uppercase px-1.5 h-4 border-none"
                                  >
                                    {col.metadata.unit}
                                  </Badge>
                                )}
                                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase truncate">
                                  {col.metadata?.measurement}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="documents" className="h-full m-0 p-0 absolute inset-0">
                <ScrollArea className="h-full">
                  <div className="p-8 space-y-8 pb-32">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 px-2 flex items-center gap-3">
                      <div className="h-1 w-1 rounded-full bg-rose-500" />
                      Linked_Knowledge_Objects
                    </h4>
                                        {isLoadingDocs ? (
                                          <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                            <RefreshCw className="animate-spin text-primary" />
                                          </div>
                                        ) : documents.length === 0 ? (
                                          <div className="flex flex-col items-center justify-center py-32 opacity-20 grayscale gap-4">
                                            <FileText size={64} strokeWidth={1} />
                                            <p className="font-black uppercase text-[10px] tracking-[0.3em]">No unstructured anchors</p>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 gap-4">
                                            {documents.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-5 rounded-[1.5rem] bg-card border border-border/40 group hover:border-rose-500/30 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center gap-5">
                              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-inner group-hover:scale-110 transition-transform">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <p className="text-[13px] font-black truncate uppercase text-foreground/80 group-hover:text-rose-600 transition-colors">
                                  {doc.NAME || doc.name}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="h-4 px-1.5 bg-muted/50 text-[8px] font-black uppercase border-none"
                                  >
                                    {doc.DOCUMENT_FORMAT || 'FILE'}
                                  </Badge>
                                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                    {doc.DOCUMENT_TYPE}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-90 border border-transparent hover:border-rose-500/20 shadow-sm"
                            >
                              <Download size={18} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="lineage"
                className="h-full m-0 p-0 absolute inset-0 flex flex-col"
              >
                <div className="flex-1 bg-muted/10 relative">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => {
                      if (node.data?.targetId) {
                        onNavigate(node.data.targetId, node.data.targetAsset)
                      }
                    }}
                    fitView
                  >
                    <Background color="hsl(var(--primary)/0.05)" />
                    <Controls />
                  </ReactFlow>
                  <div className="absolute top-4 left-4 p-3 bg-background/80 backdrop-blur-md border border-border/40 rounded-xl shadow-sm z-10 space-y-1 pointer-events-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Lineage_Explorer
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground/60 uppercase">
                      Interactive graph of seabed relationships
                    </p>
                  </div>
                </div>
              </TabsContent>

              {coords && (
                <TabsContent value="spatial" className="h-full m-0 p-0 absolute inset-0">
                  <div className="h-full p-8 pb-32">
                    <div className="h-full rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl relative group">
                      <SpatialMap
                        latitude={coords.lat}
                        longitude={coords.lon}
                        title={recordName}
                        height="100%"
                      />
                      <div className="absolute top-6 left-6 p-4 bg-background/90 backdrop-blur-xl border border-border/20 rounded-2xl shadow-2xl z-10 space-y-2 pointer-events-none">
                        <div className="flex items-center gap-2">
                          <MapIcon size={14} className="text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                            Geospatial_Anchor
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground/40 uppercase">
                              Lat_Coord
                            </span>
                            <span className="text-[10px] font-mono font-bold text-foreground/80">
                              {coords.lat.toFixed(6)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground/40 uppercase">
                              Lon_Coord
                            </span>
                            <span className="text-[10px] font-mono font-bold text-foreground/80">
                              {coords.lon.toFixed(6)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-20 grayscale gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-muted blur-3xl rounded-full" />
              <FileJson size={80} strokeWidth={1} className="relative z-10" />
            </div>
            <p className="font-black uppercase text-[10px] tracking-[0.4em]">
              No record context resolved
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
