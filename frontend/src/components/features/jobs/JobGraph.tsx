/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
  Position,
  useReactFlow,
  ControlButton,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { type PipelineRunDetailRead } from '@/lib/api';
import PipelineNode from '@/components/features/pipelines/PipelineNode';
import { mapOperatorToNodeType } from '@/lib/pipeline-definitions';
import { useTheme } from '@/hooks/useTheme';
import { StepRunInspector } from './StepRunInspector';
import { cn } from '@/lib/utils';
import { Target, Move, Lock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({ 
        rankdir: 'LR',
        align: 'UL',
        ranksep: 400,
        nodesep: 200
    });
    
    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 340, height: 200 }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: { x: nodeWithPosition.x - 140, y: nodeWithPosition.y - 50 },
        };
    });
};

interface JobGraphProps {
    run: PipelineRunDetailRead;
}

export const JobGraph: React.FC<JobGraphProps> = ({ run }) => {
    const { theme } = useTheme();
    const { fitView } = useReactFlow();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isDraggable, setIsDraggable] = useState(false);
    const flowTheme = useMemo(() => (theme === 'dark' ? 'dark' : 'light'), [theme]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onAutoLayout = useCallback(() => {
        setNodes((nds) => getLayoutedElements(nds, edges));
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
    }, [edges, fitView]);

    const nodeTypes = useMemo<NodeTypes>(() => ({
        source: PipelineNode,
        transform: PipelineNode,
        sink: PipelineNode,
        join: PipelineNode,
        union: PipelineNode,
        merge: PipelineNode,
        validate: PipelineNode,
        noop: PipelineNode,
        default: PipelineNode
    }), []);

    // Sync incoming data with local state
    useEffect(() => {
        if (!run.version) return;

        const statusMap: Record<string, string> = {};
        const stepRunDataMap: Record<string, any> = {};
        
        run.step_runs.forEach(sr => {
            const vNode = run.version?.nodes.find(n => String(n.id) === String(sr.node_id));
            if (vNode) {
                statusMap[String(vNode.node_id)] = sr.status;
                stepRunDataMap[String(vNode.node_id)] = sr;
            }
        });

        const newNodes: Node[] = run.version.nodes.map(n => {
            const status = statusMap[n.node_id] || 'pending';
            const sr = stepRunDataMap[n.node_id];
            const existingNode = nodes.find(en => en.id === n.node_id);
            
            const throughput = (sr?.records_out && sr?.duration_seconds && sr.duration_seconds > 0) 
                ? Math.round(sr.records_out / sr.duration_seconds) 
                : undefined;

            return {
                id: n.node_id,
                type: mapOperatorToNodeType(n.operator_type),
                data: {
                    label: n.name,
                    type: mapOperatorToNodeType(n.operator_type),
                    operator_class: n.operator_class,
                    status: status,
                    rowsProcessed: sr?.records_out,
                    duration: sr?.duration_seconds ? sr.duration_seconds * 1000 : undefined, // to ms
                    throughput: throughput,
                    error: sr?.error_message,
                    readOnly: true
                },
                // Preserve position if already exists, otherwise use config or zero
                position: existingNode?.position || (n as any).config?.ui?.position || { x: 0, y: 0 },
            };
        });

        const newEdges: Edge[] = run.version.edges.map(e => {
            const sourceStatus = statusMap[e.from_node_id];
            const isSourceRunning = sourceStatus === 'running';
            const isSourceSuccess = sourceStatus === 'success' || sourceStatus === 'completed';
            const isSourceFailed = sourceStatus === 'failed' || sourceStatus === 'error';
            
            let strokeColor = 'var(--color-primary)';
            let strokeWidth = 2;
            let opacity = 0.4;
            let filter = 'none';
            let animated = false;

            if (isSourceSuccess) {
                strokeColor = 'var(--color-chart-2)';
                opacity = 0.8;
            } else if (isSourceRunning) {
                strokeColor = 'var(--color-primary)';
                opacity = 1;
                strokeWidth = 3;
                animated = true;
                filter = 'drop-shadow(0 0 8px var(--color-primary))';
            } else if (isSourceFailed) {
                strokeColor = 'var(--color-destructive)';
                opacity = 0.8;
            }

            return {
                id: `e-${e.from_node_id}-${e.to_node_id}`,
                source: e.from_node_id,
                target: e.to_node_id,
                type: 'smoothstep',
                animated,
                style: { stroke: strokeColor, strokeWidth, opacity, filter, transition: 'all 0.4s ease' },
            };
        });

        // Always apply layout on load to ensure spacious separation
        const layouted = getLayoutedElements(newNodes, newEdges);
        setNodes(layouted);
        setEdges(newEdges);
    }, [run.id, run.step_runs]); // Re-run when ID or steps change

    const selectedStepRun = useMemo(() => {
        if (!selectedNodeId) return null;
        // Find the actual step run from incoming data
        const vNode = run.version?.nodes.find(n => n.node_id === selectedNodeId);
        if (!vNode) return null;
        return run.step_runs.find(sr => String(sr.node_id) === String(vNode.id));
    }, [selectedNodeId, run.step_runs]);

    const selectedNodeLabel = useMemo(() => {
        const node = nodes.find(n => n.id === selectedNodeId);
        return (node?.data as any)?.label || 'Node';
    }, [selectedNodeId, nodes]);

    return (
        <div className="flex-1 w-full h-full relative flex overflow-hidden bg-background/50">
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    colorMode={flowTheme}
                    fitView
                    nodesDraggable={isDraggable}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    onPaneClick={() => setSelectedNodeId(null)}
                    panOnScroll
                    selectionOnDrag={false}
                    zoomOnPinch
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.1}
                    maxZoom={4}
                >
                    <Background 
                        variant={BackgroundVariant.Dots} 
                        gap={20} 
                        size={1} 
                        color={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    />
                    <Panel position="top-right" className="flex gap-2">
                        <div className="flex bg-background/80 backdrop-blur-md p-1 rounded-xl border border-border/40 shadow-xl">
                            <Button 
                                variant={isDraggable ? "default" : "ghost"} 
                                size="sm" 
                                onClick={() => setIsDraggable(!isDraggable)}
                                className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                {isDraggable ? <Lock className="h-3 w-3" /> : <Move className="h-3 w-3" />}
                                {isDraggable ? 'Lock' : 'Edit'}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onAutoLayout}
                                className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Wand2 className="h-3 w-3 text-primary" />
                                Layout
                            </Button>
                        </div>
                    </Panel>
                    <Controls showInteractive={false}>
                        <ControlButton title="Reset View" onClick={() => fitView({ duration: 800, padding: 0.2 })}>
                            <Target className="h-4 w-4" />
                        </ControlButton>
                    </Controls>
                    <MiniMap style={{ opacity: 0.7 }} position="bottom-right" />
                </ReactFlow>
            </div>

            <div className={cn(
                "absolute inset-0 z-20 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)",
                selectedNodeId ? "translate-x-0" : "translate-x-full"
            )}>
                <StepRunInspector 
                    step={selectedStepRun} 
                    nodeLabel={selectedNodeLabel}
                    onClose={() => setSelectedNodeId(null)} 
                />
            </div>
        </div>
    );
};
