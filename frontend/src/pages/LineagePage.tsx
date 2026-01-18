import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, 
  Search, 
  Share2, 
  Layers,
  Zap,
  AlertTriangle,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';

import { getLineageGraph, getImpactAnalysis, getColumnLineage, getColumnImpact } from '@/lib/api/lineage';
import { AssetNode } from '@/components/features/lineage/AssetNode';
import GlowEdge from '@/components/features/pipelines/GlowEdge';
import { PageMeta } from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useZenMode } from '@/hooks/useZenMode';
import { useTheme } from '@/hooks/useTheme';
import { useLineagePathHighlight } from '@/hooks/useLineagePathHighlight';
import type { LineageGraph, LineageNode } from '@/lib/api/types';
import { useSearchParams } from 'react-router-dom';

// --- Types & Constants ---

type AssetNodeData = LineageNode['data'] & { label: string };

const nodeTypes = {
  asset: AssetNode,
};

const edgeTypes = {
    glow: GlowEdge,
};

const DAGRE_RANKING_OPTS = {
  rankdir: 'LR',
  align: 'UL',
  nodesep: 80,
  ranksep: 250, 
};

// --- Helper: Layout Graph ---
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph(DAGRE_RANKING_OPTS);
  g.setDefaultEdgeLabel(() => ({}));

  // Set nodes
  nodes.forEach((node) => {
    g.setNode(node.id, { width: 240, height: 120 }); // Approximate node dimensions
  });

  // Set edges
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 120, // center offset
        y: nodeWithPosition.y - 60,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface LineageGraphProps {
    graphData: LineageGraph | undefined;
}

const LineageGraphComponent = ({ graphData }: LineageGraphProps) => {
    const { fitView } = useReactFlow();
    const { theme } = useTheme();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const searchQuery = searchParams.get('q') || '';
    const assetId = searchParams.get('asset');

    const flowTheme = useMemo(() => (theme === 'dark' ? 'dark' : 'light'), [theme]);

    // Derived State
    const selectedAsset = useMemo(() => 
        assetId && nodes.length > 0 
            ? (nodes.find(n => n.id === assetId) as Node<AssetNodeData> || null) 
            : null
    , [assetId, nodes]);

    // 1. Fetch Impact Analysis when a node is selected
    const { data: impactData, isLoading: isLoadingImpact } = useQuery({
        queryKey: ['impact-analysis', selectedAsset?.data?.asset_id],
        queryFn: () => getImpactAnalysis(selectedAsset?.data?.asset_id as number),
        enabled: !!selectedAsset?.data?.asset_id,
    });

    // 2. Fetch Column Lineage when a column is selected
    const { data: colLineage, isLoading: isLoadingColLineage } = useQuery({
        queryKey: ['column-lineage', selectedAsset?.data?.asset_id, selectedColumn],
        queryFn: () => getColumnLineage(selectedAsset?.data?.asset_id as number, selectedColumn as string),
        enabled: !!selectedAsset?.data?.asset_id && !!selectedColumn,
    });

    // 2.5 Fetch Column Impact when a column is selected
    const { data: colImpact, isLoading: isLoadingColImpact } = useQuery({
        queryKey: ['column-impact', selectedAsset?.data?.asset_id, selectedColumn],
        queryFn: () => getColumnImpact(selectedAsset?.data?.asset_id as number, selectedColumn as string),
        enabled: !!selectedAsset?.data?.asset_id && !!selectedColumn,
    });

    // 3. Calculate highlights based on source data (prevents infinite loops with state)
    const { highlightedNodes, highlightedEdges } = useLineagePathHighlight(graphData?.edges || [], colLineage);
    
    // 4. Build & Layout Graph (Only on graphData or searchQuery changes)
    useEffect(() => {
        if (!graphData) return;

        const filteredNodes = graphData.nodes.filter(n => 
            searchQuery ? n.label.toLowerCase().includes(searchQuery.toLowerCase()) : true
        );
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        
        const rfNodes: Node[] = filteredNodes.map((n) => ({
            id: n.id,
            type: 'asset',
            data: { ...n.data, label: n.label },
            position: { x: 0, y: 0 } 
        }));

        const rfEdges: Edge[] = graphData.edges
            .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
            .map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                type: 'glow',
                animated: true,
                data: { 
                    status: 'active',
                    pipeline_id: e.data.pipeline_id
                },
                style: { strokeWidth: 2 },
            }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    }, [graphData, searchQuery, setNodes, setEdges, fitView]);

    // 5. Apply highlights to existing state (prevents layout jumping & loops)
    useEffect(() => {
        setNodes((nds) => 
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    isHighlighted: highlightedNodes.has(node.id),
                    hasActiveHighlight: highlightedNodes.size > 0
                }
            }))
        );

        setEdges((eds) => 
            eds.map((edge) => ({
                ...edge,
                animated: highlightedEdges.has(edge.id),
                data: {
                    ...edge.data,
                    isHighlighted: highlightedEdges.has(edge.id),
                    hasActiveHighlight: highlightedEdges.size > 0
                },
                style: {
                    ...edge.style,
                    strokeWidth: highlightedEdges.has(edge.id) ? 4 : 2,
                    zIndex: highlightedEdges.has(edge.id) ? 1000 : 0
                }
            }))
        );
    }, [highlightedNodes, highlightedEdges, setNodes, setEdges]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('asset', node.id);
            return next;
        });
        setSelectedColumn(null);
        fitView({ nodes: [{ id: node.id }], duration: 1000, padding: 2 });
    }, [fitView, setSearchParams]);

    const onPaneClick = useCallback(() => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('asset');
            return next;
        });
    }, [setSearchParams]);

    const handleCloseSidebar = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('asset');
            return next;
        });
    };

    return (
        <div className="h-full w-full relative group overflow-hidden bg-background/30 rounded-2xl border border-border">
            <div className="absolute inset-0 bg-grid-subtle opacity-10 pointer-events-none" />
            
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                colorMode={flowTheme}
                minZoom={0.1}
                maxZoom={4}
                proOptions={{ hideAttribution: true }}
                className="transition-colors duration-500"
            >
                <Background 
                    variant={BackgroundVariant.Lines} 
                    gap={24} 
                    size={1} 
                    color={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                />
                
                <Controls className="bg-background/40! backdrop-blur-xl! border-border/10! shadow-sm! rounded-xl! overflow-hidden m-4 border fill-foreground text-foreground transition-all hover:scale-105" showInteractive={false} />
                
                <MiniMap 
                    className="hidden md:block bg-background/40! backdrop-blur-xl! border-border/10! shadow-lg! rounded-2xl! overflow-hidden m-6 border" 
                    nodeColor={() => 'oklch(0.55 0.25 240)'}
                    maskColor={theme === 'dark' ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"}
                    style={{ opacity: 0.8, height: 120, width: 180 }}
                    position="bottom-right"
                />
            </ReactFlow>

            {/* Impact Analysis Sidebar */}
            <AnimatePresence>
                {selectedAsset && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute top-4 right-4 bottom-4 w-100 glass-panel rounded-2xl border-border/40 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden z-50 bg-background/80"
                    >
                        <div className="p-6 border-b border-border/40 bg-muted/20 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight mb-1">Impact Analysis</h2>
                                <p className="text-xs text-muted-foreground">Tracing dependencies for <span className="text-foreground font-bold">{selectedAsset.data.label}</span></p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleCloseSidebar}>
                                <Minimize2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                             {/* Section 1: Asset Details */}
                             <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Layers className="h-3 w-3" /> Asset Details
                                </h3>
                                <div className="p-4 rounded-xl bg-card/50 border border-border/40 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Type</span>
                                        <span className="font-medium capitalize">{selectedAsset.data.type}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Connection</span>
                                        <span className="font-medium capitalize">{selectedAsset.data.connection_type}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Rows (Est.)</span>
                                        <span className="font-mono">{selectedAsset.data.row_count?.toLocaleString() ?? '—'}</span>
                                    </div>
                                    {selectedAsset.data.fqn && (
                                        <div className="pt-2 border-t border-border/20 mt-2">
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Full Path</div>
                                            <div className="text-xs font-mono break-all opacity-80">{selectedAsset.data.fqn}</div>
                                        </div>
                                    )}
                                </div>
                             </div>

                             {/* Section 1.5: Trace Column & Impact */}
                             <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Search className="h-3 w-3 text-primary" /> Trace & Impact
                                </h3>
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                                    <Select value={selectedColumn || ''} onValueChange={setSelectedColumn}>
                                        <SelectTrigger className="h-9 glass-input rounded-xl text-xs shadow-none border-border/20 bg-background/50">
                                            <SelectValue placeholder="Select a column..." />
                                        </SelectTrigger>
                                        <SelectContent className="glass border-border/40 rounded-xl">
                                            {(selectedAsset.data as AssetNodeData).schema_metadata?.columns?.map((col: { name: string, type: string }) => (
                                                <SelectItem key={col.name} value={col.name} className="text-xs font-medium">
                                                    {col.name} <span className="opacity-40 text-[10px] ml-1">({col.type})</span>
                                                </SelectItem>
                                            )) || <div className="p-2 text-xs text-muted-foreground ">No schema metadata found.</div>}
                                        </SelectContent>
                                    </Select>

                                    {isLoadingColLineage || isLoadingColImpact ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                        </div>
                                    ) : selectedColumn && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                                            {/* Lineage (Backwards) */}
                                            {colLineage && (
                                                <div className="space-y-2">
                                                    <div className="text-[10px] font-bold uppercase text-muted-foreground/60">Upstream Origin</div>
                                                    <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
                                                        {/* Origin */}
                                                        <div className="flex gap-3 relative z-10">
                                                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center ring-4 ring-background shrink-0">
                                                                <Zap className="h-3 w-3 text-white" />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-bold uppercase text-primary tracking-tighter">Source</div>
                                                                <div className="text-xs font-bold">{colLineage.origin_column_name}</div>
                                                            </div>
                                                        </div>

                                                        {/* Path */}
                                                        {colLineage.path.map((flow, idx) => (
                                                            <div key={idx} className="flex gap-3 relative z-10 pl-0.5">
                                                                <div className="h-5 w-5 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center ring-4 ring-background shrink-0">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {flow.transformation_type} → {flow.target_column}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Impact (Forwards) */}
                                            {colImpact && (
                                                <div className="space-y-2">
                                                    <div className="text-[10px] font-bold uppercase text-destructive/60 flex items-center gap-1">
                                                        Downstream Impact
                                                    </div>
                                                    <div className="space-y-2">
                                                        {colImpact.impacts.length > 0 ? colImpact.impacts.map((imp, idx) => (
                                                            <div key={idx} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10 text-[11px] space-y-1">
                                                                <div className="flex justify-between items-start">
                                                                    <span className="font-bold text-foreground/80">{imp.column_name}</span>
                                                                    <Badge variant="outline" className="text-[8px] h-3 px-1 border-destructive/20 text-destructive">{imp.transformation_type}</Badge>
                                                                </div>
                                                                <div className="text-muted-foreground flex items-center gap-1">
                                                                    <Layers className="h-2 w-2" /> {imp.asset_name}
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-[10px] text-muted-foreground italic px-1">No downstream impacts detected.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                             </div>

                             {/* Section 2: Downstream Pipelines */}
                             <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Zap className="h-3 w-3 text-amber-500" /> Downstream Pipelines
                                </h3>
                                {isLoadingImpact ? (
                                    <div className="space-y-2">
                                        <div className="h-10 rounded-lg bg-muted animate-pulse" />
                                        <div className="h-10 rounded-lg bg-muted animate-pulse delay-75" />
                                    </div>
                                ) : impactData?.downstream_pipelines && impactData.downstream_pipelines.length > 0 ? (
                                    <div className="space-y-2">
                                        {impactData.downstream_pipelines.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors cursor-pointer group/item">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", p.status === 'active' ? "bg-emerald-500" : "bg-muted-foreground")} />
                                                    <span className="text-sm font-bold text-foreground/80 group-hover/item:text-primary">{p.name}</span>
                                                </div>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover/item:translate-x-1 transition-transform group-hover/item:text-primary" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                                        No downstream pipelines found. This is a terminal node.
                                    </div>
                                )}
                             </div>

                             {/* Section 3: Affected Assets */}
                             <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <AlertTriangle className="h-3 w-3 text-destructive" /> Affected Assets
                                </h3>
                                {impactData?.downstream_assets && impactData.downstream_assets.length > 0 ? (
                                    <div className="space-y-2">
                                        {impactData.downstream_assets.map((a) => (
                                            <div key={a.id} className="p-3 rounded-xl bg-muted/30 border border-border/40 text-sm font-medium flex items-center gap-2">
                                                <div className="p-1 rounded bg-background border border-border/50">
                                                    <Layers className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                                {a.name}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground  px-2">No downstream assets impacted.</div>
                                )}
                             </div>
                        </div>

                        <div className="p-4 border-t border-border/40 bg-background/50 backdrop-blur-xl">
                            <Button className="w-full rounded-xl font-bold shadow-lg shadow-primary/20 gap-2">
                                <Maximize2 className="h-4 w-4" /> View Full Details
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const LineagePage = () => {
    const { isZenMode } = useZenMode();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('q') || '';

    const setSearchQuery = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('q', val);
            else next.delete('q');
            return next;
        });
    };

    // Fetch Graph Data
    const { data: graphData, isLoading, refetch } = useQuery({
        queryKey: ['lineage-graph'],
        queryFn: getLineageGraph,
        staleTime: 60000, 
    });

    return (
        <motion.div 
            layout
            className={cn(
                "flex flex-col h-full w-full gap-6 md:gap-8 px-1",
                isZenMode ? "fixed inset-0 z-50 bg-background p-4 pt-2" : "relative pb-6"
            )}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <AnimatePresence mode="popLayout">
                {!isZenMode && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="shrink-0 overflow-hidden"
                    >
                        <PageMeta title="Data Lineage" description="Visualize and trace data dependencies across your ecosystem." />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Toolbar Section */}
            <motion.div layout className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 p-0.5">
                <div className="flex items-center gap-3">
                    <div className="glass-panel px-4 py-2 rounded-xl border border-border/50 flex items-center gap-4 bg-background/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <h1 className="font-semibold text-foreground flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-primary" />
                                SynqX Map
                            </h1>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{graphData?.stats?.total_nodes || 0}</span> Assets
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{graphData?.stats?.total_edges || 0}</span> Flows
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-2 lg:flex">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span>Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span>Warning</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            <span>Critical</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                     <div className="relative group w-full md:w-60">
                        <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Find assets..." 
                            className="pl-9 h-9 rounded-xl bg-background border-border/50 focus:ring-primary/10 hover:bg-background/80 transition-all text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50 hover:bg-muted" onClick={() => refetch()}>
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </motion.div>

            <motion.div layout className="flex-1 min-h-0 w-full relative">
                 {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/20">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <p className="text-muted-foreground font-medium animate-pulse">Mapping Data Universe...</p>
                    </div>
                 ) : (
                    <ReactFlowProvider>
                        <LineageGraphComponent graphData={graphData} />
                    </ReactFlowProvider>
                 )}
            </motion.div>
        </motion.div>
    );
};

