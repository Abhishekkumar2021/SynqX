import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/hooks/useWorkspace';

export const TeamHeader: React.FC = () => {
    const { activeWorkspace } = useWorkspace();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
            <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        Team Management
                    </h2>
                    <Badge variant="outline" className="h-7 px-3 rounded-xl bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px] gap-1.5 hidden sm:flex">
                        {activeWorkspace?.role} Access
                    </Badge>
                </div>
                <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                    Manage your workspace members, roles, and collaboration permissions.
                </p>
            </div>
        </div>
    );
};
