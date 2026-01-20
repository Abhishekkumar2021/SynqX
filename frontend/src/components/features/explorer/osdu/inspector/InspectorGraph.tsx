import React, { useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  type Node,
  type Edge,
  Handle,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useTheme } from '@/hooks/useTheme'
import { Box, ArrowUpRight, Link2, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InspectorEmptyState } from './InspectorEmptyState'

const DAGRE_RANKING_OPTS = {
  rankdir: 'LR',
  align: 'DL',
  nodesep: 40,
  ranksep: 100,
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph()
  g.setGraph(DAGRE_RANKING_OPTS)
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach((node) => {
    // Adjusted dimensions for new compact nodes
    const width = node.data.isRoot ? 200 : 220
    const height = node.data.isRoot ? 60 : 90
    g.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 40,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// --- Custom Node Component ---

const RelationshipNode = ({ data }: { data: any }) => {

  const isRoot = data.isRoot

  const isOutbound = data.type === 'outbound'



  // Root Node Design: Prominent, Brand Color

  if (isRoot) {

    return (

      <div className="relative flex flex-col items-center justify-center min-w-[180px] px-6 py-3 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-2 border-primary ring-4 ring-primary/10 transition-transform hover:scale-105">

        <Handle type="target" position={Position.Left} className="!opacity-0 !pointer-events-none" />

        <div className="flex items-center gap-2 mb-0.5">

           <CircleDot size={14} className="animate-pulse" />

           <span className="text-[10px] font-black uppercase tracking-widest">{data.kindShort}</span>

        </div>

        <span className="text-xs font-bold font-mono opacity-90 truncate max-w-[150px]">{data.idShort}</span>

        <Handle type="source" position={Position.Right} className="!opacity-0 !pointer-events-none" />

      </div>

    )

  }



  // Related Node Design: Technical, Data-Centric

  return (

    <div className={`

        relative flex flex-col w-[200px] bg-card rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md hover:border-foreground/20 group

        ${isOutbound ? 'border-l-4 border-l-indigo-500' : 'border-l-4 border-l-emerald-500'}

    `}>

        <Handle type="target" position={Position.Left} className="!opacity-0 !pointer-events-none" />

        

        <div className="p-3 flex flex-col gap-1.5">

            {/* Header */}

            <div className="flex items-center justify-between">

                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-wider rounded-[4px] bg-muted text-muted-foreground group-hover:text-foreground transition-colors">

                    {data.kindShort}

                </Badge>

                {isOutbound ? <ArrowUpRight size={12} className="text-indigo-500" /> : <Link2 size={12} className="text-emerald-500" />}

            </div>

            

            {/* ID */}

            <span className="text-[10px] font-medium font-mono text-foreground/80 truncate select-all" title={data.id}>

                {data.idShort}

            </span>



            {/* Field Label (Outbound Only) */}

            {data.relationField && (

                <div className="mt-1 pt-1.5 border-t border-border/40 flex items-center gap-1.5">

                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Via</span>

                    <span className="text-[9px] font-mono text-indigo-600 truncate" title={data.relationField}>

                        {data.relationField}

                    </span>

                </div>

            )}

        </div>



        <Handle type="source" position={Position.Right} className="!opacity-0 !pointer-events-none" />

    </div>

  )

}



const nodeTypes = {

  relationship: RelationshipNode,

}



interface InspectorGraphProps {

  record: any

  onNavigate: (id: string) => void

}



export const InspectorGraph: React.FC<InspectorGraphProps> = ({ record, onNavigate }) => {

  const { theme } = useTheme()

  const [nodes, setNodes, onNodesChange] = useNodesState([])

  const [edges, setEdges, onEdgesChange] = useEdgesState([])



  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {

      if (node.id !== record.details.id) {

          onNavigate(node.id)

      }

  }, [onNavigate, record.details.id])



  useEffect(() => {

    if (!record) return



    const rootId = record.details.id

    const shortRootKind = record.details.kind?.split(':').slice(-2, -1)[0]?.split('--').pop() || 'Entity'

    

    const rawNodes: Node[] = []

    const rawEdges: Edge[] = []



    // 1. Root Node

    rawNodes.push({

      id: rootId,

      type: 'relationship',

      data: { 

          id: rootId,

          idShort: rootId.split(':').pop(), 

          kindShort: shortRootKind, 

          isRoot: true, 

          type: 'root' 

      },

      position: { x: 0, y: 0 },

    })



    const outbound = record.relationships?.outbound || []

    const inbound = record.relationships?.inbound || []



    // 2. Outbound Nodes (Root -> Target)

    outbound.forEach((rel: any, idx: number) => {

        const targetId = rel.target_id

        if (!rawNodes.find(n => n.id === targetId)) {

            const kindShort = rel.kind?.split(':').slice(-2, -1)[0]?.split('--').pop() || 'Target'

            rawNodes.push({

                id: targetId,

                type: 'relationship',

                data: {

                    id: targetId,

                    idShort: targetId.split(':').pop(),

                    kindShort: kindShort,

                    isRoot: false,

                    type: 'outbound',

                    relationField: rel.field

                },

                position: { x: 0, y: 0 },

            })

        }

        

        rawEdges.push({

            id: `out-${idx}-${rootId}-${targetId}`,

            source: rootId,

            target: targetId,

            type: 'smoothstep',

            animated: true,

            style: { stroke: '#6366f1', strokeWidth: 1.5 },

            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },

        })

    })



    // 3. Inbound Nodes (Source -> Root)

    inbound.forEach((rel: any, idx: number) => {

        const sourceId = rel.source_id

        if (!rawNodes.find(n => n.id === sourceId)) {

             const kindShort = rel.kind?.split(':').slice(-2, -1)[0]?.split('--').pop() || 'Source'

             rawNodes.push({

                id: sourceId,

                type: 'relationship',

                data: {

                    id: sourceId,

                    idShort: sourceId.split(':').pop(),

                    kindShort: kindShort,

                    isRoot: false,

                    type: 'inbound',

                },

                position: { x: 0, y: 0 },

            })

        }



        rawEdges.push({

            id: `in-${idx}-${sourceId}-${rootId}`,

            source: sourceId,

            target: rootId,

            type: 'smoothstep',

            animated: false,

            style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4,4' },

            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },

        })

    })



    if (rawNodes.length <= 1) {

        setNodes([])

        setEdges([])

        return

    }



    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges)

    setNodes(layoutedNodes)

    setEdges(layoutedEdges)



  }, [record, setNodes, setEdges])



  const outboundCount = record.relationships?.outbound?.length || 0

  const inboundCount = record.relationships?.inbound?.length || 0



  if (outboundCount === 0 && inboundCount === 0) {

      return (

          <div className="h-full flex items-center justify-center bg-muted/5">

              <InspectorEmptyState 

                icon={Box} 

                title="Isolated Entity" 

                description="This record is an island. No inbound or outbound relationships detected." 

              />

          </div>

      )

  }



  return (

    <div className="h-full w-full bg-muted/5 relative">

      <ReactFlow

        nodes={nodes}

        edges={edges}

        onNodesChange={onNodesChange}

        onEdgesChange={onEdgesChange}

        onNodeClick={onNodeClick}

        nodeTypes={nodeTypes}

        fitView

        attributionPosition="bottom-right"

        colorMode={theme === 'dark' ? 'dark' : 'light'}

        minZoom={0.1}

        maxZoom={2}

        nodesConnectable={false}

        edgesConnectable={false}

        nodesDraggable={true}

      >

        <Background color={theme === 'dark' ? '#333' : '#e5e7eb'} gap={20} size={1} />

        <Controls showInteractive={false} className="bg-card border-border/60 shadow-xl" />

        

        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">

            <Badge variant="outline" className="bg-background/80 backdrop-blur border-indigo-500/30 text-indigo-600 gap-2">

                <div className="w-2 h-2 rounded-full bg-indigo-500" /> Outbound ({outboundCount})

            </Badge>

            <Badge variant="outline" className="bg-background/80 backdrop-blur border-emerald-500/30 text-emerald-600 gap-2">

                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Inbound ({inboundCount})

            </Badge>

        </div>

      </ReactFlow>

    </div>

  )

}
