/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog,
    DialogContent
} from '@/components/ui/dialog';
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
import { CronBuilder } from '@/components/common/CronBuilder';
import { type Pipeline, updatePipeline } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Loader2, Settings2, FileText, Activity,
    ShieldAlert, Zap,
    CalendarClock, Clock
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
    priority: number;
}

export const PipelineSettingsDialog: React.FC<PipelineSettingsDialogProps> = ({ pipeline, open, onOpenChange }) => {
    const queryClient = useQueryClient();

    const { register, handleSubmit, setValue, watch, reset, control } = useForm<SettingsFormData>();

    const scheduleEnabled = watch('schedule_enabled');
    const scheduleCron = watch('schedule_cron');
    const priority = watch('priority') || 5;

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
                priority: pipeline.priority || 5
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
            <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-[2.5rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">

                <div className="flex flex-col h-[75vh]">
                    {/* Header */}
                    <div className="px-10 py-8 relative z-10 border-b border-border/40 bg-muted/5">
                        <div className="flex items-start gap-6">
                            <div className="p-4 rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-lg shrink-0">
                                <Settings2 className="h-9 w-9" />
                            </div>
                            <div className="space-y-3 flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                                        Sequence Configuration
                                    </h2>
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-background border border-border/50">
                                        Entity
                                    </Badge>
                                </div>
                                <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
                                    Manage execution parameters, scheduling, and governance for <span className="font-bold text-foreground">{pipeline?.name}</span>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="general" className="flex-1 flex min-h-0">
                        {/* Sidebar Navigation */}
                        <div className="p-4 w-60 border-r border-border/40 bg-muted/10 flex flex-col gap-2 shrink-0 justify-between">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-2 border-none">
                                {[
                                    { id: "general", label: "General Info", icon: FileText },
                                    { id: "automation", label: "Scheduling", icon: Activity },
                                    { id: "performance", label: "Compute & Scale", icon: Zap },
                                    { id: "governance", label: "Governance", icon: ShieldAlert },
                                ].map((item) => (
                                    <TabsTrigger
                                        key={item.id}
                                        value={item.id}
                                        className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-xs font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/50 transition-all"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <Button
                                type="submit"
                                form="settings-form"
                                disabled={mutation.isPending}
                                className="rounded-xl h-11 px-8 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                            >
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Commit Changes"}
                            </Button>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col min-w-0 bg-background/30 overflow-hidden relative">
                            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <TabsContent value="general" className="m-0 p-10 animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Identity Manifest</Label>
                                            <Input
                                                {...register('name', { required: true })}
                                                className="h-14 rounded-2xl bg-background/50 border-border/60 focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all font-black text-base shadow-inner"
                                                placeholder="Pipeline name"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Logical Description</Label>
                                            <Textarea
                                                {...register('description')}
                                                className="min-h-[180px] rounded-2xl bg-background/50 border-border/60 focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all text-sm p-5 resize-none leading-relaxed shadow-inner"
                                                placeholder="Explain the purpose and data flow of this pipeline..."
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="automation" className="m-0 p-10 animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { label: "Hourly", value: "0 * * * *", icon: <Clock className="h-5 w-5" /> },
                                                { label: "Daily", value: "0 0 * * *", icon: <CalendarClock className="h-5 w-5" /> },
                                                { label: "Weekly", value: "0 0 * * 0", icon: <Activity className="h-5 w-5" /> },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setValue('schedule_cron', preset.value);
                                                        setValue('schedule_enabled', true);
                                                        toast.success(`Schedule: ${preset.label}`);
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-3 p-5 rounded-[1.5rem] border transition-all active:scale-95 group",
                                                        scheduleCron === preset.value && scheduleEnabled
                                                            ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20 text-primary shadow-lg shadow-primary/5"
                                                            : "bg-muted/20 border-border/40 text-muted-foreground/60 hover:border-primary/30 hover:bg-muted/40"
                                                    )}
                                                >
                                                    <div className={cn("p-2 rounded-xl transition-colors", scheduleCron === preset.value && scheduleEnabled ? "bg-primary/20" : "bg-muted/50")}>
                                                        {preset.icon}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{preset.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className={cn(
                                            "rounded-[2rem] border transition-all duration-500 overflow-hidden shadow-sm",
                                            scheduleEnabled ? "border-primary/30 bg-primary/2" : "border-border/40 bg-muted/10"
                                        )}>
                                            <div className="p-6 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <Label className="text-base font-black tracking-tight">Active Schedule</Label>
                                                    <p className="text-[11px] text-muted-foreground font-bold opacity-70">Automate sequence execution using cron syntax.</p>
                                                </div>
                                                <Switch
                                                    checked={scheduleEnabled}
                                                    onCheckedChange={(c) => setValue('schedule_enabled', c)}
                                                    className="scale-110 data-[state=checked]:bg-primary shadow-xl shadow-primary/20"
                                                />
                                            </div>

                                            {scheduleEnabled && (
                                                <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                    <div className="p-6 bg-background rounded-[1.5rem] border border-border/40 shadow-inner ring-1 ring-black/5">
                                                        <CronBuilder
                                                            value={scheduleCron}
                                                            onChange={(val) => setValue('schedule_cron', val)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="performance" className="m-0 p-10 animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Priority</Label>
                                                <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1 rounded-full text-xs">{priority} / 10</Badge>
                                            </div>
                                            <Input
                                                type="number" min={1} max={10}
                                                {...register('priority', { valueAsNumber: true })}
                                                className="h-14 rounded-2xl bg-background/50 border-border/60 font-black text-lg shadow-inner text-center"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Max Parallel Units</Label>
                                            <Input
                                                type="number"
                                                {...register('max_parallel_runs', { valueAsNumber: true })}
                                                className="h-14 rounded-2xl bg-background/50 border-border/60 font-black text-base shadow-inner px-6"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Execution Timeout (Seconds)</Label>
                                                <Input
                                                    type="number"
                                                    {...register('execution_timeout_seconds', { valueAsNumber: true })}
                                                    className="h-14 rounded-2xl bg-background/50 border-border/60 font-black text-base shadow-inner px-6"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Retry Strategy</Label>
                                                <Controller
                                                    control={control}
                                                    name="retry_strategy"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/60 font-black text-sm shadow-inner px-6">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl">
                                                                <SelectItem value="none">None</SelectItem>
                                                                <SelectItem value="fixed">Fixed Delay</SelectItem>
                                                                <SelectItem value="linear_backoff">Linear Backoff</SelectItem>
                                                                <SelectItem value="exponential_backoff">Exponential Backoff</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {watch('retry_strategy') !== 'none' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                                    className="grid grid-cols-2 gap-6 overflow-hidden"
                                                >
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Auto-Retry Threshold</Label>
                                                        <Input
                                                            type="number"
                                                            {...register('max_retries', { valueAsNumber: true })}
                                                            className="h-14 rounded-2xl bg-background/50 border-border/60 font-black text-base shadow-inner px-6"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Base Delay (Seconds)</Label>
                                                        <Input
                                                            type="number"
                                                            {...register('retry_delay_seconds', { valueAsNumber: true })}
                                                            className="h-14 rounded-2xl bg-background/50 border-border/60 font-black text-base shadow-inner px-6"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </TabsContent>

                                    <TabsContent value="governance" className="m-0 p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="relative mb-8">
                                                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                                                <div className="relative p-8 bg-muted/20 rounded-[2.5rem] border border-border/40 text-muted-foreground shadow-2xl">
                                                    <ShieldAlert className="h-12 w-12 opacity-40" />
                                                </div>
                                            </div>
                                            <h3 className="font-black text-xl tracking-tight">System Governance</h3>
                                            <p className="text-xs text-muted-foreground max-w-[280px] mt-2 font-bold leading-relaxed opacity-60">
                                                Role-based access controls and audit logging are managed at the organization level.
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
