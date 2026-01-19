import React from 'react';
import { Database, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OSDUHubHeaderProps {
    connectionName?: string;
    partitionId?: string;
    status?: 'healthy' | 'unhealthy' | 'unknown';
    onBack: () => void;
    children?: React.ReactNode;
}

export const OSDUHubHeader: React.FC<OSDUHubHeaderProps> = ({ 
    connectionName, 
    partitionId, 
    onBack,
    children
}) => {
    return (
        <header className="px-6 py-3 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0 relative z-40 backdrop-blur-md">
            <div className="flex items-center gap-4 min-w-0">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onBack}
                    className="h-8 w-8 rounded-lg hover:bg-muted active:scale-95 border border-border/40 shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Button>

                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                        <Database size={12} className="text-primary/60" />
                        <h1 className="text-sm font-black tracking-tight text-foreground uppercase truncate max-w-[200px]">
                            {connectionName || 'OSDU'}
                        </h1>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/20 shrink-0" />
                    <Badge variant="outline" className="h-5 px-2 rounded-md bg-indigo-500/5 text-indigo-600/80 border-indigo-500/20 font-bold uppercase tracking-widest text-[8px]">
                        {partitionId || '...'}
                    </Badge>
                </div>
            </div>

            <div className="flex-1 flex justify-center px-4">
                {children}
            </div>

                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">System Online</span>
                </div>
        </header>
    );
};
