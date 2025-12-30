/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPipelines, triggerPipeline } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface RunPipelineDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const RunPipelineDialog: React.FC<RunPipelineDialogProps> = ({ open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

    // Fetch pipelines only when dialog is open to save resources on dashboard load
    const { data: pipelines, isLoading } = useQuery({
        queryKey: ['pipelines'],
        queryFn: getPipelines,
        enabled: open
    });

    const runMutation = useMutation({
        mutationFn: (id: number) => triggerPipeline(id),
        onSuccess: (data) => {
            const pipelineName = pipelines?.find(p => p.id.toString() === selectedPipelineId)?.name || 'Pipeline';
            toast.success("Pipeline Triggered", {
                description: `Successfully started execution for "${pipelineName}". Job ID: ${data.job_id}`
            });
            // Invalidate dashboard stats to reflect new job
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            // Also invalidate jobs list if user navigates there
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            onOpenChange(false);
            setSelectedPipelineId('');
        },
        onError: (err: any) => {
            toast.error("Trigger Failed", {
                description: err.response?.data?.detail?.message || "There was an error starting the pipeline. Please try again."
            });
        }
    });

    const handleRun = () => {
        if (!selectedPipelineId) return;
        runMutation.mutate(parseInt(selectedPipelineId));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Run Pipeline</DialogTitle>
                    <DialogDescription>
                        Manually trigger a pipeline execution. This will create a new job.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Pipeline</Label>
                        <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a pipeline..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? (
                                    <div className="p-2 text-center text-xs text-muted-foreground">Loading pipelines...</div>
                                ) : pipelines && pipelines.length > 0 ? (
                                    pipelines.map((p) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-center text-xs text-muted-foreground">No pipelines found</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleRun} 
                        disabled={!selectedPipelineId || runMutation.isPending}
                        className="gap-2"
                    >
                        {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Run Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};