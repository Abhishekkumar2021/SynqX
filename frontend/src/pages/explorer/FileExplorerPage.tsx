import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getConnection } from '@/lib/api/connections';
import { LiveFileExplorer } from '@/components/features/connections/LiveFileExplorer';
import { PageMeta } from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HardDrive, Search, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useZenMode } from '@/hooks/useZenMode';

export const FileExplorerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const connectionId = parseInt(id!);
    const navigate = useNavigate();
    const { isZenMode } = useZenMode();

    const { data: connection } = useQuery({
        queryKey: ['connection', connectionId],
        queryFn: () => getConnection(connectionId)
    });

    return (
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex-1 flex flex-col gap-6 md:gap-8 px-1",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title={`File Explorer - ${connection?.name || 'Loading...'}`} />
            
            {/* --- Page Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate('/explorer')}
                            className="h-10 w-10 rounded-2xl hover:bg-muted active:scale-95"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="p-2 bg-emerald-500/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <HardDrive className="h-6 w-6 text-emerald-500" />
                        </div>
                        {connection?.name || 'File Explorer'}
                        <Badge variant="outline" className="h-7 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] gap-1.5 uppercase">
                            {connection?.connector_type}
                        </Badge>
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1 leading-relaxed max-w-2xl">
                        Explore object storage and file systems with direct buffer streaming.
                    </p>
                </div>
            </div>

            {/* --- Content Pane (Glass Registry Style) --- */}
            <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <LiveFileExplorer connectionId={connectionId} />
            </div>
        </motion.div>
    );
};