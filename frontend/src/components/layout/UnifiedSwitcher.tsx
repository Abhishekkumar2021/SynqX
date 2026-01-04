/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ChevronsUpDown,
    Check,
    PlusCircle,
    Building2,
    Settings2,
    Loader2,
    Search,
    Laptop,
    Box,
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getAgents, updateWorkspace } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

export const UnifiedSwitcher: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { 
        workspaces, 
        activeWorkspace, 
        switchActiveWorkspace, 
        isSwitching, 
        isLoading: loadingWs 
    } = useWorkspace();

    const [activeTab, setActiveTab] = useState<'workspace' | 'execution'>('workspace');
    const [createWsOpen, setCreateWsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const { data: agents } = useQuery({
        queryKey: ['agents'],
        queryFn: getAgents
    });

    const updateRoutingMutation = useMutation({
        mutationFn: (group: string) => 
            updateWorkspace(activeWorkspace!.id, { 
                default_agent_group: group,
                clear_all_pipelines: group === 'internal' 
            }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['pipelines'] }); 
            toast.success(variables === 'internal' 
                ? "Workspace reverted to Internal Cloud Mode" 
                : `Execution routed to ${variables}`
            );
        }
    });

    // --- Derived State ---
    const agentGroups = useMemo(() => {
        const groups = new Set<string>();
        if (agents && Array.isArray(agents)) {
            agents.forEach((a: any) => {
                if (a.tags) {
                    if (Array.isArray(a.tags.groups)) {
                        a.tags.groups.forEach((g: string) => {
                            if (g !== 'internal') groups.add(String(g));
                        });
                    } else if (Array.isArray(a.tags)) {
                        a.tags.forEach((g: any) => {
                            if (g !== 'internal') groups.add(String(g));
                        });
                    }
                }
            });
        }
        return Array.from(groups).sort();
    }, [agents]);

    const filteredWorkspaces = useMemo(() => {
        return workspaces.filter(ws => 
            ws.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [workspaces, search]);

    if (!activeWorkspace) return null;

    const currentAgentGroup = activeWorkspace.default_agent_group || 'internal';

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                            "flex items-center gap-3 px-4 h-10 rounded-2xl transition-all duration-500 outline-none group border border-border/60 bg-background/40 hover:bg-background/60 hover:border-primary/40 shadow-xs hover:shadow-md",
                            currentAgentGroup !== 'internal' && "ring-1 ring-emerald-500/20"
                        )}
                    >
                        <div className={cn(
                            "flex shrink-0 items-center justify-center rounded-xl transition-all duration-500 h-6 w-6",
                            currentAgentGroup !== 'internal' ? "bg-emerald-500/10 text-emerald-600 shadow-emerald-500/10" : "bg-primary/10 text-primary shadow-primary/10"
                        )}>
                            {isSwitching || loadingWs || updateRoutingMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : currentAgentGroup !== 'internal' ? (
                                <Laptop className="h-3.5 w-3.5" />
                            ) : (
                                <Building2 className="h-3.5 w-3.5" />
                            )}
                        </div>

                        <div className="flex flex-col items-start overflow-hidden whitespace-nowrap min-w-25 max-w-45">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">
                                {activeWorkspace.name}
                            </span>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tight truncate",
                                currentAgentGroup !== 'internal' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                            )}>
                                {currentAgentGroup !== 'internal' ? `Agent: ${currentAgentGroup}` : "Internal Cloud Mode"}
                            </span>
                        </div>

                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                </DropdownMenuTrigger>

                <DropdownMenuContent 
                    align="center" 
                    sideOffset={8}
                    className="w-[320px] p-0 rounded-[2rem] glass-panel shadow-2xl border-border/40 overflow-hidden bg-background/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                >
                    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                        <div className="p-4 pb-2">
                            <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/30 rounded-xl border border-border/40 shadow-inner">
                                <TabsTrigger value="workspace" className="rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 transition-all data-[state=active]:shadow-md">
                                    <Building2 className="h-3 w-3" /> Environments
                                </TabsTrigger>
                                <TabsTrigger value="execution" className="rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 transition-all data-[state=active]:shadow-md">
                                    <Cpu className="h-3 w-3" /> Routing
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="workspace" className="m-0 focus-visible:outline-none">
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-2 space-y-1">
                                <div className="px-2 pb-2">
                                    <div className="relative group">
                                        <Search className="z-20 absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input 
                                            placeholder="Find environment..." 
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="h-8 pl-8 rounded-lg bg-muted/20 border-border/40 focus-visible:ring-primary/20 text-[10px] font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-60 overflow-y-auto custom-scrollbar px-1 space-y-1">
                                    {filteredWorkspaces.map((ws) => (
                                        <DropdownMenuItem 
                                            key={ws.id} 
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-xl cursor-pointer group transition-all duration-200",
                                                activeWorkspace.id === ws.id ? "bg-primary/10 text-primary border border-primary/20" : "focus:bg-muted/50 border border-transparent"
                                            )}
                                            onClick={() => switchActiveWorkspace(ws.id)}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center border transition-all duration-300",
                                                activeWorkspace.id === ws.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border-primary" : "bg-muted border-border/40"
                                            )}>
                                                <Building2 className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <span className="text-[11px] font-bold truncate leading-none mb-0.5">{ws.name}</span>
                                                <span className="text-[8px] opacity-50 uppercase font-black tracking-tighter">{ws.role}</span>
                                            </div>
                                            {activeWorkspace.id === ws.id && <Check className="h-3.5 w-3.5" />}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            </motion.div>
                        </TabsContent>

                        <TabsContent value="execution" className="m-0 focus-visible:outline-none">
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="p-3 space-y-1">
                                <DropdownMenuItem 
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
                                    onClick={() => updateRoutingMutation.mutate('internal')}
                                >
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                                        currentAgentGroup === 'internal' ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted border-border/40"
                                    )}>
                                        <Box className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold leading-none mb-0.5">Internal Worker</span>
                                        <span className="text-[9px] opacity-50 font-medium uppercase tracking-tighter italic">Native Cloud Mode</span>
                                    </div>
                                    {currentAgentGroup === 'internal' && <Check className="h-4 w-4 ml-auto text-primary" />}
                                </DropdownMenuItem>

                                <div className="h-px bg-border/20 my-2 mx-2" />

                                {agentGroups.map(group => (
                                    <DropdownMenuItem 
                                        key={group}
                                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
                                        onClick={() => updateRoutingMutation.mutate(group)}
                                    >
                                        <div className={cn(
                                            "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                                            currentAgentGroup === group ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-muted border-border/40"
                                        )}>
                                            <Laptop className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold leading-none mb-0.5">{group}</span>
                                            <span className="text-[9px] opacity-50 font-medium uppercase tracking-tighter italic">Secure Agent Mode</span>
                                        </div>
                                        {currentAgentGroup === group && <Check className="h-4 w-4 ml-auto text-emerald-500" />}
                                    </DropdownMenuItem>
                                ))}
                            </motion.div>
                        </TabsContent>
                    </Tabs>

                    <DropdownMenuSeparator className="bg-border/40" />
                    
                    <div className="bg-muted/10 p-2 grid grid-cols-2 gap-1.5">
                        <DropdownMenuItem 
                            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl focus:bg-primary/10 focus:text-primary cursor-pointer text-center group transition-all"
                            onClick={() => setCreateWsOpen(true)}
                        >
                            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all shadow-sm">
                                <PlusCircle size={16} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-70">New Env</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl focus:bg-primary/10 focus:text-primary cursor-pointer text-center group transition-all"
                            onClick={() => navigate('/settings?tab=workspace')}
                        >
                            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:-rotate-12 transition-all shadow-sm">
                                <Settings2 size={16} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-70">Governance</span>
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateWorkspaceDialog open={createWsOpen} onOpenChange={setCreateWsOpen} />
        </div>
    );
};