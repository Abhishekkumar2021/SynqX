 
import React, { useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Node,
  type Edge,
  Panel,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Database, Binary, Network, Sparkles, Search, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTheme } from '@/hooks/useTheme'

// --- Custom Edge Component ---

const RelationshipEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: 1.5, opacity: 0.4 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
        >
          <div className="px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/30 shadow-xs animate-in fade-in zoom-in duration-200">
            <span className="text-[7px] font-black text-primary uppercase tracking-tighter whitespace-nowrap">
              {data?.label}
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes = {
  relationship: RelationshipEdge,
}

// --- Custom Node Component ---

const EntityNode = ({ data }: any) => {
  const isRoot = data.isRoot

  return (
    <div className="group relative">
      <Handle type="target" position={data.targetPosition || Position.Top} className="opacity-0" />
      <Handle
        type="source"
        position={data.sourcePosition || Position.Bottom}
        className="opacity-0"
      />

      <div
        className={cn(
          'flex items-center gap-3 p-2 pr-4 rounded-xl border bg-card/95 backdrop-blur-md transition-all duration-200 min-w-[180px] shadow-sm',
          isRoot
            ? 'border-primary/50 ring-4 ring-primary/5 bg-primary/5 shadow-lg shadow-primary/5'
            : 'border-border/60 hover:border-primary/40 hover:shadow-md'
        )}
      >
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-inner',
            isRoot
              ? 'bg-primary text-primary-foreground'
              : data.category === 'Technical'
                ? 'bg-muted text-muted-foreground/30'
                : 'bg-primary/10 text-primary'
          )}
        >
          {isRoot ? (
            <Database size={18} />
          ) : data.category === 'Technical' ? (
            <Binary size={16} />
          ) : (
            <Sparkles size={16} />
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 truncate leading-none mb-1">
            {isRoot ? 'ROOT CONTEXT' : data.field || 'LINK'}
          </span>
          <h5 className="text-[11px] font-bold truncate text-foreground leading-none">
            {data.label}
          </h5>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  entity: EntityNode,
}

interface DomainEntityGraphProps {
  rootEntity: string
  relationships: any[]
  onNodeClick: (kindName: string) => void
  isMaximized?: boolean
}

const GraphView: React.FC<
  DomainEntityGraphProps & {
    isMaximizedView: boolean
    onToggleMaximize: () => void
  }
> = ({ rootEntity, relationships, onNodeClick, isMaximizedView, onToggleMaximize }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { theme } = useTheme()
  const { fitView } = useReactFlow()

  const rootLabel = useMemo(() => {
    const parts = rootEntity.split(':')
    const entityTypeFull = parts[2] || parts.pop() || rootEntity
    return entityTypeFull.includes('--') ? entityTypeFull.split('--')[1] : entityTypeFull
  }, [rootEntity])

  const filteredRelationships = useMemo(() => {
    return relationships.filter((rel) => {
      if (rel.targetKind === rootEntity) return false

      const parts = rel.targetKind.split(':')
      const entityTypeFull = parts[2] || parts.pop() || rel.targetKind
      const name = entityTypeFull.includes('--') ? entityTypeFull.split('--')[1] : entityTypeFull

      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.field.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [relationships, searchQuery, rootEntity])

  useEffect(() => {
    const initialNodes: Node[] = [
      {
        id: 'root',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { label: rootLabel, isRoot: true },
      },
    ]

    const initialEdges: Edge[] = []

    // Dynamic Spacing based on count
    const total = filteredRelationships.length
    const radius = isMaximizedView ? Math.max(450, total * 15) : Math.max(350, total * 12)

    filteredRelationships.forEach((rel, idx) => {
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      let sourcePos = Position.Bottom
      let targetPos = Position.Top

      if (Math.abs(angle) < Math.PI / 4) {
        sourcePos = Position.Right
        targetPos = Position.Left
      } else if (Math.abs(angle - Math.PI) < Math.PI / 4) {
        sourcePos = Position.Left
        targetPos = Position.Right
      } else if (angle > 0) {
        sourcePos = Position.Bottom
        targetPos = Position.Top
      } else {
        sourcePos = Position.Top
        targetPos = Position.Bottom
      }

      const parts = rel.targetKind.split(':')
      const entityTypeFull = parts[2] || parts.pop() || rel.targetKind
      const nodeLabel = entityTypeFull.includes('--')
        ? entityTypeFull.split('--')[1]
        : entityTypeFull

      const nodeId = `rel-${idx}`
      initialNodes.push({
        id: nodeId,
        type: 'entity',
        position: { x, y },
        data: {
          label: nodeLabel,
          targetKind: rel.targetKind,
          field: rel.field,
          category: rel.category,
          onNavigate: onNodeClick,
          sourcePosition: sourcePos,
          targetPosition: targetPos,
        },
      })

      initialEdges.push({
        id: `edge-${idx}`,
        source: 'root',
        target: nodeId,
        type: 'relationship',
        data: { label: rel.field },
        style: {
          stroke: rel.category === 'Technical' ? 'var(--muted-foreground)' : 'var(--primary)',
          strokeWidth: 1.5,
          opacity: rel.category === 'Technical' ? 0.15 : 0.4,
          strokeDasharray: rel.category === 'Technical' ? '5 5' : undefined,
        },
        animated: rel.category !== 'Technical',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: rel.category === 'Technical' ? 'var(--muted-foreground)' : 'var(--primary)',
        },
      })
    })

    setNodes(initialNodes)
    setEdges(initialEdges)

    setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 50)
  }, [rootLabel, filteredRelationships, fitView, onNodeClick, setNodes, setEdges, isMaximizedView])

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-muted/5 relative selection:bg-primary/10',
        !isMaximizedView
          ? 'rounded-3xl border border-border/40 overflow-hidden'
          : 'bg-background h-full w-full'
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.05}
        maxZoom={2}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          size={1}
          color={theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
        />

        <Panel position="top-left" className="m-4">
          <div className="flex items-center gap-3 bg-background/80 backdrop-blur-md border border-border/40 rounded-xl p-2.5 shadow-sm">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Network size={16} />
            </div>
            <div className="flex flex-col pr-2">
              <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none">
                Entity Topology
              </span>
              <h3 className="text-[11px] font-bold tracking-tight text-foreground mt-1">
                {rootLabel}
              </h3>
            </div>
          </div>
        </Panel>

        {/* Robust Positioning for Control Bar to avoid overlapping with Sheet/Dialog close buttons */}
        <Panel
          position="top-right"
          className={cn(
            'm-4 flex items-center gap-3 pointer-events-auto transition-all',
            isMaximizedView ? 'mt-10 mr-24' : 'mr-12'
          )}
        >
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 z-20 transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search relationships..."
              className={cn(
                'pl-10 rounded-xl bg-background/80 backdrop-blur-md border-border/40 h-10 text-xs font-bold transition-all shadow-sm focus:ring-4 focus:ring-primary/5',
                isMaximizedView ? 'w-64 focus:w-80' : 'w-40 focus:w-56'
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {!isMaximizedView && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-background border-border/40 shadow-sm hover:bg-muted"
              onClick={onToggleMaximize}
            >
              <Maximize2 size={14} />
            </Button>
          )}
        </Panel>

        <Controls
          showInteractive={false}
          className="!bg-background/80 !backdrop-blur-md !border-border/40 !rounded-lg !shadow-sm m-4 !p-0.5 overflow-hidden"
        />
      </ReactFlow>
    </div>
  )
}

export const DomainEntityGraph: React.FC<DomainEntityGraphProps> = (props) => {
  const [isMaximized, setIsMaximized] = useState(false)

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <GraphView
          {...props}
          isMaximizedView={false}
          onToggleMaximize={() => setIsMaximized(true)}
        />

        <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
          <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] p-0 border-border/40 bg-background overflow-hidden rounded-2xl shadow-2xl outline-none">
            <ReactFlowProvider>
              <GraphView
                {...props}
                isMaximizedView={true}
                onToggleMaximize={() => setIsMaximized(false)}
              />
            </ReactFlowProvider>
          </DialogContent>
        </Dialog>
      </ReactFlowProvider>
    </div>
  )
}
