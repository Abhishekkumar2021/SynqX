import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SpatialMap } from '@/components/common/SpatialMap'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'

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
            width: 180,
            fontWeight: 'bold',
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
          width: 180,
          fontWeight: 'bold',
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
          background: '#fff',
          border: '1px solid #ddd',
          fontSize: '10px',
          width: 150,
          cursor: 'pointer',
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
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
              <Database size={24} />
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
            className="rounded-xl hover:bg-muted h-10 w-10"
          >
            <X size={20} />
          </Button>
        </div>
        {!isLoading && record && (
          <div className="px-6 pb-4 flex items-center gap-6 overflow-x-auto no-scrollbar text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              <span>Active Status</span>
            </div>
            <div className="w-px h-3 bg-border/40" />
            <div className="flex items-center gap-2">
              <Info size={14} />
              <span>{Object.keys(record).length} Fields</span>
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
              <TabsList className="bg-muted/30 p-1 h-10 rounded-xl w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger
                  value="data"
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background transition-all"
                >
                  <FileJson size={14} /> Payload
                </TabsTrigger>
                <TabsTrigger
                  value="metadata"
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background transition-all"
                >
                  <LayoutList size={14} /> Schema
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background transition-all"
                >
                  <FileText size={14} /> Docs
                </TabsTrigger>
                <TabsTrigger
                  value="lineage"
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background transition-all"
                >
                  <Shield size={14} /> Lineage
                </TabsTrigger>
                {coords && (
                  <TabsTrigger
                    value="spatial"
                    className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background transition-all"
                  >
                    <MapIcon size={14} /> Spatial
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden bg-muted/5 relative">
              <TabsContent value="data" className="h-full m-0 p-0 absolute inset-0 flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                        Key Properties
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {simpleProperties.slice(0, 12).map(([key, value]) => (
                          <div
                            key={key}
                            className="p-3 rounded-xl bg-background border border-border/40 flex flex-col gap-1"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate">
                              {key}
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator className="bg-border/40" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                          Raw JSON
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[9px] font-bold uppercase"
                          onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                        >
                          <Copy size={12} /> Copy
                        </Button>
                      </div>
                      <CodeBlock
                        code={JSON.stringify(record, null, 2)}
                        language="json"
                        className="bg-card border-border/40 text-xs"
                        rounded
                      />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="h-full m-0 p-0 absolute inset-0">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <ResultsGrid
                      data={{ results: colMetadata?.columns || [] }}
                      isLoading={isLoadingMeta}
                      noBorder
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="documents" className="h-full m-0 p-0 absolute inset-0">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    {isLoadingDocs ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <RefreshCw className="animate-spin text-primary" />
                      </div>
                    ) : !documentData?.documents || documentData.documents.length === 0 ? (
                      <div className="text-center py-24 opacity-30 font-bold uppercase text-xs">
                        No Documents Linked
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {documentData.documents.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 group"
                          >
                            <div className="flex items-center gap-4">
                              <FileText size={20} className="text-primary" />
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{doc.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {doc.document_type}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <Download size={16} />
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
                    <Background />
                    <Controls />
                  </ReactFlow>
                </div>
              </TabsContent>

              {coords && (
                <TabsContent value="spatial" className="h-full m-0 p-0 absolute inset-0">
                  <div className="h-full p-6">
                    <div className="h-full rounded-2xl overflow-hidden border border-border/40 shadow-xl">
                      <SpatialMap
                        latitude={coords.lat}
                        longitude={coords.lon}
                        title={recordName}
                        height="100%"
                      />
                    </div>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-20">
            <FileJson size={64} className="mb-4" />
            <p className="font-bold uppercase text-xs">No record resolved</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
