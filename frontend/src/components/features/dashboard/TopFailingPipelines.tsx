import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// UI Imports
import { AlertTriangle, TrendingDown } from 'lucide-react';
import type { FailingPipeline } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TopFailingPipelinesProps {
    pipelines: FailingPipeline[];
}

export const TopFailingPipelines: React.FC<TopFailingPipelinesProps> = ({ pipelines }) => {
    return (
        <Card className="h-full border-none bg-transparent shadow-none rounded-none overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 bg-muted/20 px-6 pt-6">
                <CardTitle className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Top Failing Pipelines
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {pipelines.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        No failed pipelines in this period.
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
                                <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
                                    <TrendingDown className="h-3 w-3" />
                                    {pipeline.failure_count}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
