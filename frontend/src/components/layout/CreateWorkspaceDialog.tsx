/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
    Dialog, 
    DialogContent, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createWorkspace } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Rocket, Globe, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CreateWorkspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({ open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { register, handleSubmit, watch, reset } = useForm({
        defaultValues: {
            name: '',
            description: ''
        }
    });

    const workspaceName = watch('name');
    const [, setSlug] = useState('');

    useEffect(() => {
        if (workspaceName) {
            setSlug(workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
        } else {
            setSlug('');
        }
    }, [workspaceName]);

    const mutation = useMutation({
        mutationFn: createWorkspace,
        onSuccess: (data) => {
            toast.success("Workspace Launched!", {
                description: `"${data.name}" is ready for your data pipelines.`,
                icon: <Sparkles className="h-4 w-4 text-emerald-500" />
            });
            
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            
            onOpenChange(false);
            reset();
            
            // Navigate to dashboard and refresh to ensure all context providers reset
            navigate('/dashboard');
            setTimeout(() => window.location.reload(), 100);
        },
        onError: (error: any) => {
            toast.error("Launch Failed", {
                description: error.response?.data?.detail || "We couldn't create your workspace right now."
            });
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-125 rounded-[2.5rem] bg-background/95 backdrop-blur-3xl border-border/40 shadow-2xl p-0 overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
                    
                    {/* Visual Banner */}
                    <div className="h-32 bg-linear-to-br from-primary/20 via-indigo-500/10 to-transparent relative overflow-hidden flex items-center px-8">
                        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                            <Rocket className="h-32 w-32" />
                        </div>
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-4 z-10"
                        >
                            <div className="h-14 w-14 rounded-2xl bg-background shadow-xl flex items-center justify-center ring-1 ring-border/50">
                                <Building2 className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">New Workspace</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3" /> Professional Data Environment
                                </DialogDescription>
                            </div>
                        </motion.div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-6">
                            {/* Name Input */}
                            <div className="space-y-3">
                                <Label htmlFor="ws-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">
                                    Organization Name
                                </Label>
                                <Input 
                                    id="ws-name" 
                                    {...register('name', { required: true })} 
                                    placeholder="e.g. Acme Corp" 
                                    className="h-14 bg-muted/20 border-border/40 rounded-2xl px-5 text-base font-bold focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-3">
                                <Label htmlFor="ws-desc" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">
                                    Workspace Purpose
                                </Label>
                                <Textarea 
                                    id="ws-desc" 
                                    {...register('description')} 
                                    placeholder="What will you build here? (Optional)" 
                                    className="min-h-25 bg-muted/20 border-border/40 rounded-2xl p-5 text-sm focus-visible:ring-primary/20 focus-visible:bg-background transition-all resize-none leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Informational Footer */}
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 items-start">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5">
                                <Globe className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                                Workspaces provide logical isolation for your connectors and pipelines. You can invite team members and assign roles after launch.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)} 
                            className="flex-1 rounded-2xl h-14 font-bold uppercase tracking-widest text-[10px] hover:bg-muted/50"
                        >
                            Nevermind
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={mutation.isPending || !workspaceName}
                            className={cn(
                                "flex-1 rounded-2xl h-14 font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-500 gap-2",
                                mutation.isPending ? "opacity-80" : "shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
                            )}
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                <>
                                    Launch Workspace
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
