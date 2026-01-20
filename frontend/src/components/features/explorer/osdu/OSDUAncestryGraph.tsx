 
import React, { useEffect } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useTheme } from '@/hooks/useTheme'
import { Database, Layers } from 'lucide-react'

const DAGRE_RANKING_OPTS = {
  rankdir: 'TB',
  align: 'UL',
  nodesep: 50,
  ranksep: 80,
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph()
  g.setGraph(DAGRE_RANKING_OPTS)
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 180, height: 60 })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 30,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Custom Node
const AncestryNode = ({ data }: { data: any }) => {
  const isRoot = data.isRoot
  return (
    <div
      className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-lg min-w-[180px]
            ${isRoot ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border/60 hover:border-primary/40'}
            transition-all
        `}
    >
      <div
        className={`p-2 rounded-lg ${isRoot ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
      >
        {data.type === 'parent' ? <Layers size={16} /> : <Database size={16} />}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 truncate max-w-[120px]">
          {data.kind}
        </span>
        <span className="text-xs font-bold truncate max-w-[120px]" title={data.label}>
          {data.label}
        </span>
      </div>
    </div>
  )
}

const nodeTypes = {
  ancestry: AncestryNode,
}

interface OSDUAncestryGraphProps {
  ancestryData: any // Expected { parents: string[], children?: string[] } relative to root ID
  rootId: string
}

export const OSDUAncestryGraph: React.FC<OSDUAncestryGraphProps> = ({ ancestryData, rootId }) => {
  const { theme } = useTheme()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (!ancestryData) return

    const rawNodes: Node[] = []
    const rawEdges: Edge[] = []

    // Root Node
    rawNodes.push({
      id: rootId,
      type: 'ancestry',
      data: { label: rootId.split(':')[2] || rootId, kind: 'ROOT', isRoot: true, type: 'root' },
      position: { x: 0, y: 0 },
    })

    // Parents (Upstream)
    if (ancestryData.parents) {
      ancestryData.parents.forEach((parentId: string) => {
        const label = parentId.split(':')[2] || parentId
        rawNodes.push({
          id: parentId,
          type: 'ancestry',
          data: { label, kind: 'PARENT', isRoot: false, type: 'parent' },
          position: { x: 0, y: 0 },
        })
        rawEdges.push({
          id: `${parentId}->${rootId}`,
          source: parentId,
          target: rootId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#64748b', strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed },
        })
      })
    }

    // Children (Downstream) - if available
    if (ancestryData.children) {
      ancestryData.children.forEach((childId: string) => {
        const label = childId.split(':')[2] || childId
        rawNodes.push({
          id: childId,
          type: 'ancestry',
          data: { label, kind: 'CHILD', isRoot: false, type: 'child' },
          position: { x: 0, y: 0 },
        })
        rawEdges.push({
          id: `${rootId}->${childId}`,
          source: rootId,
          target: childId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#64748b' },
          markerEnd: { type: MarkerType.ArrowClosed },
        })
      })
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [ancestryData, rootId, setNodes, setEdges])

  return (
    <div className="h-full w-full bg-muted/5 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        colorMode={theme === 'dark' ? 'dark' : 'light'}
      >
        <Background color={theme === 'dark' ? '#333' : '#ddd'} gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
