/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Play, GitBranch, AlertCircle, Info } from 'lucide-react';
import { getPipelineVersions, type Pipeline } from '@/lib/api';
import { format } from 'date-fns';

interface RunPipelineDialogProps {
    pipeline: Pipeline | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRun: (pipelineId: number, versionId?: number) => void;
}

export const RunPipelineDialog: React.FC<RunPipelineDialogProps> = ({ pipeline, open, onOpenChange, onRun }) => {
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

    const { data: versions, isLoading: isLoadingVersions } = useQuery({
        queryKey: ['pipeline-versions', pipeline?.id],
        queryFn: () => getPipelineVersions(pipeline!.id),
        enabled: !!pipeline && open
    });

    useEffect(() => {
        if (open && pipeline) {
            // Default to latest published or just latest
            // Assuming versions are sorted desc
            if (versions && versions.length > 0 && !selectedVersionId) {
                // Prefer published version if available
                const published = versions.find(v => v.is_published);
                setSelectedVersionId(published ? published.id.toString() : versions[0].id.toString());
            } else if (pipeline.published_version_id && !selectedVersionId) {
                 setSelectedVersionId(pipeline.published_version_id.toString());
            }
        }
    }, [open, pipeline, versions, selectedVersionId]);

    if (!pipeline) return null;

    const handleRun = () => {
        onRun(pipeline.id, selectedVersionId ? parseInt(selectedVersionId) : undefined);
        onOpenChange(false);
    };

    const selectedVersion = versions?.find(v => v.id.toString() === selectedVersionId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-[2rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                <DialogHeader className="p-8 pb-6 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-border/50 shadow-sm">
                            <Play className="h-6 w-6 ml-0.5" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight">Run Pipeline</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground">
                                Trigger a manual execution for <span className="font-bold text-foreground">{pipeline.name}</span>.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Select Version</Label>
                        {isLoadingVersions ? (
                            <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
                        ) : versions && versions.length > 0 ? (
                            <Select value={selectedVersionId || ''} onValueChange={setSelectedVersionId}>
                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Select version" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {versions.map(v => (
                                        <SelectItem key={v.id} value={v.id.toString()} className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">v{v.version}</span>
                                                {v.is_published && (
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                                                        Published
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground ml-auto">
                                                    {format(new Date(v.created_at), 'MMM dd, HH:mm')}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-medium">
                                <AlertCircle className="h-4 w-4" />
                                No versions found. Running draft logic.
                            </div>
                        )}
                        
                        {selectedVersion && (
                            <div className="p-4 rounded-2xl bg-muted/10 border border-border/20 text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nodes:</span>
                                    <span className="font-bold">{selectedVersion.node_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Edges:</span>
                                    <span className="font-bold">{selectedVersion.edge_count}</span>
                                </div>
                                {selectedVersion.is_published && selectedVersion.published_at && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Published:</span>
                                        <span className="font-mono">{format(new Date(selectedVersion.published_at), 'PPP')}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-600 dark:text-blue-400 text-xs leading-relaxed font-medium">
                        <div className="p-1 rounded-lg bg-blue-500/10 shrink-0">
                            <Info className="h-3.5 w-3.5" />
                        </div>
                        <p>
                            Starting this execution will create a new Job Trace. 
                            Live logs will be available in the Forensic tab.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-2 pb-10 sm:justify-center">
                    <div className="flex flex-col w-full gap-4">
                        <Button 
                            onClick={handleRun}
                            className="w-full rounded-2xl h-14 text-base font-black shadow-2xl shadow-primary/30 gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all bg-linear-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white border-none"
                        >
                            <Play className="h-5 w-5 fill-current" /> Run Pipeline
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
