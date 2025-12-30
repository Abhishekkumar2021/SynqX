import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getPipelineVersions, 
    publishPipelineVersion, 
    triggerPipeline
} from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    History as HistoryIcon, 
    Play, 
    Clock, 
    ArrowUpCircle,
    Loader2,
    Database,
    Share2,
    Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface PipelineVersionDialogProps {
    pipelineId: number;
    pipelineName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const PipelineVersionDialog: React.FC<PipelineVersionDialogProps> = ({

    pipelineId,

    pipelineName,

    open,

    onOpenChange,

}) => {

    const queryClient = useQueryClient();

    const navigate = useNavigate();



    const { data: versions, isLoading } = useQuery({

        queryKey: ['pipeline-versions', pipelineId],

        queryFn: () => getPipelineVersions(pipelineId),

        enabled: open,

    });



    const publishMutation = useMutation({

        mutationFn: (versionId: number) => publishPipelineVersion(pipelineId, versionId),

        onSuccess: () => {

            toast.success("Version Published");

            queryClient.invalidateQueries({ queryKey: ['pipeline-versions', pipelineId] });

            queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId.toString()] });

        },

        onError: (err: any) => {

            toast.error("Publish Failed", {

                description: err.response?.data?.detail?.message || "Could not publish version."

            });

        }

    });



    const runMutation = useMutation({

        mutationFn: (versionId: number) => triggerPipeline(pipelineId, versionId),

        onSuccess: (data) => {

            toast.success("Execution Started", {

                description: `Job ID: ${data.job_id}`

            });

            onOpenChange(false);

        },

        onError: (err: any) => {

            toast.error("Run Failed", {

                description: err.response?.data?.detail?.message || "Could not trigger pipeline."

            });

        }

    });



    return (

        <Dialog open={open} onOpenChange={onOpenChange}>

            <DialogContent className="max-w-3xl h-[600px] flex flex-col p-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl rounded-[2rem] ring-1 ring-white/5 dark:ring-white/10">

                

                <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0 bg-muted/20">

                    <div className="flex items-center gap-3">

                        <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">

                            <HistoryIcon className="h-5 w-5" />

                        </div>

                        <div>

                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Snapshot Registry</DialogTitle>

                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">

                                Repository: {pipelineName}

                            </DialogDescription>

                        </div>

                    </div>

                </DialogHeader>



                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar relative bg-background">

                    {isLoading ? (

                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">

                            <Loader2 className="h-10 w-10 animate-spin text-primary" />

                            <p className="text-[10px] font-black tracking-widest uppercase">Fetching Snapshots</p>

                        </div>

                    ) : versions?.length === 0 ? (

                        <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/40 m-2">

                            <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />

                            <h3 className="font-bold text-foreground/80">No Snapshots Found</h3>

                            <p className="text-muted-foreground text-[11px] max-w-xs mx-auto mt-1 font-medium leading-relaxed">

                                Deploy changes to generate immutable versions of your pipeline.

                            </p>

                        </div>

                    ) : (

                        <div className="relative space-y-4">

                            {/* Simplified Timeline Line */}

                            <div className="absolute left-[27px] top-6 bottom-6 w-px bg-border/40 hidden md:block" />



                            {versions?.map((version) => (

                                <div 

                                    key={version.id}

                                    className={cn(

                                        "group relative flex items-start gap-5 p-4 rounded-2xl border transition-all duration-300",

                                        version.is_published 

                                            ? "bg-primary/5 border-primary/30 shadow-sm" 

                                            : "bg-muted/20 border-border/40 hover:bg-muted/30 hover:border-primary/20"

                                    )}

                                >

                                    {/* Version Identifier */}

                                    <div className={cn(

                                        "hidden md:flex h-14 w-14 shrink-0 rounded-xl items-center justify-center border transition-all duration-300 z-10",

                                        version.is_published 

                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 

                                            : "bg-background border-border/60 text-muted-foreground group-hover:border-primary group-hover:text-primary"

                                    )}>

                                        <span className="text-lg font-black italic">v{version.version}</span>

                                    </div>



                                    <div className="flex-1 min-w-0 flex flex-col gap-3">

                                        <div className="flex items-center justify-between">

                                            <div className="flex items-center gap-3">

                                                <span className="md:hidden font-black text-xl text-primary">v{version.version}</span>

                                                {version.is_published && (

                                                    <Badge className="bg-primary hover:bg-primary text-[8px] font-black uppercase tracking-widest px-2 py-0 h-4 rounded-full">

                                                        Active

                                                    </Badge>

                                                )}

                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">

                                                    <Clock className="h-3 w-3 text-primary/60" />

                                                    {format(new Date(version.created_at), 'MMM d, HH:mm')}

                                                </div>

                                            </div>

                                            

                                            <div className="flex items-center gap-1">

                                                <TooltipProvider>

                                                    <Tooltip>

                                                        <TooltipTrigger asChild>

                                                            <Button

                                                                variant="ghost"

                                                                size="icon"

                                                                onClick={() => {

                                                                    navigate(`/pipelines/${pipelineId}?version=${version.version}`);

                                                                    onOpenChange(false);

                                                                }}

                                                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all active:scale-90"

                                                            >

                                                                <Eye className="h-3.5 w-3.5" />

                                                            </Button>

                                                        </TooltipTrigger>

                                                        <TooltipContent className="text-[10px] font-black uppercase tracking-widest px-2 py-1">Inspect</TooltipContent>

                                                    </Tooltip>

                                                </TooltipProvider>



                                                <TooltipProvider>

                                                    <Tooltip>

                                                        <TooltipTrigger asChild>

                                                            <Button

                                                                variant="ghost"

                                                                size="icon"

                                                                onClick={() => runMutation.mutate(version.id)}

                                                                disabled={runMutation.isPending || publishMutation.isPending}

                                                                className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 transition-all active:scale-90"

                                                            >

                                                                {runMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}

                                                            </Button>

                                                        </TooltipTrigger>

                                                        <TooltipContent className="text-[10px] font-black uppercase tracking-widest px-2 py-1">Execute</TooltipContent>

                                                    </Tooltip>

                                                </TooltipProvider>



                                                {!version.is_published && (

                                                    <TooltipProvider>

                                                        <Tooltip>

                                                            <TooltipTrigger asChild>

                                                                <Button

                                                                    variant="ghost"

                                                                    size="icon"

                                                                    onClick={() => publishMutation.mutate(version.id)}

                                                                    disabled={publishMutation.isPending || runMutation.isPending}

                                                                    className="h-8 w-8 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all active:scale-90"

                                                                >

                                                                    {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}

                                                                </Button>

                                                            </TooltipTrigger>

                                                            <TooltipContent className="text-[10px] font-black uppercase tracking-widest px-2 py-1">Restore</TooltipContent>

                                                        </Tooltip>

                                                    </TooltipProvider>

                                                )}

                                            </div>

                                        </div>



                                        <div className="flex items-center justify-between mt-auto">

                                            <div className="flex items-center gap-3 text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">

                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/40">

                                                    <Database className="h-3 w-3 text-primary/60" />

                                                    {version.node_count} Nodes

                                                </div>

                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/40">

                                                    <Share2 className="h-3 w-3 text-primary/60" />

                                                    {version.edge_count} Edges

                                                </div>

                                            </div>

                                            <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] italic">Immutable Snapshot</span>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            </DialogContent>

        </Dialog>

    );

};