/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConnections, getConnection, deleteConnection, testConnection } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    XCircle, ShieldCheck, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent
} from "@/components/ui/dialog";
import { PageMeta } from '@/components/common/PageMeta';
import { motion } from 'framer-motion';
import { useZenMode } from '@/context/ZenContext';
import { cn } from '@/lib/utils';

import { ConnectionsHeader } from '@/components/features/connections/ConnectionsHeader';
import { ConnectionsToolbar } from '@/components/features/connections/ConnectionsToolbar';
import { ConnectionsList } from '@/components/features/connections/ConnectionsList';
import { DeleteConnectionDialog } from '@/components/features/connections/DeleteConnectionDialog';
import { CreateConnectionDialog } from '@/components/features/connections/CreateConnectionDialog';

export const ConnectionsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [connectionToDelete, setConnectionToDelete] = useState<any | null>(null);
    const [editingConnection, setEditingConnection] = useState<any | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const { isZenMode } = useZenMode();

    const { data: connections, isLoading, error } = useQuery({
        queryKey: ['connections'],
        queryFn: getConnections,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteConnection(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Connection Deleted', {
                description: 'The connection has been permanently removed.',
            });
        },
        onError: () => {
            toast.error('Delete Failed', {
                description: 'Unable to delete the connection. Please try again.',
            });
        }
    });

    const handleCreate = () => {
        setEditingConnection(null);
        setIsDialogOpen(true);
    };

    const handleEdit = async (connection: any) => {
        try {
            const fullConnection = await getConnection(connection.id);
            setEditingConnection(fullConnection);
            setIsDialogOpen(true);
        } catch (e) {
            toast.error("Failed to Load", {
                description: "Could not retrieve connection details for editing."
            });
        }
    };

    const handleDelete = (connection: any) => {
        setConnectionToDelete(connection);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (connectionToDelete) {
            deleteMutation.mutate(connectionToDelete.id);
            setConnectionToDelete(null);
            setIsDeleteAlertOpen(false);
        }
    };
    
    const handleTest = async (id: number) => {
        setTestingId(id);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const res = await testConnection(id);
            if (res.success) {
                toast.success("Connection Healthy", {
                    description: res.message || "Successfully verified connectivity to the data source.",
                    icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />
                });
            } else {
                toast.error("Connection Failed", { 
                    description: res.message || "Unable to establish connection. Check your credentials."
                });
            }
        } catch (e) {
            toast.error("Test Failed", {
                description: "Network error occurred while testing the connection."
            });
        } finally {
            setTestingId(null);
        }
    };

    const filteredConnections = useMemo(() => {
        if (!connections) return [];
        return connections.filter(c =>
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.connector_type.toLowerCase().includes(filter.toLowerCase())
        );
    }, [connections, filter]);

    if (error) return (
        <div className={cn(
            "flex items-center justify-center animate-in fade-in duration-500",
            isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
        )}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-6"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
                    <div className="relative h-24 w-24 rounded-3xl glass-card flex items-center justify-center mx-auto shadow-2xl">
                        <XCircle className="h-12 w-12 text-destructive" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">Failed to Load Connections</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                        We couldn't retrieve your connections. Please check your network settings and try again.
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({queryKey: ['connections']})} 
                    className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                    <RefreshCw className="h-4 w-4" /> Retry Connection
                </Button>
            </motion.div>
        </div>
    );

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-6 md:gap-8 p-4 md:p-0",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Connections" description="Manage data sources and destinations." />

            <ConnectionsHeader onCreate={handleCreate} />

            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <ConnectionsToolbar 
                    filter={filter}
                    setFilter={setFilter}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    count={filteredConnections.length}
                />

                <ConnectionsList
                    connections={filteredConnections}
                    isLoading={isLoading}
                    viewMode={viewMode}
                    testingId={testingId}
                    onTest={handleTest}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl h-[700px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                    <CreateConnectionDialog
                        initialData={editingConnection}
                        onClose={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <DeleteConnectionDialog
                open={isDeleteAlertOpen}
                onOpenChange={setIsDeleteAlertOpen}
                onConfirm={confirmDelete}
                connectionName={connectionToDelete?.name}
            />
        </motion.div>
    );
};