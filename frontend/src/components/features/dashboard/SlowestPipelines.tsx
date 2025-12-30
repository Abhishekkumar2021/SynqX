import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Timer } from 'lucide-react';
import type { SlowestPipeline } from '@/lib/api';

interface SlowestPipelinesProps {
    pipelines: SlowestPipeline[];
}

export const SlowestPipelines: React.FC<SlowestPipelinesProps> = ({ pipelines }) => {
    return (
        <Card className="h-full border-none bg-transparent shadow-none rounded-none overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 bg-muted/20 px-6 pt-6">
                <CardTitle className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Timer className="h-4 w-4 text-orange-500" />
                    Slowest Pipelines (Avg)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {pipelines.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        No execution data available.
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {pipelines.map((pipeline, i) => (
                            <div key={pipeline.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                        {i + 1}
                                    </span>
                                    <div className="truncate text-sm font-medium">
                                        {pipeline.name}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {pipeline.avg_duration.toFixed(1)}s
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
