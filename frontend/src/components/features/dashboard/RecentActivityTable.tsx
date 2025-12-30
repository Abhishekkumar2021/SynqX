/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Clock, Database, ArrowUpRight
} from 'lucide-react';
import { RecentActivityItem } from './RecentActivityItem';

interface RecentActivityTableProps {
    jobs: any[];
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ jobs }) => {
    const navigate = useNavigate();

    return (
        <Card className="col-span-full border-none bg-transparent shadow-none rounded-none flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-border/40 bg-muted/5 shrink-0">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 ring-1 ring-blue-500/20">
                            <Clock className="h-5 w-5" />
                        </div>
                        Recent Activity
                    </CardTitle>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/jobs')}
                    className="text-[10px] font-bold uppercase tracking-widest h-9 gap-2 rounded-xl px-4 border-border/60 hover:bg-muted/50 transition-all group shadow-sm"
                >
                    Full History <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
            </CardHeader>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Custom Grid Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted/30 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 backdrop-blur-md">
                    <div className="col-span-12 md:col-span-5">Pipeline / Job ID</div>
                    <div className="col-span-2 hidden md:block">Status</div>
                    <div className="col-span-2 hidden md:block">Duration</div>
                    <div className="col-span-2 hidden md:block">Started</div>
                    <div className="col-span-1 hidden md:block text-right pr-4">Actions</div>
                </div>

                <CardContent className="p-0! flex-1 overflow-y-auto custom-scrollbar">
                    {jobs && jobs.length > 0 ? (
                        <div className="divide-y divide-border/30">
                            {jobs.slice(0, 8).map((job: any) => (
                                <RecentActivityItem key={job.id} job={job} />
                            ))}
                        </div>
                    ) : (
                        <div className="h-60 flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-40">
                            <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50">
                                <Database className="h-10 w-10 opacity-20" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">No activity recorded</span>
                        </div>
                    )}
                </CardContent>
            </div>
        </Card>
    );
};
