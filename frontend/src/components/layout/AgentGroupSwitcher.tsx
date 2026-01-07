import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Laptop, 
    ChevronDown, 
    Check, 
    Box, 
    RefreshCw,
    Loader2,
    Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getAgents, updateWorkspace } from '@/lib/api';
import { toast } from 'sonner';

export const AgentGroupSwitcher: React.FC = () => {
    const { activeWorkspace } = useWorkspace();
    const queryClient = useQueryClient();

    const { data: agents, isLoading: isLoadingAgents } = useQuery({
        queryKey: ['agents'],
        queryFn: getAgents
    });

    const updateWsMutation = useMutation({
        mutationFn: (group: string) => 
            updateWorkspace(activeWorkspace!.id, { 
                default_agent_group: group,
                clear_all_pipelines: group === 'internal'
            }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            toast.success(variables === 'internal' ? "Reverted to Internal Worker" : "Routing Environment Updated");
        }
    });

    const agentGroups = useMemo(() => {
        const groups = new Set<string>();
        if (agents) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            agents.forEach((a: any) => {
                if (a.tags?.groups) {
                    a.tags.groups.forEach((g: string) => {
                        if (g !== 'internal') groups.add(g);
                    });
                }
            });
        }
        return Array.from(groups);
    }, [agents]);

    if (!activeWorkspace) return null;

    const currentGroup = activeWorkspace.default_agent_group || 'internal';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    "flex items-center gap-2 px-3 h-9 rounded-xl transition-all duration-300 outline-none group border border-border/40 hover:border-primary/40",
                    currentGroup !== 'internal' 
                        ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                )}>
                    <div className={cn(
                        "flex shrink-0 items-center justify-center rounded-lg transition-all duration-300 h-5 w-5",
                        currentGroup !== 'internal' ? "bg-emerald-500/10" : "bg-primary/5"
                    )}>
                        {updateWsMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Cpu className={cn("h-3 w-3", currentGroup !== 'internal' ? "text-emerald-500" : "text-primary/60")} />
                        )}
                    </div>
                    
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                        {currentGroup !== 'internal' ? currentGroup : "Internal Worker"}
                    </span>

                    <ChevronDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 rounded-2xl glass-card shadow-2xl p-2 border-border/40 bg-background/95 backdrop-blur-xl">
                <div className="px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">Routing Control</p>
                </div>
                
                <DropdownMenuItem 
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group"
                    onClick={() => updateWsMutation.mutate('internal')}
                >
                    <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                        currentGroup === 'internal' ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted border-border/40"
                    )}>
                        <Box className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold leading-tight">Internal Worker</span>
                        <span className="text-[9px] opacity-50 font-medium tracking-tight">Cloud Default</span>
                    </div>
                    {currentGroup === 'internal' && <Check className="h-4 w-4 ml-auto text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border/10 my-2 mx-1" />
                
                <div className="px-3 py-1 mb-1">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">Registered Agent Groups</p>
                </div>

                {isLoadingAgents ? (
                    <div className="flex items-center justify-center p-6">
                        <RefreshCw className="h-4 w-4 animate-spin opacity-20" />
                    </div>
                ) : agentGroups.length > 0 ? (
                    <div className="space-y-1">
                        {agentGroups.map(group => (
                            <DropdownMenuItem 
                                key={group}
                                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group"
                                onClick={() => updateWsMutation.mutate(group)}
                            >
                                <div className={cn(
                                    "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                                    currentGroup === group ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-muted border-border/40"
                                )}>
                                    <Laptop className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold leading-tight">{group}</span>
                                    <span className="text-[9px] opacity-50 font-medium tracking-tight">Remote Execution</span>
                                </div>
                                {currentGroup === group && <Check className="h-4 w-4 ml-auto text-emerald-500" />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 text-center">
                        <p className="text-[10px] text-muted-foreground italic font-medium leading-relaxed">
                            No remote agents found. Register one in the Agents tab to enable hybrid routing.
                        </p>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};