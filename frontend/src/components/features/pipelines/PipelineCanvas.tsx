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
    ExternalLink, Trash2, Plus, Undo, Redo,
    Code, FileCode, GitCompare, XCircle, Info as InfoIcon,
    X,
    Search
} from 'lucide-react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import dagre from 'dagre';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useWorkspace } from '@/hooks/useWorkspace';
import { RetryStrategy } from '@/lib/enums';
import Editor from '@monaco-editor/react';

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
    getPipelineDiff,
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
import { DeployCommitDialog } from '@/components/features/pipelines/DeployCommitDialog';
import { PipelineVersionDialog } from '@/components/features/pipelines/PipelineVersionDialog';

const edgeTypes = {
    glow: GlowEdge,
};
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
    mapNodeTypeToOperator,
    type OperatorDefinition
} from '@/lib/pipeline-definitions';
import { type AppNode } from '@/types/pipeline';

/* --- Layout Engine --- */
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: AppNode[], edges: Edge[]) => {
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
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const versionIdParam = searchParams.get('version');
    const isDiffMode = searchParams.get('diff') === 'true';
    const baseV = searchParams.get('base');
    const targetV = searchParams.get('target');

    // URL Synced State
    const selectedNodeId = searchParams.get('node');
    const showLogicView = searchParams.get('view') === 'logic';

    const setSelectedNodeId = (nodeId: string | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (nodeId) next.set('node', nodeId);
            else next.delete('node');
            return next;
        });
    };

    const setShowLogicView = (show: boolean) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (show) next.set('view', 'logic');
            else next.delete('view');
            
            // If showing logic view, clear selection to avoid overlap confusion
            if (show) next.delete('node'); 
            return next;
        });
    };

    const openNodeProperties = (nodeId: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('node', nodeId);
            next.delete('view');
            return next;
        });
    };

    const isNew = id === 'new';
    const queryClient = useQueryClient();
    const { fitView } = useReactFlow();
    const { theme } = useTheme();
    const { isAdmin, isEditor } = useWorkspace();

    // State
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { undo, redo, takeSnapshot, canUndo, canRedo } = useUndoRedo<AppNode>();
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [pipelineName, setPipelineName] = useState("Untitled Pipeline");
    const [versionsOpen, setVersionsOpen] = useState(false);
    const [deployDialogOpen, setDeployDialogOpen] = useState(false);
    const [diffData, setDiffData] = useState<any>(null);
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

    const { isLoading: isLoadingDiff } = useQuery({
        queryKey: ['pipeline-diff', id, baseV, targetV],
        queryFn: async () => {
            const data = await getPipelineDiff(parseInt(id!), parseInt(baseV!), parseInt(targetV!));
            setDiffData(data);
            return data;
        },
        enabled: !isNew && isDiffMode && !!baseV && !!targetV
    });

    const isLoading = isLoadingPipeline || (!!versionIdParam && isLoadingVersion) || (isDiffMode && isLoadingDiff);

    const nodeTypes = useMemo<NodeTypes>(() => ({
        source: PipelineNode,
        transform: PipelineNode,
        sink: PipelineNode,
        join: PipelineNode,
        union: PipelineNode,
        merge: PipelineNode,
        validate: PipelineNode,
        noop: PipelineNode,
        sub_pipeline: PipelineNode,
        default: PipelineNode
    }), []);

    const [opSearch, setOpSearch] = useState("");
    const [canvasSearch, setCanvasSearch] = useState("");

    // --- Search in Canvas ---
    const filteredNodes = useMemo(() => {
        if (!canvasSearch) return nodes;
        return nodes.map(n => ({
            ...n,
            selected: n.data.label?.toLowerCase().includes(canvasSearch.toLowerCase()) || n.id.toLowerCase().includes(canvasSearch.toLowerCase())
        }));
    }, [nodes, canvasSearch]);

    const onCanvasSearch = (val: string) => {
        setCanvasSearch(val);
        if (val) {
            const match = nodes.find(n => n.data.label.toLowerCase().includes(val.toLowerCase()));
            if (match) {
                fitView({ nodes: [match], duration: 800, padding: 0.5 });
            }
        }
    };

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

    const pipelinePayload = useMemo(() => {
        const apiNodes = nodes.map(n => {
            const nodeData = n.data;
            return {
                node_id: n.id,
                name: nodeData.label,
                operator_type: mapNodeTypeToOperator(n.type || 'default', nodeData.operator_class),
                config: {
                    ...(nodeData.config),
                    ui: { position: n.position },
                },
                operator_class: nodeData.operator_class
            };
        });

        const apiEdges = edges.map(e => ({
            from_node_id: e.source,
            to_node_id: e.target,
            edge_type: 'data_flow'
        }));

        return {
            name: pipelineName,
            version: versionIdParam || 'Draft',
            nodes: apiNodes,
            edges: apiEdges
        };
    }, [nodes, edges, pipelineName, versionIdParam]);

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

    useEffect(() => {
        if (!pipeline) return;

        // 1. Handle Diff Mode
        if (isDiffMode && diffData) {
            setPipelineName(pipeline.name);
            const loadDiff = async () => {
                // Target version is the 'Current' state we are looking at
                const vData = await getPipelineVersion(parseInt(id!), parseInt(targetV!));
                const bData = await getPipelineVersion(parseInt(id!), parseInt(baseV!));

                const flowNodes: AppNode[] = vData.nodes.map((n: ApiNode) => {
                    let diffStatus: 'added' | 'removed' | 'modified' | 'none' = 'none';
                    if (diffData.nodes.added.includes(n.node_id)) diffStatus = 'added';
                    if (diffData.nodes.modified.some((m: any) => m.node_id === n.node_id)) diffStatus = 'modified';

                    return {
                        id: n.node_id,
                        type: mapOperatorToNodeType(n.operator_type),
                        data: {
                            label: n.name,
                            config: n.config,
                            type: mapOperatorToNodeType(n.operator_type),
                            operator_class: n.operator_class,
                            status: 'idle',
                            diffStatus: diffStatus,
                            diffInfo: diffData.nodes.modified.find((m: any) => m.node_id === n.node_id),
                            sub_pipeline_id: n.sub_pipeline_id,
                            is_dynamic: n.is_dynamic,
                            mapping_expr: n.mapping_expr,
                            worker_tag: n.worker_tag,
                            guardrails: n.guardrails,
                            readOnly: true,
                        },
                        position: n.config?.ui?.position || { x: 0, y: 0 },
                    };
                });

                // Add removed nodes as 'ghosts' from the base version
                bData.nodes.forEach((n: ApiNode) => {
                    if (diffData.nodes.removed.includes(n.node_id)) {
                        flowNodes.push({
                            id: n.node_id,
                            type: mapOperatorToNodeType(n.operator_type),
                            data: {
                                label: n.name,
                                config: n.config,
                                type: mapOperatorToNodeType(n.operator_type),
                                operator_class: n.operator_class,
                                status: 'idle',
                                diffStatus: 'removed',
                            },
                            position: n.config?.ui?.position || { x: 0, y: 0 },
                            className: 'opacity-40 grayscale',
                        });
                    }
                });

                const flowEdges: Edge[] = vData.edges.map((e: ApiEdge) => {
                    const edgeKey = `${e.from_node_id}->${e.to_node_id}`;
                    const isAdded = diffData.edges.added.includes(edgeKey);

                    return {
                        id: `e-${e.from_node_id}-${e.to_node_id}`,
                        source: e.from_node_id,
                        target: e.to_node_id,
                        type: 'glow',
                        animated: isAdded,
                        style: {
                            strokeWidth: isAdded ? 4 : 2,
                            stroke: isAdded ? '#10b981' : undefined,
                            opacity: isAdded ? 1 : 0.6
                        },
                        data: { diffStatus: isAdded ? 'added' : 'none' }
                    };
                });

                // Add removed edges as high-visibility dashed red lines
                diffData.edges.removed.forEach((edgeKey: string) => {
                    const [source, target] = edgeKey.split('->');
                    flowEdges.push({
                        id: `removed-${edgeKey}`,
                        source,
                        target,
                        type: 'glow',
                        style: {
                            stroke: '#ef4444',
                            strokeDasharray: '8,8',
                            opacity: 0.6,
                            strokeWidth: 3
                        },
                        animated: false,
                        data: { diffStatus: 'removed' }
                    });
                });

                const layouted = getLayoutedElements(flowNodes, flowEdges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
                setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
            };
            loadDiff();
            return;
        }

        // 2. Handle Normal Mode (Static version or latest)
        const versionToLoad = specificVersion || pipeline.latest_version || pipeline.published_version;
        if (!versionToLoad) {
            setPipelineName(pipeline.name);
            return;
        }

        if (initializedVersionId.current === versionToLoad.id && !isDiffMode) return;

        initializedVersionId.current = versionToLoad.id;
        setPipelineName(pipeline.name);

        const flowNodes: AppNode[] = versionToLoad.nodes.map((n: ApiNode) => ({
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
                connection_id: n.connection_id || n.config?.connection_id,
                sub_pipeline_id: n.sub_pipeline_id,
                is_dynamic: n.is_dynamic,
                mapping_expr: n.mapping_expr,
                worker_tag: n.worker_tag,
                guardrails: n.guardrails,
                onSettings: (nodeId: string) => openNodeProperties(nodeId),
                onDuplicate: (id: string) => onDuplicateRef.current?.(id),
                onDelete: (nodeId: string) => {
                    takeSnapshot(nodes, edges);
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                }
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

        const layouted = getLayoutedElements(flowNodes, flowEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);

        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    }, [pipeline, specificVersion, setNodes, setEdges, fitView, isDiffMode, diffData, id, baseV, targetV]);

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
        const offset = Math.random() * 50;
        const newNode: AppNode = {
            id: newNodeId,
            type: type,
            position: { x: 250 + offset, y: 250 + offset },
            data: {
                label: label || `New ${type}`,
                type: type,
                operator_class: operatorClass || 'pandas_transform',
                config: {},
                status: 'idle',
                onSettings: (nodeId: string) => openNodeProperties(nodeId),
                onDuplicate: (id: string) => onDuplicateRef.current?.(id),
                onDelete: (nodeId: string) => {
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                }
            },
        };
        setNodes((nds) => nds.concat(newNode));
        openNodeProperties(newNodeId);
        toast.success("Operator Added", {
            description: `Added ${label} to the canvas.`
        });
    };

    const onDuplicateRef = useRef<((nodeId: string) => void) | null>(null);

    const onDuplicate = useCallback((nodeId: string) => {
        takeSnapshot(nodes, edges);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const newNodeId = `node_${Date.now()}`;
        const newNode: AppNode = {
            ...node,
            id: newNodeId,
            position: { x: node.position.x + 50, y: node.position.y + 50 },
            data: {
                ...node.data,
                label: `${node.data.label} (Copy)`,
                status: 'idle',
                onSettings: (nodeId: string) => openNodeProperties(nodeId),
                onDuplicate: (id: string) => onDuplicateRef.current?.(id),
                onDelete: (nodeId: string) => {
                    setNodes(nds => nds.filter(n => n.id !== nodeId));
                    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                }
            },
            selected: true
        };

        setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
        openNodeProperties(newNodeId);
        toast.success("Operator Duplicated", {
            description: `Created copy of ${node.data.label}`
        });
    }, [nodes, edges, takeSnapshot, setNodes]);

    useEffect(() => {
        onDuplicateRef.current = onDuplicate;
    }, [onDuplicate]);

    // Undo/Redo & Duplicate Shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
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
            const newNode: AppNode = {
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
        mutationFn: async ({ deploy = false, notes = "" }: { deploy?: boolean, notes?: string }) => {
            try {
                setIsSaving(true);

                const apiNodes: ApiNode[] = nodes.map(n => {
                    const nodeData = n.data;
                    return {
                        node_id: n.id,
                        name: nodeData.label,
                        operator_type: mapNodeTypeToOperator(n.type || 'default', nodeData.operator_class),
                        config: {
                            ...(nodeData.config || {}),
                            ui: { position: n.position },
                            connection_id: nodeData.connection_id
                        },
                        order_index: 0,
                        operator_class: nodeData.operator_class || 'pandas_transform',
                        source_asset_id: nodeData.source_asset_id,
                        destination_asset_id: nodeData.destination_asset_id,
                        connection_id: nodeData.connection_id,
                        write_strategy: nodeData.write_strategy || 'append',
                        schema_evolution_policy: nodeData.schema_evolution_policy || 'strict',
                        // High-end Orchestration Fields
                        is_dynamic: !!nodeData.is_dynamic,
                        mapping_expr: nodeData.mapping_expr,
                        sub_pipeline_id: nodeData.sub_pipeline_id,
                        worker_tag: nodeData.worker_tag,
                        // Retry logic
                        max_retries: nodeData.max_retries ?? 3,
                        retry_strategy: (nodeData.retry_strategy as RetryStrategy) || RetryStrategy.FIXED,
                        retry_delay_seconds: nodeData.retry_delay_seconds ?? 60,
                        timeout_seconds: nodeData.timeout_seconds ?? 3600
                    };
                });

                const apiEdges = edges.map(e => ({
                    from_node_id: e.source,
                    to_node_id: e.target,
                    edge_type: 'data_flow'
                }));

                if (isNew) {
                    const payload: PipelineCreate = {
                        name: pipelineName || "New Pipeline",
                        initial_version: {
                            nodes: apiNodes,
                            edges: apiEdges,
                            version_notes: notes || "Initial draft"
                        }
                    };
                    const createdPipeline = await createPipeline(payload);

                    if (deploy && createdPipeline.current_version) {
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
                        version_notes: notes || (deploy ? `Deployed at ${new Date().toLocaleTimeString()}` : 'Auto-save')
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
                setDeployDialogOpen(false);
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

            {/* --- HEADER TOOLBAR --- */}
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
                                value={isDiffMode ? `Comparing: ${pipelineName}` : pipelineName}
                                onChange={(e) => !isDiffMode && setPipelineName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                readOnly={isDiffMode}
                                className={cn(
                                    "h-9 w-50 md:w-87.5 bg-transparent border-none shadow-none text-base font-semibold tracking-tight px-3 rounded-lg transition-all duration-200 text-foreground placeholder:text-muted-foreground/50 hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-1 focus-visible:ring-primary/20 truncate pr-9 cursor-text",
                                    isDiffMode && "text-amber-500 hover:bg-transparent cursor-default"
                                )}
                            />
                            {!isDiffMode && (
                                <div className="absolute right-3 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground px-2">
                            <Badge variant="outline" className={cn(
                                "h-4 px-1.5 font-mono border-0 text-[10px]",
                                pipeline?.status === 'active' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                            )}>
                                {isNew ? 'DRAFT' : pipeline?.status?.toUpperCase()}
                            </Badge>
                            <span className="hidden sm:inline">
                                {isDiffMode ? (
                                    <span className="flex items-center gap-1 text-primary">
                                        v{diffData?.base_version || '?'} <GitCompare size={10} /> v{diffData?.target_version || '?'}
                                    </span>
                                ) : (
                                    isNew ? 'v1' : `v${versionIdParam || pipeline?.latest_version?.version || pipeline?.published_version?.version || '?'}`
                                )}
                            </span>
                            {!isNew && !isDiffMode && (
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
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={cn("h-9 w-9 rounded-xl transition-all", showLogicView && "bg-primary/10 text-primary")}
                                    onClick={() => setShowLogicView(!showLogicView)}
                                >
                                    <Code size={18} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Pipeline Logic (YAML)</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {!isNew && (
                        <AnimatePresence mode="wait">
                            {!isDiffMode && isEditor && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex items-center gap-2"
                                >
                                    {isAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <div className="w-px h-4 bg-border/40 mx-1" />
                                    {isRunning ? (
                                        <motion.div
                                            key="stop-btn"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                        >
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="h-9 rounded-full px-4 gap-2 shadow-lg shadow-destructive/20"
                                                onClick={() => setIsRunning(false)}
                                            >
                                                <Square className="h-3.5 w-3.5 fill-current" />
                                                <span className="hidden sm:inline font-bold uppercase tracking-widest text-[10px]">Stop</span>
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="run-btn"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 rounded-full border-success/30 text-success hover:text-success hover:bg-success/10 hover:border-success/50 gap-2 px-4"
                                                onClick={() => runMutation.mutate()}
                                                disabled={runMutation.isPending}
                                            >
                                                {runMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                                                <span className="hidden sm:inline font-bold uppercase tracking-widest text-[10px]">Run</span>
                                            </Button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}

                    <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                            {!isDiffMode && isEditor && (
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 20, opacity: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => saveMutation.mutate({ deploy: false })}
                                        disabled={isSaving || !!versionIdParam}
                                        className="h-9 rounded-full px-4 font-bold uppercase tracking-widest text-[10px] bg-muted/50 hover:bg-muted"
                                    >
                                        <Save className="mr-2 h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Draft</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setDeployDialogOpen(true)}
                                        disabled={isSaving || !!versionIdParam}
                                        className="h-9 rounded-full px-5 shadow-lg shadow-primary/25 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] hover:shadow-primary/40 transition-all gap-2 hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                                        <span className="hidden sm:inline">Deploy</span>
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* --- CANVAS --- */}
            <div className="flex-1 w-full relative overflow-hidden bg-background rounded-xl border border-border/10">
                <div className="absolute inset-0 bg-grid-subtle opacity-10 pointer-events-none" />

                <div className="flex h-full w-full">
                    <div className="flex-1 relative overflow-hidden">
                        {/* Diff Mode Banner */}
                        {isDiffMode && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-100 w-fit min-w-125 max-w-[90%] bg-background/60 backdrop-blur-2xl border border-amber-500/30 rounded-2xl px-6 py-4 flex items-center justify-between gap-8 shadow-2xl animate-in slide-in-from-bottom duration-500 ring-1 ring-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                                        <GitCompare className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">Comparison Mode</span>
                                            <Badge className="h-4 px-1.5 bg-amber-500/20 text-amber-500 border-none text-[9px] font-bold">v{diffData?.base_version} → v{diffData?.target_version}</Badge>
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            <InfoIcon size={12} className="text-amber-500/60" />
                                            Visualizing structural changes between selected versions.
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/pipelines/${id}`)}
                                    className="h-10 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-300 gap-2 text-[10px] font-bold uppercase tracking-widest px-4"
                                >
                                    Exit Diff <XCircle className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}

                        {/* Historical Version Banner */}
                        {versionIdParam && !isDiffMode && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-100 w-fit min-w-100 max-w-[90%] bg-background/60 backdrop-blur-2xl border border-primary/30 rounded-2xl px-6 py-4 flex items-center justify-between gap-8 shadow-2xl animate-in slide-in-from-bottom duration-500 ring-1 ring-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                                        <HistoryIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Read-Only Snapshot</span>
                                            <Badge className="h-4 px-1.5 bg-primary/20 text-primary border-none text-[9px] font-bold">v{versionIdParam}</Badge>
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground">You are inspecting a historical state. Edits are disabled.</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/pipelines/${id}`)}
                                    className="h-10 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 gap-2 text-[10px] font-bold uppercase tracking-widest px-4 group"
                                >
                                    Exit View <ExternalLink className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
                                </Button>
                            </div>
                        )}

                        <ReactFlow
                            nodes={filteredNodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodeDoubleClick={(_, node) => {
                                openNodeProperties(node.id);
                            }}
                            onNodeClick={(_, node) => {
                                // Just handle selection on single click, don't open properties
                                setNodes((nds) => nds.map((n) => ({
                                    ...n,
                                    selected: n.id === node.id
                                })));
                            }}
                            onPaneClick={() => {
                                setSelectedNodeId(null);
                                setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
                            }}
                            onNodeDragStart={onNodeDragStart}
                            onNodesDelete={() => takeSnapshot(nodes, edges)}
                            onEdgesDelete={() => takeSnapshot(nodes, edges)}
                            colorMode={flowTheme}
                            minZoom={0.1}
                            maxZoom={4}
                            snapToGrid={true}
                            snapGrid={[12, 12]}
                            defaultEdgeOptions={{
                                type: 'glow',
                                style: { strokeWidth: 3 }
                            }}
                            proOptions={{ hideAttribution: true }}
                            className="transition-colors duration-500 rounded-2xl"
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
                            <AnimatePresence>
                                {!isDiffMode && !versionIdParam && isEditor && (
                                    <Panel position="top-center" className="mt-6 pointer-events-none flex items-center gap-3">
                                        
                                        {/* Group 1: History */}
                                        <motion.div
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ delay: 0.05 }}
                                            className="pointer-events-auto flex items-center p-1 gap-1 glass-panel rounded-2xl shadow-xl border-border/40 bg-background/60 backdrop-blur-xl h-12"
                                        >
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30" 
                                                            onClick={() => undo(nodes, edges, setNodes, setEdges)} 
                                                            disabled={!canUndo}
                                                        >
                                                            <Undo className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-widest">Undo</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30" 
                                                            onClick={() => redo(nodes, edges, setNodes, setEdges)} 
                                                            disabled={!canRedo}
                                                        >
                                                            <Redo className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-widest">Redo</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <div className="w-px h-5 bg-border/30 mx-1" />
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-95" 
                                                            onClick={onLayout}
                                                        >
                                                            <Layout className="h-4.5 w-4.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="font-bold text-[10px] uppercase tracking-widest">Auto Layout</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </motion.div>

                                        {/* Group 2: Search */}
                                        <motion.div
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ delay: 0.05 }}
                                            className="pointer-events-auto flex items-center p-1 gap-2 glass-panel rounded-2xl shadow-xl border-border/40 bg-background/60 backdrop-blur-xl h-12"
                                        >
                                            <div className="relative group w-32 focus-within:w-48 transition-all duration-300 ml-1">
                                                <Search className="z-20 absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input 
                                                    id="canvas-search"
                                                    placeholder="Find node..." 
                                                    value={canvasSearch}
                                                    onChange={(e) => onCanvasSearch(e.target.value)}
                                                    className="h-9 pl-8 pr-2 rounded-xl bg-muted/30 border-transparent hover:bg-muted/50 focus-visible:bg-background focus-visible:border-primary/20 text-[11px] font-medium shadow-none transition-all placeholder:text-muted-foreground/50"
                                                />
                                            </div>
                                        </motion.div>

                                        {/* Action: Add */}
                                        <motion.div
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="pointer-events-auto"
                                        >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all p-0 border border-primary/20"
                                                    >
                                                        <Plus className="h-6 w-6 stroke-[2.5]" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="center"
                                                    sideOffset={16}
                                                    className="w-72 bg-background/90 backdrop-blur-2xl border-border/20 shadow-2xl rounded-2xl p-2 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200"
                                                >
                                                    <div className="px-2 py-2 mb-2">
                                                        <div className="relative group">
                                                            <Plus className="z-20 absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                            <Input
                                                                placeholder="Add operator..."
                                                                value={opSearch}
                                                                onChange={(e) => setOpSearch(e.target.value)}
                                                                className="h-9 pl-10 rounded-xl bg-muted/40 border-transparent text-sm focus-visible:ring-2 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/50 font-medium"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-80 overflow-y-auto custom-scrollbar px-1 space-y-3 pb-1">
                                                        {filteredDefinitions.length === 0 ? (
                                                            <div className="py-10 text-center flex flex-col items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground/40">
                                                                    <Plus className="h-5 w-5 rotate-45" />
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-xs font-bold text-foreground">No matches found</span>
                                                                    <span className="text-[10px] text-muted-foreground">Try a different search term</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            filteredDefinitions.map((category, idx) => (
                                                                <div key={idx} className="space-y-1">
                                                                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-3">
                                                                        {category.category}
                                                                        <div className="h-px flex-1 bg-border/30" />
                                                                    </div>
                                                                    <div className="grid gap-1">
                                                                        {category.items.map((item: OperatorDefinition, i) => (
                                                                            <DropdownMenuItem
                                                                                key={i}
                                                                                className="group flex items-center gap-3 p-2.5 rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer transition-all duration-200 outline-none"
                                                                                onClick={() => onAddNode(item.type, item.opClass, item.label)}
                                                                            >
                                                                                <div className={cn(
                                                                                    "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md",
                                                                                    item.type === 'source' ? "bg-chart-1/10 border-chart-1/20 text-chart-1 group-hover:bg-chart-1/20" :
                                                                                        item.type === 'sink' ? "bg-chart-2/10 border-chart-2/20 text-chart-2 group-hover:bg-chart-2/20" :
                                                                                            item.type === 'validate' ? "bg-chart-4/10 border-chart-4/20 text-chart-4 group-hover:bg-chart-4/20" :
                                                                                                ['join', 'union', 'merge'].includes(item.type) ? "bg-chart-5/10 border-chart-5/20 text-chart-5 group-hover:bg-chart-5/20" :
                                                                                                    "bg-chart-3/10 border-chart-3/20 text-chart-3 group-hover:bg-chart-3/20"
                                                                                )}>
                                                                                    <item.icon className="h-4.5 w-4.5" />
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5 overflow-hidden">
                                                                                    <span className="text-xs font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">{item.label}</span>
                                                                                    <span className="text-[10px] text-muted-foreground/60 truncate leading-none font-medium">{item.desc}</span>
                                                                                </div>
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </motion.div>
                                    </Panel>
                                )}
                            </AnimatePresence>
                        </ReactFlow>
                    </div>

                    <AnimatePresence>
                        {showLogicView && (
                            <motion.div
                                initial={{ x: "100%", opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: "100%", opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute top-0 right-0 w-full md:w-128 h-full border-l border-white/10 bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-3xl z-[70] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
                            >
                                <div className="p-6 border-b border-white/10 bg-muted/20 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                                            <FileCode size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">Pipeline Manifest</h3>
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Read-only JSON</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors" onClick={() => setShowLogicView(false)}>
                                        <X size={18} />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]/50">
                                    <Editor
                                        height="100%"
                                        language="json"
                                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                        value={JSON.stringify(pipelinePayload, null, 2)}
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 11,
                                            padding: { top: 20 },
                                            automaticLayout: true,
                                            scrollBeyondLastLine: false,
                                            fontFamily: '"Geist Mono Variable", monospace'
                                        }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Properties Inspector */}
                <div className={cn(
                    "absolute top-0 right-0 w-full md:w-128 h-full border-l border-white/10 bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5 flex flex-col overflow-hidden z-[60] transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)",
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

                    <DeployCommitDialog
                        open={deployDialogOpen}
                        onOpenChange={setDeployDialogOpen}
                        onConfirm={(notes) => saveMutation.mutate({ deploy: true, notes })}
                        isSaving={isSaving}
                    />

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogContent className="rounded-[2rem] border-border/40 bg-background/95 backdrop-blur-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold">Are you absolutely sure?</AlertDialogTitle>
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