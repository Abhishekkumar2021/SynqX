/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useZenMode } from '@/hooks/useZenMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';

import { PageMeta } from '@/components/common/PageMeta';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

    // State
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [inspectingAgent, setInspectingAgent] = useState<any | null>(null);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Data Fetching
    const { data: agents, isLoading } = useQuery({
        queryKey: ['agents'],
        queryFn: getAgents,
        refetchInterval: 10000 
    });

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
                "flex flex-col gap-6 md:gap-8",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-full"
            )}
        >
            <PageMeta title="Agents" description="Manage and monitor your remote execution agents." />
            
            <AgentsHeader onCreate={isEditor ? () => setIsRegisterOpen(true) : undefined} />

            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
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
                    onInspect={setInspectingAgent}
                    onDelete={(id) => deleteMutation.mutate(id)}
                />
            </div>

            {/* Registration Dialog */}
            <RegisterAgentDialog 
                open={isRegisterOpen} 
                onOpenChange={setIsRegisterOpen} 
                agents={agents}
            />

            {/* Inspection Dialog */}
            <Dialog open={!!inspectingAgent} onOpenChange={(v) => !v && setInspectingAgent(null)}>
                <DialogContent className="sm:max-w-[850px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl ring-1 ring-white/10 dark:ring-white/5 max-h-[85vh] flex flex-col">
                    <VisuallyHidden.Root>
                        <title>Agent Details</title>
                        <description>View setup instructions and configuration for this agent.</description>
                    </VisuallyHidden.Root>
                    {inspectingAgent && (
                        <SetupInstructions 
                            clientId={inspectingAgent.client_id}
                            apiKey="••••••••••••••••" 
                            runnerName={inspectingAgent.name}
                            tags={inspectingAgent.tags?.groups?.join(',') || 'default'}
                            onClose={() => setInspectingAgent(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};