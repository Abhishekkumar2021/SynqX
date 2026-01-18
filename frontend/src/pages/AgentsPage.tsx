/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useZenMode } from '@/hooks/useZenMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

import { PageMeta } from '@/components/common/PageMeta';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { AgentsHeader } from '@/components/features/agents/AgentsHeader';
import { AgentsToolbar } from '@/components/features/agents/AgentsToolbar';
import { AgentsList } from '@/components/features/agents/AgentsList';
import { RegisterAgentDialog, SetupInstructions } from '@/components/features/agents/RegisterAgentDialog';
import { getAgents, deleteAgent } from '@/lib/api/agents';

export const AgentsPage = () => {
    const queryClient = useQueryClient();
    const { isZenMode } = useZenMode();
    const { isEditor } = useWorkspace();
    const [searchParams, setSearchParams] = useSearchParams();

    // URL Synced State
    const filter = searchParams.get('q') || '';
    const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid';
    const isRegisterOpen = searchParams.get('action') === 'register';
    const inspectId = searchParams.get('inspect');

    const setFilter = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('q', val);
            else next.delete('q');
            return next;
        });
    };

    const setViewMode = (val: 'grid' | 'list') => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', val);
            return next;
        });
    };

    const openRegister = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('action', 'register');
            return next;
        });
    };

    const closeRegister = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('action');
            return next;
        });
    };

    const inspectAgent = (agent: any) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('inspect', String(agent.id));
            return next;
        });
    };

    const closeInspect = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('inspect');
            return next;
        });
    };

    // Data Fetching
    const { data: agents, isLoading } = useQuery({
        queryKey: ['agents'],
        queryFn: getAgents,
        refetchInterval: 10000 
    });

    const inspectingAgent = useMemo(() => 
        agents?.find((a: any) => String(a.id) === inspectId) || null
    , [agents, inspectId]);

    const deleteMutation = useMutation({
        mutationFn: deleteAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            toast.success("Agent removed successfully");
        },
        onError: (err: any) => {
            toast.error("Failed to remove agent", {
                description: err.response?.data?.detail || "An unexpected error occurred."
            });
        }
    });

    const filteredAgents = useMemo(() => {
        if (!agents) return [];
        return agents.filter((r: any) => 
            r.name.toLowerCase().includes(filter.toLowerCase()) ||
            r.client_id.toLowerCase().includes(filter.toLowerCase()) ||
            r.system_info?.os?.toLowerCase().includes(filter.toLowerCase()) ||
            r.tags?.groups?.some((g: string) => g.toLowerCase().includes(filter.toLowerCase()))
        );
    }, [agents, filter]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex flex-col gap-6 md:gap-8 px-1",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-full"
            )}
        >
            <PageMeta title="Agents" description="Manage and monitor your remote execution agents." />
            
            <AgentsHeader onCreate={isEditor ? openRegister : undefined} />

            <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <AgentsToolbar 
                    filter={filter}
                    setFilter={setFilter}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    count={filteredAgents.length}
                />

                <AgentsList
                    agents={filteredAgents}
                    isLoading={isLoading}
                    viewMode={viewMode}
                    onInspect={inspectAgent}
                    onDelete={(id) => deleteMutation.mutate(id)}
                />
            </div>

            {/* Registration Dialog */}
            <RegisterAgentDialog 
                open={isRegisterOpen} 
                onOpenChange={(open) => !open && closeRegister()} 
                agents={agents}
            />

            {/* Inspection Dialog */}
            <Dialog open={!!inspectingAgent} onOpenChange={(v) => !v && closeInspect()}>
                <DialogContent className="sm:max-w-[850px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl ring-1 ring-white/10 dark:ring-white/5 max-h-[85vh] flex flex-col">
                    <VisuallyHidden.Root>
                        <DialogTitle>Agent Details</DialogTitle>
                        <DialogDescription>View setup instructions and configuration for this agent.</DialogDescription>
                    </VisuallyHidden.Root>
                    {inspectingAgent && (
                        <SetupInstructions 
                            clientId={inspectingAgent.client_id}
                            apiKey="••••••••••••••••" 
                            agentName={inspectingAgent.name}
                            tags={inspectingAgent.tags?.groups?.join(',') || 'default'}
                            onClose={closeInspect}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};