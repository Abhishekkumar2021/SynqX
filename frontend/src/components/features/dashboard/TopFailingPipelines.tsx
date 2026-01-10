import React from 'react';
import { ShieldAlert, TrendingDown } from 'lucide-react';
import type { FailingPipeline } from '@/lib/api';

interface TopFailingPipelinesProps {
    pipelines: FailingPipeline[];
}

export const TopFailingPipelines: React.FC<TopFailingPipelinesProps> = ({ pipelines }) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="pb-6 shrink-0 px-8 pt-8">
                <h3 className="text-xl font-bold tracking-tighter uppercase text-destructive flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Reliability Risks
                </h3>
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                    Top failing pipelines requiring attention
                </p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-border/20">
                {pipelines.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40 ">
                        <span className="text-xs font-bold uppercase tracking-widest">System stabilized. No failures detected.</span>
                    </div>
                ) : (
                    <div className="divide-y divide-border/10">
                        {pipelines.map((pipeline, i) => (
                            <div key={pipeline.id} className="flex items-center justify-between p-5 hover:bg-destructive/5 transition-colors group">
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 text-[10px] font-bold text-destructive shadow-sm group-hover:scale-110 transition-transform will-change-transform">
                                        {i + 1}
                                    </span>
                                    <div className="truncate text-sm font-bold text-foreground/80 group-hover:text-destructive transition-colors">
                                        {pipeline.name}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-[10px] font-bold text-destructive shadow-xs">
                                    <TrendingDown className="h-3 w-3" />
                                    {pipeline.failure_count} FAILURES
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};