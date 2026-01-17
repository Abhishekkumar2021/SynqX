/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    getConnections, 
    getHistory, 
    clearHistory, 
    discoverAssets,
    getConnectionAssets,
} from '@/lib/api';
import { PageMeta } from '@/components/common/PageMeta';
import {
    Globe,
    ChevronRight,
    Activity,
    Info,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { type ImperativePanelHandle } from "react-resizable-panels";

// Feature Components
import { ExecutionHistory } from '@/components/features/explorer/ExecutionHistory';
import { type HistoryItem } from '@/components/features/explorer/types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useZenMode } from '@/hooks/useZenMode';

// New Modular Components
import { ExplorerSidebar } from '@/components/features/explorer/components/ExplorerSidebar';
import { ExplorerContentRouter } from '@/components/features/explorer/components/ExplorerContentRouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const ExplorerPage: React.FC = () => {
    const { isAdmin } = useWorkspace();
    const { isZenMode } = useZenMode();
    const queryClient = useQueryClient();
    const sidebarRef = useRef<ImperativePanelHandle>(null);

    // --- State ---
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const connId = urlParams.get('connectionId');
            if (connId) return connId;
            return localStorage.getItem('synqx-explorer-last-connection');
        }
        return null;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    // --- Data Fetching ---
    const { data: connections, isLoading: loadingConnections } = useQuery({ 
        queryKey: ['connections'], 
        queryFn: getConnections 
    });

    const currentConnection = useMemo(() =>
        connections?.find(c => c.id.toString() === selectedConnectionId),
        [connections, selectedConnectionId]);

    const explorerType = useMemo(() => {
        if (!currentConnection) return 'none';
        const type = String(currentConnection.connector_type).toLowerCase();
        if (type === 'osdu') return 'osdu';
        if (type === 'prosource') return 'prosource';
        if (['local_file', 's3', 'gcs', 'azure_blob', 'sftp', 'ftp'].includes(type)) return 'file';
        
        const sqlTypes = ['postgresql', 'mysql', 'mssql', 'oracle', 'sqlite', 'duckdb', 'snowflake', 'bigquery', 'redshift', 'databricks', 'mariadb'];
        if (sqlTypes.includes(type)) return 'sql';
        
        return 'unsupported';
    }, [currentConnection]);

    // Domain Discovery Hooks
    const { data: discoveryData, isLoading: loadingDiscovered } = useQuery({
        queryKey: ['discovery', selectedConnectionId],
        queryFn: () => discoverAssets(parseInt(selectedConnectionId!), true),
        enabled: !!selectedConnectionId && (explorerType === 'osdu' || explorerType === 'prosource')
    });

    const discoveredAssets = useMemo(() => discoveryData?.assets || [], [discoveryData]);

    const discoverMutation = useMutation({
        mutationFn: () => discoverAssets(parseInt(selectedConnectionId!), true),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discovery', selectedConnectionId] });
            toast.success("Discovery Complete");
        }
    });

    // --- History Handling ---
    const { data: historyData, refetch: refetchHistory } = useQuery({
        queryKey: ['execution-history'],
        queryFn: () => getHistory(100),
        refetchOnWindowFocus: false,
        enabled: explorerType === 'sql'
    });

    const history: HistoryItem[] = useMemo(() => {
        if (!historyData) return [];
        return historyData.map(h => ({
            id: h.id, query: h.query, timestamp: h.created_at, connectionName: h.connection_name,
            duration: h.execution_time_ms, rowCount: h.row_count || 0, status: h.status
        }));
    }, [historyData]);

    const clearHistoryMutation = useMutation({
        mutationFn: clearHistory,
        onSuccess: () => {
            toast.success("History Cleared");
            refetchHistory();
        }
    });

    const toggleSidebar = () => {
        const sidebar = sidebarRef.current;
        if (sidebar) {
            if (isSidebarCollapsed) sidebar.expand();
            else sidebar.collapse();
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex-1 flex flex-col min-h-0",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Explorer" />

            <div className="flex-1 min-h-0 flex flex-col rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden ring-1 ring-border/20">
                
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel 
                        ref={sidebarRef}
                        defaultSize={18} 
                        minSize={12} 
                        maxSize={30} 
                        collapsible={true}
                        onCollapse={() => setIsSidebarCollapsed(true)}
                        onExpand={() => setIsSidebarCollapsed(false)}
                        className={cn(
                            "transition-all duration-300 ease-in-out border-r border-border/40 bg-muted/5",
                            isSidebarCollapsed && "min-w-0"
                        )}
                    >
                        {!isSidebarCollapsed && (
                            <ExplorerSidebar
                                connections={connections}
                                isLoading={loadingConnections}
                                selectedId={selectedConnectionId}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                onSelect={(id) => {
                                    setSelectedConnectionId(id);
                                    localStorage.setItem('synqx-explorer-last-connection', id);
                                }}
                            />
                        )}
                    </ResizablePanel>

                    <ResizableHandle withHandle className={cn("bg-transparent transition-opacity", isSidebarCollapsed && "opacity-0 pointer-events-none")} />

                    <ResizablePanel defaultSize={82} className="flex flex-col relative isolate min-w-0">
                        <header className="py-2 px-4 border-b border-border/20 flex items-center justify-between shrink-0 bg-muted/10 relative z-10">
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-muted-foreground/60 hover:text-primary transition-all"
                                    onClick={toggleSidebar}
                                >
                                    {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                                </Button>
                                <div className="h-4 w-px bg-border/40 mx-1" />
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                    <Globe className="z-20 h-3 w-3" /> Explorer
                                    <ChevronRight className="h-2.5 w-2.5" />
                                </div>
                                {currentConnection ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold tracking-tight text-foreground/80">{currentConnection.name}</span>
                                        <Badge variant="outline" className="h-4 px-1 text-[8px] uppercase font-bold bg-primary/5 text-primary border-primary/20 leading-none">
                                            {currentConnection.connector_type}
                                        </Badge>
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-tighter">No source selected</span>
                                )}
                            </div>
                            {currentConnection && (
                                <div className="flex items-center gap-3 text-muted-foreground/40">
                                    <Activity className="h-3.5 w-3.5" />
                                    <Info className="h-3.5 w-3.5 hover:text-primary transition-colors cursor-pointer" />
                                </div>
                            )}
                        </header>

                        <div className="flex-1 min-h-0 relative bg-background/20">
                            <AnimatePresence mode="wait">
                                <ExplorerContentRouter 
                                    selectedConnectionId={selectedConnectionId}
                                    connectionName={currentConnection?.name || ''}
                                    explorerType={explorerType}
                                    connectorType={currentConnection?.connector_type || ''}
                                    discoveredAssets={discoveredAssets || []}
                                    isLoadingDiscovered={loadingDiscovered}
                                    isDiscoverMutationPending={discoverMutation.isPending}
                                    onDiscover={() => discoverMutation.mutate()}
                                    onHistoryToggle={() => setShowHistory(!showHistory)}
                                    onRefetchHistory={() => refetchHistory()}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    onToggleSidebar={toggleSidebar}
                                    onResetSelection={() => setSelectedConnectionId(null)}
                                />
                            </AnimatePresence>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowHistory(false)}
                            className="absolute inset-0 bg-background/20 backdrop-blur-sm z-[100]"
                        />
                        <div className="fixed right-0 top-0 bottom-0 z-[101] w-96 shadow-2xl animate-in slide-in-from-right duration-300">
                            <ExecutionHistory
                                history={history}
                                onClose={() => setShowHistory(false)}
                                onRestore={() => {}}
                                onClear={isAdmin ? () => clearHistoryMutation.mutate() : undefined}
                            />
                        </div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ExplorerPage;
