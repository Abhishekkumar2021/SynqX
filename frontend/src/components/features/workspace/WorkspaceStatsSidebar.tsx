/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Activity, ShieldCheck, UserCheck } from 'lucide-react';
import { DangerZone } from './DangerZone';

interface WorkspaceStatsSidebarProps {
    activeWorkspace: any;
    isAdmin: boolean;
    members?: any[];
    queryClient: any;
}

export const WorkspaceStatsSidebar: React.FC<WorkspaceStatsSidebarProps> = ({
    activeWorkspace,
    isAdmin,
    members,
    queryClient
}) => {
    return (
        <div className="flex flex-col gap-6">
            {/* Health Card */}
            <div className="rounded-[1.5rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden group/card relative">
                <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center gap-2.5 text-primary relative z-10">
                    <Activity className="h-3.5 w-3.5 group-hover/card:scale-110 transition-transform" />
                    <h4 className="text-[9px] font-black uppercase tracking-widest">
                        Ecosystem Vitality
                    </h4>
                </div>
                <div className="p-5 space-y-5 relative z-10">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 group/item hover:border-primary/20 transition-all duration-300">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">Total Members</span>
                                <span className="text-lg font-black text-foreground tabular-nums">
                                    {members?.length || 0}
                                </span>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/item:scale-110 transition-transform">
                                <UserCheck size={16} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 group/item hover:border-emerald-500/20 transition-all duration-300">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">Your Authority</span>
                                <span className="text-xs font-black text-emerald-500 uppercase tracking-tight">
                                    {activeWorkspace?.role || 'Viewer'}
                                </span>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/item:scale-110 transition-transform">
                                <ShieldCheck size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-1 border-t border-border/10">
                        <div className="flex justify-between items-center text-[8px] font-black text-muted-foreground uppercase tracking-widest px-1">
                            <span>Identity Context</span>
                            <span className="text-primary font-mono text-[8px] truncate ml-2 max-w-25">{activeWorkspace?.slug}</span>
                        </div>
                        <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20">
                            <div className="h-full bg-primary rounded-full w-full opacity-20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            {isAdmin && (
                <DangerZone 
                    workspaceId={activeWorkspace?.id} 
                    queryClient={queryClient}
                />
            )}
        </div>
    );
};