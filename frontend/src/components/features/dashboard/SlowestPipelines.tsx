import React from 'react';
import { Activity, Clock } from 'lucide-react';
import type { SlowestPipeline } from '@/lib/api';

interface SlowestPipelinesProps {
    pipelines: SlowestPipeline[];
}

export const SlowestPipelines: React.FC<SlowestPipelinesProps> = ({ pipelines }) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="pb-6 shrink-0 px-8 pt-8">
                <h3 className="text-xl font-black tracking-tighter uppercase text-warning flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Latency Bottlenecks
                </h3>
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                    Slowest performing execution threads
                </p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-border/20">
                {pipelines.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40 italic text-sm">
                        <span className="text-xs font-black uppercase tracking-widest">No execution data available.</span>
                    </div>
                ) : (
                    <div className="divide-y divide-border/10">
                        {pipelines.map((pipeline, i) => (
                            <div key={pipeline.id} className="flex items-center justify-between p-5 hover:bg-warning/5 transition-colors group">
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10 border border-warning/20 text-[10px] font-black text-warning shadow-sm group-hover:scale-110 transition-transform will-change-transform">
                                        {i + 1}
                                    </span>
                                    <div className="truncate text-sm font-black text-foreground/80 group-hover:text-warning transition-colors">
                                        {pipeline.name}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5 text-[10px] font-black text-warning shadow-xs">
                                    <Clock className="h-3 w-3" />
                                    {pipeline.avg_duration.toFixed(1)}s AVG
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};