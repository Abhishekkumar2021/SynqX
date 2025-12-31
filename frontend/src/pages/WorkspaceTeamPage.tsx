import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkspaceMembers } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { useZenMode } from '@/hooks/useZenMode';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/common/PageMeta';
import { AnimatePresence } from 'framer-motion';

// Segregated Components
import { WorkspaceHeader } from '@/components/features/workspace/WorkspaceHeader';
import { MembersTab } from '@/components/features/workspace/MembersTab';
import { SettingsTab } from '@/components/features/workspace/SettingsTab';

export const WorkspaceTeamPage: React.FC = () => {
    const { activeWorkspace, isAdmin } = useWorkspace();
    const { user: currentUser } = useAuth();
    const { isZenMode } = useZenMode();
    const queryClient = useQueryClient();
    
    const [activeTab, setActiveTab] = useState('members');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: members, isLoading } = useQuery({
        queryKey: ['workspace-members', activeWorkspace?.id],
        queryFn: () => getWorkspaceMembers(activeWorkspace!.id),
        enabled: !!activeWorkspace,
    });

    const filteredMembers = useMemo(() => {
        if (!members) return [];
        return members.filter(m => 
            m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [members, searchQuery]);

    return (
        <div className={cn(
            "flex flex-col h-full",
            isZenMode ? "min-h-[calc(100vh-4rem)]" : "min-h-[80vh]"
        )}>
            <PageMeta title="Workspace Management" description="Manage your team and environment settings." />

            {/* --- Unified Registry Container --- */}
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
                <WorkspaceHeader 
                    activeWorkspace={activeWorkspace}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <div className="flex-1 min-h-0 flex flex-col relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'members' ? (
                            <MembersTab
                                key="members-tab"
                                members={filteredMembers}
                                isLoading={isLoading}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                isAdmin={isAdmin}
                                currentUser={currentUser}
                                workspaceId={activeWorkspace?.id}
                                queryClient={queryClient}
                            />
                        ) : (
                            <SettingsTab
                                key="settings-tab"
                                activeWorkspace={activeWorkspace}
                                isAdmin={isAdmin}
                                members={members}
                                queryClient={queryClient}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
