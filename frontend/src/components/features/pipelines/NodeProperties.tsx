/* eslint-disable no-empty */
/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
    X, Trash2, Save, Code, Sliders,
    Database, 
    Info, HelpCircle, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type Node } from '@xyflow/react';
import { toast } from 'sonner';
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue,
    SelectGroup,
    SelectLabel
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { getConnections, getConnectionAssets } from '@/lib/api';
import { NODE_DEFINITIONS, getNodeIcon, getOperatorDefinition, type OperatorField } from '@/lib/pipeline-definitions';

interface NodePropertiesProps {
    node: Node | null;
    onClose: () => void;
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onDuplicate: (node: Node) => void;
}

const HelpIcon = ({ content }: { content?: string }) => {
    if (!content) return null;
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-primary cursor-help transition-colors ml-1.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-[10px] leading-relaxed p-3 rounded-xl border-border/40 bg-background/95 backdrop-blur-md shadow-2xl z-50">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-primary/80 font-bold uppercase tracking-widest text-[9px]">
                            <Info className="h-3 w-3" /> Information
                        </div>
                        <p className="text-foreground/90 font-medium">
                            {content}
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onClose, onUpdate, onDelete, onDuplicate }) => {
    const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<any>();
    const [activeTab, setActiveTab] = useState('settings');

    // Watchers
    const nodeType = (watch('operator_type') || '').toLowerCase();
    const operatorClass = watch('operator_class');
    const selectedConnectionId = watch('connection_id');

    // Get Definition
    const opDef = useMemo(() => getOperatorDefinition(operatorClass), [operatorClass]);

    // Fetch Connections
    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: getConnections,
    });

    // Fetch Assets
    const { data: assets } = useQuery({
        queryKey: ['assets', selectedConnectionId],
        queryFn: () => getConnectionAssets(parseInt(selectedConnectionId)),
        enabled: !!selectedConnectionId && !isNaN(parseInt(selectedConnectionId)),
    });

    const filteredAssets = assets?.filter(a => {
        if (nodeType === 'source') return a.is_source;
        if (nodeType === 'sink') return a.is_destination;
        return true;
    });

    useEffect(() => {
        if (node) {
            const config = node.data.config as any || {};
            let currentType = ((node.data.type as string) || (node.data.operator_type as string) || 'transform').toLowerCase();
            const currentOpClass = (node.data.operator_class as string) || (currentType === 'source' ? 'extractor' : currentType === 'sink' ? 'loader' : 'pandas_transform');

            const def = getOperatorDefinition(currentOpClass);
            
            const formValues: any = {
                label: (node.data.label as string) || '',
                description: (node.data.description as string) || '',
                operator_type: currentType,
                operator_class: currentOpClass,
                config: JSON.stringify(config, null, 2),
                connection_id: String(node.data.connection_id || ''),
                asset_id: String(node.data.asset_id || node.data.source_asset_id || node.data.destination_asset_id || ''),
                write_strategy: config.write_strategy || 'append',
                max_retries: node.data.max_retries ?? 3,
                retry_strategy: (node.data as any).retry_strategy || 'fixed',
                retry_delay_seconds: node.data.retry_delay_seconds ?? 60,
                timeout_seconds: node.data.timeout_seconds ?? 3600
            };

            // Dynamic hydration based on definition fields
            if (def?.fields) {
                def.fields.forEach(field => {
                    const val = config[field.configKey];
                    // IMPORTANT: Use field.name as the key for react-hook-form
                    if (field.type === 'json') {
                        formValues[field.name] = val ? JSON.stringify(val, null, 2) : '';
                    } else if (Array.isArray(val)) {
                        formValues[field.name] = val.join(', ');
                    } else {
                        formValues[field.name] = val !== undefined ? String(val) : '';
                    }
                });
            }

            reset(formValues);
        }
    }, [node, reset]);


    if (!node) return null;

    const Icon = getNodeIcon(nodeType || 'transform');

    const onSubmit = (data: any) => {
        try {
            const baseConfig = JSON.parse(data.config);
            const dynamicConfig: any = {};

            // Map dynamic fields back to config
            if (opDef?.fields) {
                opDef.fields.forEach(field => {
                    const val = data[field.name]; // Retrieve from form using field.name
                    if (field.type === 'json') {
                        try { 
                            if (val && val.trim()) {
                                dynamicConfig[field.configKey] = JSON.parse(val); 
                            }
                        } catch(e) {
                            console.error(`Failed to parse JSON for field ${field.name}`, e);
                        }
                    } else if (field.description?.toLowerCase().includes('comma separated')) {
                        dynamicConfig[field.configKey] = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                    } else if (field.type === 'number') {
                        dynamicConfig[field.configKey] = Number(val);
                    } else {
                        dynamicConfig[field.configKey] = val;
                    }
                });
            }

            const payload: any = {
                label: data.label,
                description: data.description,
                type: data.operator_type,
                operator_class: data.operator_class,
                config: { 
                    ...baseConfig, 
                    ...dynamicConfig,
                    write_strategy: data.operator_type === 'sink' ? data.write_strategy : undefined
                },
                connection_id: data.connection_id ? parseInt(data.connection_id) : undefined,
                asset_id: data.asset_id ? parseInt(data.asset_id) : undefined,
                max_retries: data.max_retries,
                retry_strategy: data.retry_strategy,
                retry_delay_seconds: data.retry_delay_seconds,
                timeout_seconds: data.timeout_seconds,
            };


            if (data.operator_type === 'source') payload.source_asset_id = payload.asset_id;
            if (data.operator_type === 'sink') payload.destination_asset_id = payload.asset_id;

            onUpdate(node.id, payload);
            toast.success("Configuration saved");
        } catch (e) {
            toast.error("Invalid configuration schema");
        }
    };

    const renderField = (field: OperatorField) => {
        switch (field.type) {
            case 'select':
                return (
                    <Controller
                        key={field.name}
                        control={control}
                        name={field.name}
                        render={({ field: selectField }) => (
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <Label className="text-[10px] font-bold">{field.label}</Label>
                                    <HelpIcon content={field.tooltip} />
                                </div>
                                <Select onValueChange={selectField.onChange} value={selectField.value}>
                                    <SelectTrigger className="h-9 rounded-lg bg-background/50">
                                        <SelectValue placeholder={`Select ${field.label}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {field.options?.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    />
                );
            case 'json':
            case 'textarea':
                return (
                    <div key={field.name} className="space-y-2">
                        <div className="flex items-center">
                            <Label className="text-[10px] font-bold">{field.label}</Label>
                            <HelpIcon content={field.tooltip} />
                        </div>
                        <Textarea 
                            {...register(field.name)} 
                            placeholder={field.placeholder}
                            className="font-mono text-[10px] min-h-[100px] bg-background/50 rounded-lg"
                        />
                        {field.description && <p className="text-[9px] text-muted-foreground">{field.description}</p>}
                    </div>
                );
            default:
                return (
                    <div key={field.name} className="space-y-2">
                        <div className="flex items-center">
                            <Label className="text-[10px] font-bold">{field.label}</Label>
                            <HelpIcon content={field.tooltip} />
                        </div>
                        <Input 
                            {...register(field.name)} 
                            type={field.type} 
                            placeholder={field.placeholder}
                            className="h-9 bg-background/50 rounded-lg"
                        />
                        {field.description && <p className="text-[9px] text-muted-foreground">{field.description}</p>}
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col bg-background/40 backdrop-blur-xl border-l border-border/40 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors",
                        nodeType === 'source' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        nodeType === 'sink' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        "bg-primary/10 text-primary border-primary/20"
                    )}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-foreground">Inspector</h3>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{node.id}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8">
                    <X size={16} />
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pt-4 shrink-0">
                    <TabsList className="w-full grid grid-cols-2 h-9 bg-muted/50 p-1 rounded-lg">
                        <TabsTrigger value="settings" className="text-xs gap-2 rounded-md"><Sliders size={14} /> Basic</TabsTrigger>
                        <TabsTrigger value="advanced" className="text-xs gap-2 rounded-md"><Code size={14} /> Advanced</TabsTrigger>
                    </TabsList>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            <TabsContent value="settings" className="m-0 space-y-6 focus-visible:outline-none">
                                {/* Identity - Name Only */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Node Identity</Label>
                                    <Input
                                        {...register('label', { required: true })}
                                        placeholder="Descriptive name..."
                                        className="h-10 rounded-lg bg-background/50 border-border/40 focus:ring-primary/20"
                                    />
                                </div>

                                {/* Operator Specific Config (IO or Logic) */}
                                <div className="space-y-4">
                                    {(nodeType === 'source' || nodeType === 'sink') && (
                                        <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-muted/10">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Database className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">IO Mapping</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center">
                                                    <Label className="text-[10px] font-bold">Connection</Label>
                                                    <HelpIcon content="Choose an external system to communicate with." />
                                                </div>
                                                <Controller
                                                    control={control}
                                                    name="connection_id"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="h-9 rounded-lg bg-background/50">
                                                                <SelectValue placeholder="Select connection" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {connections?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center">
                                                    <Label className="text-[10px] font-bold">Target Asset</Label>
                                                    <HelpIcon content="Select the specific table, file, or endpoint within the connection." />
                                                </div>
                                                <Controller
                                                    control={control}
                                                    name="asset_id"
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedConnectionId}>
                                                            <SelectTrigger className="h-9 rounded-lg bg-background/50">
                                                                <SelectValue placeholder={selectedConnectionId ? "Select asset" : "Connect first"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {filteredAssets?.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>

                                            {nodeType === 'sink' && (
                                                <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="flex items-center">
                                                        <Label className="text-[10px] font-bold">Write Strategy</Label>
                                                        <HelpIcon content="Append: keep existing. Overwrite: wipe and replace. Upsert: update matching, insert new." />
                                                    </div>
                                                    <Controller
                                                        control={control}
                                                        name="write_strategy"
                                                        render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-9 rounded-lg bg-background/50 border-primary/20">
                                                                    <SelectValue placeholder="Select strategy" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="append">Append (Add rows)</SelectItem>
                                                                    <SelectItem value="overwrite">Overwrite (Truncate & Load)</SelectItem>
                                                                    <SelectItem value="upsert">Upsert (Match & Update)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                    <p className="text-[9px] text-muted-foreground italic">Defines how data is committed to the target.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {opDef?.fields && (
                                        <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-primary/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sliders className="h-3 w-3 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Operator Properties</span>
                                            </div>
                                            {opDef.fields.map(renderField)}
                                        </div>
                                    )}
                                </div>

                                <Separator className="opacity-50" />

                                {/* Reliability */}
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Orchestration & Reliability</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <Label className="text-[10px] font-bold">Retry Logic</Label>
                                                <HelpIcon content="Control how the engine behaves when this specific task fails." />
                                            </div>
                                            <Controller
                                                control={control}
                                                name="retry_strategy"
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-9 rounded-lg bg-background/50">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Disabled</SelectItem>
                                                            <SelectItem value="fixed">Fixed Delay</SelectItem>
                                                            <SelectItem value="linear_backoff">Linear</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        {watch('retry_strategy') !== 'none' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex items-center">
                                                    <Label className="text-[10px] font-bold">Max Retries</Label>
                                                    <HelpIcon content="Number of times to attempt the task before marking it as FAILED." />
                                                </div>
                                                <Input type="number" {...register('max_retries', { valueAsNumber: true })} className="h-9 bg-background/50" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {watch('retry_strategy') !== 'none' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex items-center">
                                                    <Label className="text-[10px] font-bold">Retry Delay (sec)</Label>
                                                    <HelpIcon content="Time to wait between retry attempts." />
                                                </div>
                                                <Input type="number" {...register('retry_delay_seconds', { valueAsNumber: true })} className="h-9 bg-background/50" />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <Label className="text-[10px] font-bold">Execution TTL (sec)</Label>
                                                <HelpIcon content="Maximum time this task is allowed to run before being killed." />
                                            </div>
                                            <Input type="number" {...register('timeout_seconds', { valueAsNumber: true })} placeholder="3600" className="h-9 bg-background/50" />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                {/* Secondary Info */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Documentation</Label>
                                    <Textarea
                                        {...register('description')}
                                        placeholder="Optional node description or notes..."
                                        className="min-h-[80px] rounded-lg bg-background/50 border-border/40 focus:ring-primary/20 text-xs resize-none"
                                    />
                                </div>

                                {!opDef?.fields && nodeType !== 'source' && nodeType !== 'sink' && (
                                    <div className="flex items-center gap-3 p-4 bg-muted/20 border border-border/40 rounded-xl text-muted-foreground">
                                        <Info size={16} />
                                        <p className="text-[10px]">No visual fields available. Use <b>Advanced</b> tab for JSON config.</p>
                                    </div>
                                )}
                            </TabsContent>


                            <TabsContent value="advanced" className="m-0 h-full focus-visible:outline-none">
                                <div className="space-y-4 h-full">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expert Configuration</Label>
                                        <Badge variant="outline" className="text-[9px] font-mono">JSON</Badge>
                                    </div>
                                    <Textarea
                                        {...register('config', { required: true })}
                                        className="font-mono text-[11px] min-h-[450px] bg-[#0a0a0a]/80 text-emerald-500 border-white/5 rounded-xl p-4 resize-none leading-relaxed shadow-2xl"
                                        spellCheck={false}
                                    />
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center gap-3 backdrop-blur-md">
                        <Button type="submit" className="flex-1 rounded-xl h-10 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                            <Save size={14} className="mr-2" /> Save Config
                        </Button>
                        
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="secondary" size="icon" onClick={() => onDuplicate(node)} className="h-10 w-10 rounded-xl hover:bg-background/80 hover:text-primary">
                                        <Copy size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Duplicate Node</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 size={18} />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-border/40 backdrop-blur-2xl bg-background/95 shadow-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">De-provision Node?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium text-sm">This will permanently remove the operator and all its logical connections.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2 mt-6">
                                    <AlertDialogCancel className="rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest border-border/40">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => { onDelete(node.id); onClose(); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest">Delete Operator</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </form>
            </Tabs>
        </div>
    );
};