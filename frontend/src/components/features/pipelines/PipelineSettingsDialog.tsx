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
    CalendarClock, Clock, Info, ChevronRight,
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
            <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden rounded-[2.5rem] border-border/40 bg-background dark:bg-background/60 backdrop-blur-xl shadow-2xl">
                <VisuallyHidden.Root>
                    <DialogTitle>Pipeline Settings - {pipeline?.name}</DialogTitle>
                    <DialogDescription>Configure parameters, scheduling, and resources for the pipeline.</DialogDescription>
                </VisuallyHidden.Root>
                <div className="flex flex-col h-[80vh]">
                    {/* Header */}
                    <div className="px-8 py-6 relative z-10 border-b border-border/40 bg-slate-50/50 dark:bg-muted/5">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 shadow-inner shrink-0">
                                <Settings2 className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                                        Pipeline Settings
                                    </h2>
                                    <Badge variant="outline" className="bg-background/50 border-border/40 text-[9px] font-black tracking-[0.2em] px-2 py-0.5 rounded-md">
                                        ENTITY CONFIG
                                    </Badge>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider truncate">
                                    Configure logic, scheduling and resources for <span className="text-foreground">{pipeline?.name}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="general" className="flex-1 flex min-h-0">
                        {/* Sidebar Navigation */}
                        <div className="p-4 w-64 border-r border-border/40 bg-slate-50/30 dark:bg-transparent flex flex-col gap-2 shrink-0 justify-between">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1.5 border-none shadow-none p-0">
                                {[
                                    { id: "general", label: "General Info", icon: FileText, desc: "Identify and describe" },
                                    { id: "automation", label: "Scheduling", icon: CalendarClock, desc: "Automate sync cycles" },
                                    { id: "performance", label: "Compute & Scale", icon: Zap, desc: "Resource allocation" },
                                    { id: "governance", label: "Governance", icon: ShieldAlert, desc: "Policies and security" },
                                ].map((item) => (
                                    <TabsTrigger
                                        key={item.id}
                                        value={item.id}
                                        className={cn(
                                            "w-full flex-col items-start gap-0.5 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 relative overflow-hidden group",
                                            "data-[state=active]:bg-background data-[state=active]:shadow-lg dark:data-[state=active]:shadow-primary/5 data-[state=active]:ring-1 data-[state=active]:ring-border/40",
                                            "hover:bg-slate-100 dark:hover:bg-muted/40 transition-all"
                                        )}
                                    >
                                        {/* Active Indicator Bar */}
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300" />
                                        
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-muted/50 group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary transition-colors">
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-tighter group-data-[state=active]:text-foreground text-muted-foreground/70">{item.label}</span>
                                            <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-data-[state=active]:opacity-40 transition-opacity" />
                                        </div>
                                        <span className="text-[9px] font-bold text-muted-foreground/40 mt-1 pl-8 group-data-[state=active]:text-muted-foreground/60">{item.desc}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <div className="space-y-3 pt-4 border-t border-border/20">
                                <Button
                                    type="submit"
                                    form="settings-form"
                                    disabled={mutation.isPending}
                                    className="w-full rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95"
                                >
                                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync Changes"}
                                </Button>
                                <p className="text-[8px] text-center text-muted-foreground/40 font-black uppercase tracking-widest">Global Configuration Layer</p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-background/20 overflow-hidden relative">
                            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <TabsContent value="general" className="m-0 p-8 animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                        <div className="p-6 rounded-3xl border border-border/40 bg-background dark:bg-card/30 backdrop-blur-md space-y-6 shadow-sm">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                                    <Info className="h-3 w-3" /> Identity Manifest
                                                </Label>
                                                <Input
                                                    {...register('name', { required: true })}
                                                    className="h-12 rounded-xl bg-background/50 border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm shadow-inner"
                                                    placeholder="Enter a descriptive name..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Logical Description</Label>
                                                <Textarea
                                                    {...register('description')}
                                                    className="min-h-30 rounded-xl bg-background/50 border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-xs p-4 resize-none leading-relaxed shadow-inner"
                                                    placeholder="Explain the purpose and expected outcome of this sequence..."
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="automation" className="m-0 p-8 animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                        <div className={cn(
                                            "rounded-3xl border transition-all duration-500 overflow-hidden shadow-sm backdrop-blur-md",
                                            scheduleEnabled ? "border-primary/30 bg-primary/2" : "border-border/40 bg-muted/5"
                                        )}>
                                            <div className="p-6 flex items-center justify-between border-b border-border/20">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-black tracking-tight uppercase">Automated Lifecycle</Label>
                                                    <p className="text-[10px] text-muted-foreground/60 font-bold tracking-tight">Enable periodic sync cycles via cron.</p>
                                                </div>
                                                <Switch
                                                    checked={scheduleEnabled}
                                                    onCheckedChange={(c) => setValue('schedule_enabled', c)}
                                                    className="data-[state=checked]:bg-primary shadow-lg shadow-primary/10"
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
                                                            <div className="p-6 bg-background/80 rounded-2xl border border-border/40 shadow-inner ring-1 ring-black/5">
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

                                    <TabsContent value="performance" className="m-0 p-8 animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                        <div className="p-6 rounded-3xl border border-border/40 bg-card/30 backdrop-blur-md space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                                    <Server className="h-3 w-3" /> Execution Target
                                                </Label>
                                                <Controller
                                                    control={control}
                                                    name="agent_group"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value || 'internal'}>
                                                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 font-black text-[10px] uppercase tracking-widest shadow-inner px-4">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="glass-card border-border/40 rounded-xl">
                                                                <SelectItem value="internal" className="text-[10px] font-black uppercase">
                                                                    <div className="flex items-center gap-2">
                                                                        <Box className="h-3 w-3 text-blue-500" />
                                                                        SynqX Internal Worker (Cloud)
                                                                    </div>
                                                                </SelectItem>
                                                                {agentGroups.map(group => (
                                                                    <SelectItem key={group} value={group} className="text-[10px] font-black uppercase">
                                                                        <div className="flex items-center gap-2">
                                                                            <Terminal className="h-3 w-3 text-emerald-500" />
                                                                            Remote Group: {group}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                <p className="text-[9px] text-muted-foreground/60 font-bold ml-1">
                                                    Choose where the data processing should occur. Remote groups keep data in your private network.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl border border-border/40 bg-card/30 backdrop-blur-md space-y-8">
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Priority</Label>
                                                        <p className="text-[10px] text-muted-foreground/40 font-bold">Relative rank in engine queue.</p>
                                                    </div>
                                                    <Badge className="bg-primary text-primary-foreground border-none font-black px-3 py-0.5 rounded-md text-[10px] tracking-widest">{priority} / 10</Badge>
                                                </div>
                                                <div className="px-2">
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
                                                                className="py-4"
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                                        <Zap className="h-3 w-3" /> Max Parallel Units
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        {...register('max_parallel_runs', { valueAsNumber: true })}
                                                        className="h-12 rounded-xl bg-background/50 border-border/40 font-bold text-sm shadow-inner px-4"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                                        <Clock className="h-3 w-3" /> Time Limit (Sec)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        {...register('execution_timeout_seconds', { valueAsNumber: true })}
                                                        className="h-12 rounded-xl bg-background/50 border-border/40 font-bold text-sm shadow-inner px-4"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl border border-border/40 bg-card/30 backdrop-blur-md space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Fault Recovery Protocol</Label>
                                                <Controller
                                                    control={control}
                                                    name="retry_strategy"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 font-black text-[10px] uppercase tracking-widest shadow-inner px-4">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="glass-card border-border/40 rounded-xl">
                                                                <SelectItem value="none" className="text-[10px] font-black uppercase">Disabled</SelectItem>
                                                                <SelectItem value="fixed" className="text-[10px] font-black uppercase">Fixed Interval</SelectItem>
                                                                <SelectItem value="linear_backoff" className="text-[10px] font-black uppercase">Linear Scale</SelectItem>
                                                                <SelectItem value="exponential_backoff" className="text-[10px] font-black uppercase">Exponential Growth</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {watch('retry_strategy') !== 'none' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="grid grid-cols-2 gap-6 overflow-hidden pt-2"
                                                    >
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Attempt Limit</Label>
                                                            <Input
                                                                type="number"
                                                                {...register('max_retries', { valueAsNumber: true })}
                                                                className="h-12 rounded-xl bg-background/50 border-border/40 font-bold text-sm shadow-inner px-4"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Initial Delay (Sec)</Label>
                                                            <Input
                                                                type="number"
                                                                {...register('retry_delay_seconds', { valueAsNumber: true })}
                                                                className="h-12 rounded-xl bg-background/50 border-border/40 font-bold text-sm shadow-inner px-4"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="governance" className="m-0 p-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="relative mb-8">
                                                <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
                                                <div className="relative h-24 w-24 rounded-[2rem] bg-muted/20 border border-border/40 flex items-center justify-center text-muted-foreground shadow-2xl backdrop-blur-sm">
                                                    <ShieldAlert className="h-10 w-10 opacity-20" />
                                                </div>
                                            </div>
                                            <h3 className="font-black text-lg tracking-tight uppercase">System Governance</h3>
                                            <p className="text-[10px] text-muted-foreground/60 max-w-65 mt-3 font-bold leading-relaxed uppercase tracking-wider">
                                                Immutable audit trails and RBAC policies are managed at the core platform level.
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
