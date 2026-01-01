/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkspaces, switchWorkspace, exportWorkspace } from '@/lib/api';
import { WorkspaceRole } from '@/lib/enums';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { WorkspaceContext, type WorkspaceContextType } from '@/context/WorkspaceContext';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Re-fetch workspaces whenever the user identity changes (login/workspace switch)
    React.useEffect(() => {
        if (user) {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }
    }, [user, queryClient]);

    const { data: workspaces = [], isLoading, refetch } = useQuery({
        queryKey: ['workspaces'],
        queryFn: getWorkspaces,
        enabled: !!user,
    });

    const activeWorkspace = useMemo(() => {
        if (!user?.active_workspace_id) return null;
        return workspaces.find(ws => ws.id === user.active_workspace_id) || null;
    }, [user, workspaces]);

    const userRole = useMemo(() => {
        return (activeWorkspace?.role as WorkspaceRole) || null;
    }, [activeWorkspace]);

    const switchMutation = useMutation({
        mutationFn: switchWorkspace,
        onSuccess: async () => {
            // Invalidate and wait for refetch to ensure state is synchronized
            await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            
            toast.success("Workspace switched");
            
            // Fully reload queries that are workspace-scoped
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            
            // We still reload to ensure all context-dependent hooks reset correctly
            // but we ensure the queries are invalidated first.
            setTimeout(() => {
                window.location.reload();
            }, 100);
        },
        onError: () => {
            toast.error("Failed to switch workspace");
        }
    });

    const downloadWorkspaceContext = async () => {
        if (!activeWorkspace) return;
        try {
            const blob = await exportWorkspace(activeWorkspace.id);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `workspace_${activeWorkspace.slug}_context.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("Workspace context downloaded");
        } catch (error) {
            toast.error("Failed to download workspace context");
        }
    };

    const value: WorkspaceContextType = {
        workspaces,
        activeWorkspace,
        userRole,
        isSwitching: switchMutation.isPending,
        switchActiveWorkspace: (id: number) => switchMutation.mutate(id),
        downloadWorkspaceContext,
        refreshWorkspaces: () => refetch(),
        isLoading
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};