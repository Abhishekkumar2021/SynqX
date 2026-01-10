import React from 'react';
import {
    Tabs,
    TabsContent,
} from "@/components/ui/tabs";
import { 
    Terminal, 
    Database, 
} from 'lucide-react';
import { RecentActivityItem } from './RecentActivityItem';
import { DashboardAlertsFeed } from './DashboardAlertsFeed';
import { DashboardAuditFeed } from './DashboardAuditFeed';
import { Badge } from '@/components/ui/badge';
import type { EphemeralJobResponse, RecentActivity, DashboardAlert, AuditLog } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface UnifiedActivityPanelProps {
    jobs: RecentActivity[];
    alerts: DashboardAlert[];
    auditLogs: AuditLog[];
    ephemeralJobs: EphemeralJobResponse[];
    activeTab?: string;
    onTabChange?: (value: string) => void;
}

const EphemeralJobsList: React.FC<{ jobs: EphemeralJobResponse[] }> = ({ jobs }) => {
    return (
        <div className="flex flex-col h-full overflow-hidden">
             {/* Custom Grid Header for consistency */}
             <div className="grid grid-cols-12 gap-4 px-8 py-3 border-b border-border/20 bg-muted/30 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 backdrop-blur-md">
                <div className="col-span-5">Task Type</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2">Worker</div>
                <div className="col-span-2 text-right">Time</div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {jobs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-40 p-8">
                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
                            <Terminal className="h-8 w-8 opacity-20" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">No remote tasks</span>
                    </div>
                ) : (
                    <div className="divide-y divide-border/10">
                        {jobs.map((job) => (
                            <div key={job.id} className="grid grid-cols-12 gap-4 px-8 py-4 hover:bg-muted/20 transition-colors items-center group">
                                <div className="col-span-5 flex flex-col gap-1">
                                    <span className="text-xs font-bold text-foreground truncate">{job.job_type}</span>
                                    {job.agent_group && (
                                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                            Group: {job.agent_group}
                                        </span>
                                    )}
                                </div>
                                <div className="col-span-3">
                                    <Badge variant="outline" className={cn(
                                        "rounded-md text-[9px] font-bold uppercase tracking-widest border-0 px-2 py-0.5",
                                        job.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                        job.status === 'failed' ? 'bg-rose-500/10 text-rose-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    )}>
                                        {job.status}
                                    </Badge>
                                </div>
                                <div className="col-span-2 text-[10px] font-mono text-muted-foreground truncate" title={job.worker_id}>
                                    {job.worker_id ? job.worker_id.substring(0, 8) + '...' : '-'}
                                </div>
                                <div className="col-span-2 text-right text-[10px] font-bold text-muted-foreground/50">
                                    {job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const UnifiedActivityPanel: React.FC<UnifiedActivityPanelProps> = ({ 
    jobs, alerts, auditLogs, ephemeralJobs, activeTab: externalTab, onTabChange 
}) => {
    const [internalTab, setInternalTab] = React.useState('runs');
    const activeTab = externalTab || internalTab;
    const setActiveTab = onTabChange || setInternalTab;

    return (
        <Tabs defaultValue="runs" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 min-h-0 border-t-0 bg-background/30 relative">
                <TabsContent value="runs" className="h-full m-0 data-[state=inactive]:hidden flex flex-col absolute inset-0">
                     <div className="grid grid-cols-12 gap-4 px-8 py-3 border-b border-border/20 bg-muted/30 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 z-20 backdrop-blur-md">
                        <div className="col-span-12 md:col-span-5">Pipeline / Job ID</div>
                        <div className="col-span-2 hidden md:block">Status</div>
                        <div className="col-span-2 hidden md:block">Duration</div>
                        <div className="col-span-2 hidden md:block">Started</div>
                        <div className="col-span-1 hidden md:block text-right pr-4">Actions</div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {jobs && jobs.length > 0 ? (
                            <div className="divide-y divide-border/10">
                                {jobs.slice(0, 10).map((job) => (
                                    <RecentActivityItem key={job.id} job={job} />
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-40 p-8">
                                <Database className="h-10 w-10 opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest">No activity recorded</span>
                            </div>
                        )}
                    </div>
                </TabsContent>
                
                <TabsContent value="alerts" className="h-full m-0 data-[state=inactive]:hidden absolute inset-0">
                    <DashboardAlertsFeed alerts={alerts} />
                </TabsContent>
                
                <TabsContent value="audit" className="h-full m-0 data-[state=inactive]:hidden absolute inset-0">
                    <DashboardAuditFeed logs={auditLogs} />
                </TabsContent>
                
                <TabsContent value="ephemeral" className="h-full m-0 data-[state=inactive]:hidden absolute inset-0">
                    <EphemeralJobsList jobs={ephemeralJobs} />
                </TabsContent>
            </div>
        </Tabs>
    );
};