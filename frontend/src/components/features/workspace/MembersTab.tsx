/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { MembersToolbar } from './MembersToolbar';
import { MembersList } from './MembersList';
import { MembersGrid } from './MembersGrid';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

interface MembersTabProps {
    members: any[];
    isLoading: boolean;
    viewMode: 'list' | 'grid';
    setViewMode: (mode: 'list' | 'grid') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isAdmin: boolean;
    currentUser: any;
    workspaceId?: number;
    queryClient: any;
}

export const MembersTab: React.FC<MembersTabProps> = ({
    members,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    isAdmin,
    currentUser,
    workspaceId,
    queryClient
}) => {
    return (
        <>
            <MembersToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isAdmin={isAdmin}
                workspaceId={workspaceId}
                queryClient={queryClient}
            />

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-40">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">
                                Synchronizing Team Directory
                            </span>
                        </div>
                    ) : viewMode === 'list' ? (
                        <MembersList
                            members={members}
                            isAdmin={isAdmin}
                            currentUser={currentUser}
                            workspaceId={workspaceId}
                            queryClient={queryClient}
                        />
                    ) : (
                        <MembersGrid
                            members={members}
                            isAdmin={isAdmin}
                            currentUser={currentUser}
                            workspaceId={workspaceId}
                            queryClient={queryClient}
                        />
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};