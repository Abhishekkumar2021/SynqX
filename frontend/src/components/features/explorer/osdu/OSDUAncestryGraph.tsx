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
import { Database, Layers, GitBranch, ArrowDown, CircleDot, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { OSDUDiscoveryEmptyState } from './shared/OSDUDiscoveryEmptyState'

const DAGRE_RANKING_OPTS = {
  rankdir: 'TB', // Top-to-Bottom for Lineage (Time/Process flow)
  align: 'DL',
  nodesep: 60,
  ranksep: 100,
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph()
  g.setGraph(DAGRE_RANKING_OPTS)
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach((node) => {
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
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 45,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Custom Node
const AncestryNode = ({ data }: { data: any }) => {
  const isRoot = data.isRoot
  const isParent = data.type === 'parent'

  if (isRoot) {
    return (
      <div className="relative flex flex-col items-center justify-center min-w-[180px] px-6 py-3 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-2 border-primary ring-4 ring-primary/10 transition-transform hover:scale-105">
        <Handle type="target" position={Position.Top} className="!opacity-0 !pointer-events-none" />
        <div className="flex items-center gap-2 mb-0.5">
          <CircleDot size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Target</span>
        </div>
        <span className="text-xs font-bold font-mono opacity-90 truncate max-w-[150px]">
          {data.label}
        </span>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!opacity-0 !pointer-events-none"
        />
      </div>
    )
  }

  return (
    <div
      className={`
        relative flex flex-col w-[200px] bg-card rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md hover:border-foreground/20 group
        ${isParent ? 'border-t-4 border-t-sky-500' : 'border-b-4 border-b-indigo-500'}
    `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-muted-foreground/30 !-mt-[5px]"
      />

      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-wider rounded-[4px] bg-muted text-muted-foreground group-hover:text-foreground transition-colors"
          >
            {isParent ? 'Source' : 'Derived'}
          </Badge>
          {isParent ? (
            <Database size={12} className="text-sky-500" />
          ) : (
            <Layers size={12} className="text-indigo-500" />
          )}
        </div>
        <span
          className="text-[10px] font-medium font-mono text-foreground/80 truncate select-all"
          title={data.id}
        >
          {data.label}
        </span>
        <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest truncate">
          {data.kindShort}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-muted-foreground/30 !-mb-[5px]"
      />
    </div>
  )
}

const nodeTypes = {
  ancestry: AncestryNode,
}

interface OSDUAncestryGraphProps {
  ancestryData: any
  rootId: string
  onNavigate: (id: string) => void
}

export const OSDUAncestryGraph: React.FC<OSDUAncestryGraphProps> = ({
  ancestryData,
  rootId,
  onNavigate,
}) => {
  const { theme } = useTheme()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id !== rootId) {
        onNavigate(node.id)
      }
    },
    [onNavigate, rootId]
  )

  useEffect(() => {
    if (!ancestryData) return

    const rawNodes: Node[] = []
    const rawEdges: Edge[] = []

    // Root Node
    rawNodes.push({
      id: rootId,
      type: 'ancestry',
      data: {
        id: rootId,
        label: rootId.split(':')[2] || rootId,
        kindShort: rootId.split(':')[1] || 'Entity',
        isRoot: true,
        type: 'root',
      },
      position: { x: 0, y: 0 },
    })

    // Parents (Upstream)
    if (ancestryData.parents) {
      ancestryData.parents.forEach((parentId: string) => {
        const parts = parentId.split(':')
        const label = parts[2] || parentId
        const kindShort = parts[1] || 'Unknown'

        rawNodes.push({
          id: parentId,
          type: 'ancestry',
          data: { id: parentId, label, kindShort, isRoot: false, type: 'parent' },
          position: { x: 0, y: 0 },
        })
        rawEdges.push({
          id: `${parentId}->${rootId}`,
          source: parentId,
          target: rootId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#0ea5e9', strokeWidth: 1.5, strokeDasharray: '5,5' }, // Sky
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
        })
      })
    }

    // Children (Downstream)
    if (ancestryData.children) {
      ancestryData.children.forEach((childId: string) => {
        const parts = childId.split(':')
        const label = parts[2] || childId
        const kindShort = parts[1] || 'Unknown'

        rawNodes.push({
          id: childId,
          type: 'ancestry',
          data: { id: childId, label, kindShort, isRoot: false, type: 'child' },
          position: { x: 0, y: 0 },
        })
        rawEdges.push({
          id: `${rootId}->${childId}`,
          source: rootId,
          target: childId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 1.5 }, // Indigo
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        })
      })
    }

    if (rawNodes.length <= 1) {
      setNodes([])
      setEdges([])
      return
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [ancestryData, rootId, setNodes, setEdges])

  if (!ancestryData || (!ancestryData.parents?.length && !ancestryData.children?.length)) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/2 relative">
        <OSDUDiscoveryEmptyState
          icon={GitBranch}
          title="No Lineage Found"
          description="This record has no recorded provenance (parents) or derived entities (children) in the OSDU graph."
          action={{
            label: 'Trigger Lineage Probe',
            onClick: () => {
              // Action logic already exists via parent refresh
            },
            icon: RefreshCw,
          }}
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
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-right"
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        nodesConnectable={false}
        nodesDraggable={true}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color={theme === 'dark' ? '#333' : '#e5e7eb'} gap={20} size={1} />
        <Controls showInteractive={false} className="bg-card border-border/60 shadow-xl" />

        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Badge
            variant="outline"
            className="bg-background/80 backdrop-blur border-sky-500/30 text-sky-600 gap-2"
          >
            <ArrowDown size={10} /> Sources ({ancestryData.parents?.length || 0})
          </Badge>
          <Badge
            variant="outline"
            className="bg-background/80 backdrop-blur border-indigo-500/30 text-indigo-600 gap-2"
          >
            <ArrowDown size={10} /> Derived ({ancestryData.children?.length || 0})
          </Badge>
        </div>
      </ReactFlow>
    </div>
  )
}
