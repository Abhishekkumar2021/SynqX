import React from 'react';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Plus } from 'lucide-react';

interface ConnectionsHeaderProps {
    onCreate: () => void;
}

export const ConnectionsHeader: React.FC<ConnectionsHeaderProps> = ({ onCreate }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
            <div className="space-y-1.5">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                        <LinkIcon className="h-6 w-6 text-primary" />
                    </div>
                    Connections
                </h2>
                <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                    Manage authentication and configuration for your data sources.
                </p>
            </div>

            <Button
                size="sm"
                onClick={onCreate}
                className="w-full md:w-auto rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 font-semibold"
            >
                <Plus className="mr-2 h-5 w-5" /> New Connection
            </Button>
        </div>
    );
};
