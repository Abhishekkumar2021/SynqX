/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Search, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { InviteMemberDialog } from './InviteMemberDialog';

interface MembersToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    viewMode: 'list' | 'grid';
    setViewMode: (mode: 'list' | 'grid') => void;
    isAdmin: boolean;
    workspaceId?: number;
    queryClient: any;
}

export const MembersToolbar: React.FC<MembersToolbarProps> = ({
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isAdmin,
    workspaceId,
    queryClient
}) => {
    const [inviteOpen, setInviteOpen] = useState(false);

    return (
        <div className="p-4 border-b border-border/20 bg-background/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4">
            <div className="relative w-full md:w-64 group">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                <Input 
                    placeholder="Search team members..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 rounded-xl bg-background/50 border-border/40 focus:bg-background focus:border-primary/30 transition-all shadow-none text-xs" 
                />
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-md transition-all",
                            viewMode === 'list' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-md transition-all",
                            viewMode === 'grid' ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {isAdmin && (
                    <InviteMemberDialog
                        open={inviteOpen}
                        onOpenChange={setInviteOpen}
                        workspaceId={workspaceId}
                        queryClient={queryClient}
                    />
                )}
            </div>
        </div>
    );
};