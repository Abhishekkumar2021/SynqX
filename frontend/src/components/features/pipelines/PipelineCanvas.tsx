/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import '@xyflow/react/dist/style.css'; 

import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  type NodeTypes,
  Position,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Save, Play, ArrowLeft, Loader2, Layout, 
    Rocket, Square, Pencil, History as HistoryIcon,
    ExternalLink, Trash2, Plus, Undo, Redo } from 'lucide-react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import dagre from 'dagre';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useUndoRedo } from '@/hooks/useUndoRedo';

import { 
    DropdownMenu, 
    DropdownMenuTrigger, 
    DropdownMenuContent, 
    DropdownMenuItem, 
} from '@/components/ui/dropdown-menu';

// API Imports
import { 
    getPipeline, 
    updatePipeline,
    createPipeline,
    triggerPipeline, 
    createPipelineVersion, 
    publishPipelineVersion,
    getPipelineVersion,
    deletePipeline,
    getPipelineVersions,
    type PipelineNode as ApiNode, 
    type PipelineEdge as ApiEdge,
    type PipelineCreate
} from '@/lib/api';

// Custom Components
import PipelineNode from '@/components/features/pipelines/PipelineNode'; 
import GlowEdge from '@/components/features/pipelines/GlowEdge';
import { NodeProperties } from '@/components/features/pipelines/NodeProperties';

const edgeTypes = {
    glow: GlowEdge,
};
import { PipelineVersionDialog } from '@/components/features/pipelines/PipelineVersionDialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
    NODE_DEFINITIONS, 
    mapOperatorToNodeType, 
    mapNodeTypeToOperator 
} from '@/lib/pipeline-definitions';

/* --- Layout Engine --- */
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 180, nodesep: 80 });
    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 340, height: 200 }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            position: { x: nodeWithPosition.x - 140, y: nodeWithPosition.y - 50 },
        };
    });
    return { nodes: layoutedNodes, edges };
};

export const PipelineCanvas: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const versionIdParam = searchParams.get('version');
  
  const isNew = id === 'new';
  const queryClient = useQueryClient();
  const { fitView } = useReactFlow();
  const { theme } = useTheme();
  
  // State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { undo, redo, takeSnapshot, canUndo, canRedo } = useUndoRedo();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineName, setPipelineName] = useState("Untitled Pipeline");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const initializedVersionId = useRef<number | null>(null);

  const flowTheme = useMemo(() => (theme === 'dark' ? 'dark' : 'light'), [theme]);

  // --- Queries ---
  const { data: pipeline, isLoading: isLoadingPipeline } = useQuery({  
      queryKey: ['pipeline', id], 
      queryFn: () => getPipeline(parseInt(id!)), 
      enabled: !isNew 
  });

  const { data: specificVersion, isLoading: isLoadingVersion } = useQuery({
      queryKey: ['pipeline-version', id, versionIdParam],
      queryFn: () => getPipelineVersion(parseInt(id!), parseInt(versionIdParam!)),
      enabled: !isNew && !!versionIdParam
  });

  const isLoading = isLoadingPipeline || (!!versionIdParam && isLoadingVersion);

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

  const [opSearch, setOpSearch] = useState("");

  const filteredDefinitions = useMemo(() => {
      if (!opSearch) return NODE_DEFINITIONS;
      return NODE_DEFINITIONS.map(category => ({
          ...category,
          items: category.items.filter(item => 
              item.label.toLowerCase().includes(opSearch.toLowerCase()) ||
              item.desc.toLowerCase().includes(opSearch.toLowerCase())
          )
      })).filter(category => category.items.length > 0);
  }, [opSearch]);

  // --- Mutations ---
  const deleteMutation = useMutation({
      mutationFn: () => deletePipeline(parseInt(id!)),
      onSuccess: () => {
          toast.success("Pipeline Deleted", {
              description: `"${pipelineName}" has been permanently removed.`
          });
          queryClient.invalidateQueries({ queryKey: ['pipelines'] });
          navigate('/pipelines');
      },
      onError: (err: any) => {
          toast.error("Deletion Failed", {
              description: err.response?.data?.detail?.message || "There was an error deleting the pipeline."
          });
      }
  });

  // --- Initialization ---
  useEffect(() => {
    if (!pipeline) return;
    
    // Determine which version to load:
    // 1. Specifically requested one (?version=X)
    // 2. The latest version (most recent work/draft)
    // 3. The published version (active)
    const versionToLoad = specificVersion || pipeline.latest_version || pipeline.published_version;
    
    if (!versionToLoad) {
        setPipelineName(pipeline.name);
        return;
    }

    if (initializedVersionId.current === versionToLoad.id) return;
    
    initializedVersionId.current = versionToLoad.id;
    setPipelineName(pipeline.name);
    
    const flowNodes: Node[] = versionToLoad.nodes.map((n: ApiNode) => ({
        id: n.node_id, 
        type: mapOperatorToNodeType(n.operator_type), 
        data: { 
            label: n.name, 
            config: n.config,
            type: mapOperatorToNodeType(n.operator_type),
            operator_class: n.operator_class,
            status: 'idle',
            source_asset_id: n.source_asset_id,
            destination_asset_id: n.destination_asset_id,
            connection_id: n.connection_id || n.config?.connection_id
        },
        position: n.config?.ui?.position || { x: 0, y: 0 },
    }));

    const flowEdges: Edge[] = versionToLoad.edges.map((e: ApiEdge) => ({
        id: `e-${e.from_node_id}-${e.to_node_id}`,
        source: e.from_node_id,
        target: e.to_node_id,
        type: 'glow', 
        animated: false,
        style: { strokeWidth: 2 },
    }));

    // Always apply layout on initial mount to ensure clean structure
    const layouted = getLayoutedElements(flowNodes, flowEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    
    setTimeout(() => window.requestAnimationFrame(() => fitView({ padding: 0.2 })), 100);
  }, [pipeline, specificVersion, setNodes, setEdges, fitView]);

  // --- Handlers ---
  const onConnect = useCallback(
    (params: Connection) => {
        takeSnapshot(nodes, edges);
        setEdges((eds) => addEdge({ 
            ...params, 
            type: 'glow', 
            animated: true, 
        }, eds));
    },
    [setEdges, nodes, edges, takeSnapshot],
  );

  const onAddNode = (type: string, operatorClass?: string, label?: string) => {
      takeSnapshot(nodes, edges);
      const newNodeId = `node_${Date.now()}`;
      // Center the node somewhat in the view or randomize slightly
      const offset = Math.random() * 50; 
      const newNode: Node = {
          id: newNodeId,
          type: type,
          position: { x: 250 + offset, y: 250 + offset },
          data: { 
              label: label || `New ${type}`, 
              type: type, 
              operator_class: operatorClass || 'pandas_transform',
              config: {}, 
              status: 'idle' 
          },
      };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNodeId);
      toast.success("Operator Added", { 
          description: `Added ${label} to the canvas.` 
      });
  };

  const onDuplicate = useCallback((node: Node) => {
      takeSnapshot(nodes, edges);
      const newNodeId = `node_${Date.now()}`;
      const newNode: Node = {
          ...node,
          id: newNodeId,
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          data: {
              ...node.data,
              label: `${node.data.label} (Copy)`,
              status: 'idle'
          },
          selected: true
      };
      
      setNodes((nds) => [...nds.map(n => ({...n, selected: false})), newNode]);
      setSelectedNodeId(newNodeId);
      toast.success("Operator Duplicated", {
          description: `Created copy of ${node.data.label}`
      });
  }, [nodes, edges, takeSnapshot, setNodes]);

  // Undo/Redo & Duplicate Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        // Check if we are typing in an input (ignore shortcuts)
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
            if (event.shiftKey) {
                redo(nodes, edges, setNodes, setEdges);
            } else {
                undo(nodes, edges, setNodes, setEdges);
            }
            event.preventDefault();
        } else if ((event.metaKey || event.ctrlKey) && event.key === 'y') {
            redo(nodes, edges, setNodes, setEdges);
            event.preventDefault();
        } else if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
            if (selectedNodeId) {
                const nodeToDuplicate = nodes.find(n => n.id === selectedNodeId);
                if (nodeToDuplicate) {
                    onDuplicate(nodeToDuplicate);
                    event.preventDefault();
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, nodes, edges, setNodes, setEdges, selectedNodeId, onDuplicate]);

  const onLayout = useCallback(() => {
      takeSnapshot(nodes, edges);
      const layouted = getLayoutedElements([...nodes], [...edges]);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setTimeout(() => window.requestAnimationFrame(() => fitView({ duration: 800, padding: 0.2 })), 10);
  }, [nodes, edges, setNodes, setEdges, fitView, takeSnapshot]);

  const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
      if (event.altKey) {
          takeSnapshot(nodes, edges);
          const newNodeId = `node_${Date.now()}`;
          const newNode: Node = {
              ...JSON.parse(JSON.stringify(node)),
              id: newNodeId,
              selected: false,
              dragging: false,
          };
          setNodes((nds) => [...nds, newNode]);
          toast.success("Operator Cloned", {
              description: "Alt + Drag created a copy"
          });
      } else {
          takeSnapshot(nodes, edges);
      }
  }, [nodes, edges, takeSnapshot, setNodes]);

  // --- Mutations ---
  const runMutation = useMutation({
      mutationFn: () => triggerPipeline(parseInt(id!)),
      onMutate: () => setIsRunning(true),
      onSuccess: (data) => {
          toast.success("Pipeline Started", {
              description: `Execution is now running in the background. Job ID: ${data.job_id}`
          });
          setTimeout(() => setIsRunning(false), 3000); 
      },
      onError: (err: any) => {
          toast.error("Execution Failed", {
              description: err.response?.data?.detail?.message || "There was an error starting the pipeline."
          });
          setIsRunning(false);
      }
  });

  const saveMutation = useMutation({
      mutationFn: async ({ deploy = false }: { deploy?: boolean }) => {
          try {
              setIsSaving(true);
              
              const apiNodes = nodes.map(n => {
                  const nodeData = n.data as any;
                  return {
                      node_id: n.id,
                      name: nodeData.label as string,
                      operator_type: mapNodeTypeToOperator(n.type || 'default', nodeData.operator_class),
                      config: { 
                          ...(nodeData.config as object), 
                          ui: { position: n.position },
                          connection_id: nodeData.connection_id 
                      },
                      order_index: 0, 
                      operator_class: (nodeData.operator_class as string) || 'pandas_transform',
                      source_asset_id: nodeData.source_asset_id,
                      destination_asset_id: nodeData.destination_asset_id
                  };
              });

              const apiEdges = edges.map(e => ({ from_node_id: e.source, to_node_id: e.target }));

              if (isNew) {
                  const payload: PipelineCreate = {
                      name: pipelineName || "New Pipeline",
                      initial_version: {
                          nodes: apiNodes,
                          edges: apiEdges,
                          version_notes: "Initial draft"
                      }
                  };
                  const createdPipeline = await createPipeline(payload);
                  
                  if (deploy && createdPipeline.current_version) {
                      // Initial version number is 1, but we need the ID
                      const versions = await getPipelineVersions(createdPipeline.id);
                      if (versions.length > 0) {
                          await publishPipelineVersion(createdPipeline.id, versions[0].id);
                      }
                  }
                  
                  return { type: 'create', pipeline: createdPipeline };
              } else {
                  const newVersion = await createPipelineVersion(parseInt(id!), {
                      nodes: apiNodes,
                      edges: apiEdges,
                      version_notes: deploy ? `Deployed at ${new Date().toLocaleTimeString()}` : 'Auto-save'
                  });
                  
                  if (deploy) await publishPipelineVersion(parseInt(id!), newVersion.id);
                  if (pipelineName !== pipeline?.name) await updatePipeline(parseInt(id!), { name: pipelineName });
                  return { type: 'update' };
              }
          } catch (error) {
              console.error("Mutation function error:", error);
              throw error;
          }
      },
      onSuccess: (result, vars) => {
          if (result.type === 'create' && result.pipeline) {
              toast.success("Pipeline Created", {
                  description: `"${pipelineName}" has been successfully initialized.`
              });
              window.history.replaceState(null, '', `/pipelines/${result.pipeline.id}`);
              window.location.reload(); 
          } else {
              if (pipeline) initializedVersionId.current = pipeline.published_version_id || null;
              queryClient.invalidateQueries({ queryKey: ['pipeline', id] });
              queryClient.invalidateQueries({ queryKey: ['pipelines'] });
              toast.success(vars.deploy ? "Successfully Deployed" : "Draft Saved", {
                  description: vars.deploy 
                    ? "Your changes are now live and will be used for future runs." 
                    : "Work-in-progress changes have been saved."
              });
          }
      },
      onSettled: () => {
          setIsSaving(false);
      },
      onError: (err: any) => {
          toast.error("Save Failed", { 
              description: err.response?.data?.detail?.message || err.message || "An unexpected error occurred while saving." 
          });
      }
  });

  if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium tracking-widest uppercase opacity-70">Loading Canvas...</p>
      </div>
  );

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full w-full p-2 md:p-4 gap-4">

      {/* --- HEADER TOOLBAR (Simplified) --- */}
      <header className="flex-none flex items-center justify-between px-2">
          
          {/* Left: Identity */}
          <div className="flex items-center gap-4">
              <Link to="/pipelines">
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted/50">
                                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>Back to List</TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </Link>
              
              <div className="flex flex-col gap-0.5">
                  <div className="relative group flex items-center">
                    <Input 
                        value={pipelineName}
                        onChange={(e) => setPipelineName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="
                            h-9 w-[200px] md:w-[260px] 
                            bg-transparent border-none shadow-none 
                            text-base font-semibold tracking-tight 
                            px-3 rounded-lg
                            transition-all duration-200 
                            text-foreground
                            placeholder:text-muted-foreground/50
                            hover:bg-foreground/5 
                            focus-visible:bg-foreground/5 focus-visible:ring-1 focus-visible:ring-primary/20
                            truncate pr-9 cursor-text
                        "
                    />
                    <div className="absolute right-3 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground px-2">
                      <Badge variant="outline" className={cn(
                          "h-4 px-1.5 font-mono border-0 text-[10px]",
                          pipeline?.status === 'active' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      )}>
                          {isNew ? 'DRAFT' : pipeline?.status?.toUpperCase()}
                      </Badge>
                      <span className="hidden sm:inline">
                          {isNew ? 'v1' : `v${versionIdParam || pipeline?.latest_version?.version || pipeline?.published_version?.version || '?'}`}
                      </span>
                      {!isNew && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 rounded-md hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1.5"
                            onClick={() => setVersionsOpen(true)}
                        >
                            <HistoryIcon className="h-3 w-3" />
                            <span>History</span>
                        </Button>
                      )}
                  </div>
              </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {!isNew && (
                <div className="flex items-center gap-2">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                     {isRunning ? (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-9 rounded-full px-4 gap-2 animate-in fade-in"
                            onClick={() => setIsRunning(false)}
                        >
                            <Square className="h-3.5 w-3.5 fill-current" />
                            <span className="hidden sm:inline">Stop</span>
                        </Button>
                     ) : (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 rounded-full border-success/20 text-success hover:text-success hover:bg-success/5 hover:border-success/40 gap-2"
                            onClick={() => runMutation.mutate()}
                            disabled={runMutation.isPending}
                        >
                            {runMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Play className="h-3.5 w-3.5 fill-current" />}
                            <span className="hidden sm:inline">Run</span>
                        </Button>
                     )}
                </div>
            )}
             
            <div className="flex items-center gap-2">
                 <Button 
                    variant="secondary"
                    size="sm" 
                    onClick={() => saveMutation.mutate({ deploy: false })} 
                    disabled={isSaving || !!versionIdParam}
                    className="h-9 rounded-full px-4 font-medium"
                >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Draft</span>
                </Button>
                 <Button 
                    size="sm" 
                    onClick={() => saveMutation.mutate({ deploy: true })} 
                    disabled={isSaving || !!versionIdParam}
                    className="h-9 rounded-full px-5 shadow-lg shadow-primary/20 bg-primary text-primary-foreground font-semibold hover:shadow-primary/30 transition-all gap-2"
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Rocket className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Deploy</span>
                </Button>
             </div>
          </div>
      </header>

      {/* --- CANVAS --- */}
      <div className="flex-1 w-full relative glass-panel rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-background/50">
          <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none" />

          {/* Historical Version Banner - Relocated to Bottom for better UX */}
          {versionIdParam && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-100 w-fit min-w-[400px] max-w-[90%] bg-background/60 backdrop-blur-2xl border border-primary/30 rounded-2xl px-6 py-4 flex items-center justify-between gap-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500 ring-1 ring-white/5">
                  <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                          <HistoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Read-Only Snapshot</span>
                            <Badge className="h-4 px-1.5 bg-primary/20 text-primary border-none text-[9px] font-black">v{versionIdParam}</Badge>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">You are inspecting a historical state. Edits are disabled.</span>
                      </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/pipelines/${id}`)}
                    className="h-10 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 gap-2 text-[10px] font-black uppercase tracking-widest px-4 group"
                  >
                      Exit View <ExternalLink className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
                  </Button>
              </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onNodeDragStart={onNodeDragStart}
            onNodesDelete={() => takeSnapshot(nodes, edges)}
            onEdgesDelete={() => takeSnapshot(nodes, edges)}
            colorMode={flowTheme}
            minZoom={0.1}
            maxZoom={4}
                        defaultEdgeOptions={{
                            type: 'glow',
                            style: { strokeWidth: 3 }
                        }}
                        proOptions={{ hideAttribution: true }}
                        className="transition-colors duration-500"
                      >
                        <Background 
                            variant={BackgroundVariant.Lines} 
                            gap={40} 
                            size={1} 
                            color={theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                        />
                        
                        <Controls className="bg-background/60! backdrop-blur-2xl! border-border/20! shadow-2xl! rounded-2xl! overflow-hidden m-6 border fill-foreground text-foreground transition-all hover:scale-105" showInteractive={false} />
                        
                        <MiniMap 
                            className="hidden md:block bg-background/40! backdrop-blur-2xl! border-border/20! shadow-2xl! rounded-3xl! overflow-hidden m-8 border" 
                            nodeColor={(node) => {
                                if (node.type === 'source') return 'oklch(0.55 0.25 240)';
                                if (node.type === 'sink') return 'oklch(0.62 0.19 145)';
                                if (node.type === 'validate') return 'oklch(0.55 0.2 300)';
                                return 'oklch(0.7 0.18 55)';
                            }}
                            maskColor="rgba(0,0,0,0.1)"
                            style={{ opacity: 0.9, height: 140, width: 200 }}
                            position="bottom-right"
                        />
            {/* FLOATING TOOLBOX PANEL */}
            <Panel position="top-center" className="mt-8 pointer-events-none">
                <div className="flex items-center p-2 gap-2 glass-panel rounded-4xl! shadow-2xl pointer-events-auto border-border/20 bg-background/60 backdrop-blur-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/20 hover:border-primary/30 hover:bg-background/80 ring-1 ring-white/5">
                    
                    {/* Primary Controls Group */}
                    <div className="flex items-center gap-1.5 pr-3 border-r border-border/10 mr-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group" onClick={() => undo(nodes, edges, setNodes, setEdges)} disabled={!canUndo}>
                                        <Undo className="h-5 w-5 group-active:scale-90" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group" onClick={() => redo(nodes, edges, setNodes, setEdges)} disabled={!canRedo}>
                                        <Redo className="h-5 w-5 group-active:scale-90" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group" onClick={onLayout}>
                                        <Layout className="h-5 w-5 group-active:scale-90" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Auto-Layout Canvas</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Unified Add Node Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                className="h-10 rounded-2xl px-5 gap-2.5 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:-translate-y-0.5"
                            >
                                <Plus className="h-4 w-4 stroke-3" /> Add Operator
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                            align="center" 
                            sideOffset={10}
                            className="w-64 bg-background/80 backdrop-blur-md border-border/20 shadow-xl rounded-xl p-1.5 ring-1 ring-white/10"
                        >
                            <div className="px-2 py-2 mb-1">
                                <div className="relative group">
                                    <Plus className="z-20 absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="Search..." 
                                        value={opSearch}
                                        onChange={(e) => setOpSearch(e.target.value)}
                                        className="h-8 pl-8 rounded-lg bg-muted/30 border-none text-xs focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:text-[10px]"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1 space-y-2 pb-1">
                                {filteredDefinitions.length === 0 ? (
                                    <div className="py-8 text-center flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground/30">
                                            <Plus className="h-4 w-4 rotate-45" />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">No matches</span>
                                    </div>
                                ) : (
                                    filteredDefinitions.map((category, idx) => (
                                        <div key={idx} className="space-y-0.5">
                                            <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 flex items-center gap-2">
                                                {category.category}
                                                <div className="h-px flex-1 bg-border/20" />
                                            </div>
                                            {category.items.map((item, i) => (
                                                <DropdownMenuItem 
                                                    key={i}
                                                    className="group flex items-center gap-3 p-2 rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer transition-all duration-200"
                                                    onClick={() => onAddNode(item.type, (item as any).opClass, item.label)}
                                                >
                                                    <div className={cn(
                                                        "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center border transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm",
                                                        item.type === 'source' ? "bg-chart-1/10 border-chart-1/20 text-chart-1" :
                                                        item.type === 'sink' ? "bg-chart-2/10 border-chart-2/20 text-chart-2" :
                                                        item.type === 'validate' ? "bg-chart-4/10 border-chart-4/20 text-chart-4" :
                                                        ['join', 'union', 'merge'].includes(item.type) ? "bg-chart-5/10 border-chart-5/20 text-chart-5" :
                                                        "bg-chart-3/10 border-chart-3/20 text-chart-3"
                                                    )}>
                                                        <item.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                                        <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
                                                        <span className="text-[9px] text-muted-foreground/60 group-hover:text-primary/60 truncate leading-none">{item.desc}</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </Panel>
          </ReactFlow>

          {/* Properties Inspector */}
          <div className={cn(
              "absolute top-0 right-0 w-full md:w-[450px] h-full glass-panel rounded-none! shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-100 transition-all duration-700 cubic-bezier(0.32, 0.72, 0, 1) border-l border-border/20",
              selectedNode ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
          )}>
              {selectedNode && (
                <NodeProperties 
                    node={selectedNode} 
                    onUpdate={(id, newData) => {
                        takeSnapshot(nodes, edges);
                        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));
                        setSelectedNodeId(null);
                    }}
                    onDelete={(id) => {
                        takeSnapshot(nodes, edges);
                        setNodes(nds => nds.filter(n => n.id !== id));
                        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
                        setSelectedNodeId(null);
                    }}
                    onDuplicate={onDuplicate}
                    onClose={() => setSelectedNodeId(null)}
                />
              )}
          </div>
      </div>

      {!isNew && (
        <>
            <PipelineVersionDialog 
                pipelineId={parseInt(id!)} 
                pipelineName={pipelineName}
                open={versionsOpen} 
                onOpenChange={setVersionsOpen} 
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[2rem] border-border/40 bg-background/95 backdrop-blur-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-medium">
                            This action cannot be undone. This will permanently delete the pipeline 
                            <span className="font-bold text-foreground"> "{pipelineName}" </span>
                            and all its historical versions and run logs.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                        >
                            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Forever
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}
    </div>
  );
};
