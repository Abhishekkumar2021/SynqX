/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import { CronBuilder } from '@/components/common/CronBuilder';
import { type Pipeline, updatePipeline, getAgents } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import {
    Loader2, Settings2, FileText,
    ShieldAlert, Zap,
    CalendarClock, Clock,
    Server, Terminal, Box
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

interface PipelineSettingsDialogProps {
    pipeline: Pipeline | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SettingsFormData {
    name: string;
    description: string;
    schedule_enabled: boolean;
    schedule_cron: string;
    max_parallel_runs: number;
    max_retries: number;
    retry_strategy: string;
    retry_delay_seconds: number;
    execution_timeout_seconds: number | null;
    agent_group: string | null;
    tags: Record<string, any>;
    priority: number;
}

export const PipelineSettingsDialog: React.FC<PipelineSettingsDialogProps> = ({ pipeline, open, onOpenChange }) => {
    const queryClient = useQueryClient();

    const { register, handleSubmit, setValue, watch, reset, control } = useForm<SettingsFormData>();

    const scheduleEnabled = watch('schedule_enabled');
    const scheduleCron = watch('schedule_cron');
    const priority = watch('priority') || 5;

    // Fetch Agents to get available groups
    const { data: agents } = useQuery({
        queryKey: ['agents'],
        queryFn: getAgents,
    });

    const agentGroups = useMemo(() => {
        const groups = new Set<string>();
        if (agents) {
            agents.forEach((r: any) => {
                if (r.tags?.groups) r.tags.groups.forEach((g: string) => groups.add(g));
            });
        }
        return Array.from(groups);
    }, [agents]);

    useEffect(() => {
        if (pipeline && open) {
            reset({
                name: pipeline.name,
                description: pipeline.description || '',
                schedule_enabled: pipeline.schedule_enabled || false,
                schedule_cron: pipeline.schedule_cron || '0 0 * * *',
                max_parallel_runs: pipeline.max_parallel_runs || 1,
                max_retries: pipeline.max_retries || 3,
                retry_strategy: (pipeline as any).retry_strategy || 'fixed',
                retry_delay_seconds: (pipeline as any).retry_delay_seconds || 60,
                execution_timeout_seconds: pipeline.execution_timeout_seconds || 3600,
                priority: pipeline.priority || 5,
                agent_group: (pipeline as any).agent_group || 'internal',
            });
        }
    }, [pipeline, open, reset]);

    const mutation = useMutation({
        mutationFn: (data: SettingsFormData) => {
            if (!pipeline) throw new Error("No pipeline selected");
            return updatePipeline(pipeline.id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            if (pipeline) queryClient.invalidateQueries({ queryKey: ['pipeline', pipeline.id.toString()] });
            toast.success("Settings Synchronized");
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error("Update Failed", {
                description: err.response?.data?.detail?.message || "There was an error saving configurations."
            });
        }
    });

    const onSubmit = (data: SettingsFormData) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden rounded-2xl border-border/40 bg-background/95 shadow-2xl backdrop-blur-3xl">
                <VisuallyHidden.Root>
                    <DialogTitle>Pipeline Settings - {pipeline?.name}</DialogTitle>
                    <DialogDescription>Configure parameters, scheduling, and resources for the pipeline.</DialogDescription>
                </VisuallyHidden.Root>
                <div className="flex flex-col h-[80vh]">
                    {/* Header */}
                    <div className="px-8 py-6 relative z-10 border-b border-border/40 bg-muted/5">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                                <Settings2 className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        Pipeline Configuration
                                    </h2>
                                    <Badge variant="secondary" className="bg-muted/50 border-border/40 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-md uppercase">
                                        Instance Settings
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground mt-1 opacity-80">
                                    Control logic, scheduling and resources for <span className="text-foreground font-bold">{pipeline?.name}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="general" className="flex-1 flex min-h-0">
                        {/* Sidebar Navigation */}
                        <div className="p-4 w-60 border-r border-border/40 bg-muted/10 flex flex-col gap-1 shrink-0">
                            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 border-none shadow-none">
                                {[
                                    { id: "general", label: "General", icon: FileText },
                                    { id: "automation", label: "Automation", icon: CalendarClock },
                                    { id: "performance", label: "Performance", icon: Zap },
                                    { id: "governance", label: "Policies", icon: ShieldAlert },
                                ].map((item) => (
                                    <TabsTrigger
                                        key={item.id}
                                        value={item.id}
                                        className={cn(
                                            "w-full justify-start gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-bold",
                                            "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary",
                                            "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/40"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <div className="mt-auto space-y-3 pt-4 border-t border-border/20">
                                <Button
                                    type="submit"
                                    form="settings-form"
                                    disabled={mutation.isPending}
                                    className="w-full rounded-xl h-11 text-xs font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95"
                                >
                                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                                </Button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden relative">
                            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <TabsContent value="general" className="m-0 p-8 animate-in fade-in duration-300 space-y-8">
                                        <div className="space-y-6 max-w-2xl">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Pipeline Identity</Label>
                                                <Input
                                                    {...register('name', { required: true })}
                                                    className="h-11 rounded-xl bg-background border-border/40 focus:border-primary/40 transition-all font-bold text-sm shadow-sm"
                                                    placeholder="Enter name..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Detailed Description</Label>
                                                <Textarea
                                                    {...register('description')}
                                                    className="min-h-32 rounded-xl bg-background border-border/40 focus:border-primary/40 transition-all text-sm p-4 resize-none leading-relaxed shadow-sm"
                                                    placeholder="Explain the purpose of this pipeline..."
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="automation" className="m-0 p-8 animate-in fade-in duration-300 space-y-8">
                                        <div className={cn(
                                            "rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm backdrop-blur-md max-w-2xl",
                                            scheduleEnabled ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/5"
                                        )}>
                                            <div className="p-6 flex items-center justify-between border-b border-border/20">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-bold tracking-tight uppercase">Scheduled Execution</Label>
                                                    <p className="text-xs text-muted-foreground font-medium opacity-70">Enable automated sync cycles via cron.</p>
                                                </div>
                                                <Switch
                                                    checked={scheduleEnabled}
                                                    onCheckedChange={(c) => setValue('schedule_enabled', c)}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </div>

                                            <AnimatePresence>
                                                {scheduleEnabled && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="p-6 bg-background/40">
                                                            <div className="p-6 bg-background rounded-xl border border-border/40 shadow-inner">
                                                                <CronBuilder
                                                                    value={scheduleCron}
                                                                    onChange={(val) => setValue('schedule_cron', val)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="performance" className="m-0 p-8 animate-in fade-in duration-300 space-y-8">
                                        <div className="grid gap-8 max-w-2xl">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                                                    <Server className="h-3.5 w-3.5" /> Compute Environment
                                                </Label>
                                                <Controller
                                                    control={control}
                                                    name="agent_group"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value || 'internal'}>
                                                            <SelectTrigger className="h-11 rounded-xl bg-background border-border/40 font-bold text-xs shadow-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl bg-background/95">
                                                                <SelectItem value="internal" className="text-xs font-bold">
                                                                    <div className="flex items-center gap-2">
                                                                        <Box className="h-3.5 w-3.5 text-blue-500" />
                                                                        Internal Cloud Cluster
                                                                    </div>
                                                                </SelectItem>
                                                                {agentGroups.map(group => (
                                                                    <SelectItem key={group} value={group} className="text-xs font-bold">
                                                                        <div className="flex items-center gap-2">
                                                                            <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                                                                            Remote Group: {group}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-6 p-6 rounded-2xl border border-border/40 bg-muted/5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Execution Priority</Label>
                                                    <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-md text-[10px]">{priority} / 10</Badge>
                                                </div>
                                                <Controller
                                                    control={control}
                                                    name="priority"
                                                    render={({ field }) => (
                                                        <Slider
                                                            min={1}
                                                            max={10}
                                                            step={1}
                                                            value={[field.value]}
                                                            onValueChange={(val) => field.onChange(val[0])}
                                                            className="py-2"
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                                                        <Zap className="h-3.5 w-3.5" /> Max Parallel
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        {...register('max_parallel_runs', { valueAsNumber: true })}
                                                        className="h-11 rounded-xl bg-background border-border/40 font-bold text-sm shadow-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5" /> Timeout (Sec)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        {...register('execution_timeout_seconds', { valueAsNumber: true })}
                                                        className="h-11 rounded-xl bg-background border-border/40 font-bold text-sm shadow-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4 p-6 rounded-2xl border border-border/40 bg-muted/5">
                                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-2">Fault Recovery</Label>
                                                <Controller
                                                    control={control}
                                                    name="retry_strategy"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-11 rounded-xl bg-background border-border/40 font-bold text-xs shadow-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-border/40 backdrop-blur-xl bg-background/95">
                                                                <SelectItem value="none" className="text-xs font-bold">Disabled</SelectItem>
                                                                <SelectItem value="fixed" className="text-xs font-bold">Fixed Interval</SelectItem>
                                                                <SelectItem value="linear_backoff" className="text-xs font-bold">Linear Scale</SelectItem>
                                                                <SelectItem value="exponential_backoff" className="text-xs font-bold">Exponential Growth</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                
                                                <AnimatePresence>
                                                    {watch('retry_strategy') !== 'none' && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="grid grid-cols-2 gap-4 overflow-hidden pt-2"
                                                        >
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground opacity-60">Retries</Label>
                                                                <Input
                                                                    type="number"
                                                                    {...register('max_retries', { valueAsNumber: true })}
                                                                    className="h-10 rounded-lg bg-background border-border/40 font-bold text-xs"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground opacity-60">Delay (S)</Label>
                                                                <Input
                                                                    type="number"
                                                                    {...register('retry_delay_seconds', { valueAsNumber: true })}
                                                                    className="h-10 rounded-lg bg-background border-border/40 font-bold text-xs"
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="governance" className="m-0 p-8 animate-in fade-in duration-300">
                                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                            <div className="h-16 w-16 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mb-6">
                                                <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="font-bold text-base tracking-tight uppercase">Platform Governance</h3>
                                            <p className="text-xs text-muted-foreground max-w-xs mt-3 font-medium leading-relaxed">
                                                RBAC policies and audit trails are managed at the global platform level.
                                            </p>
                                        </div>
                                    </TabsContent>
                                </div>
                            </form>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};
