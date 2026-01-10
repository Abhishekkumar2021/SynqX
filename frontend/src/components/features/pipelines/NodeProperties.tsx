/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
    X, Trash2, Save, Code, Sliders,
    Database,
    Info, HelpCircle, Copy,
    Plus,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { GitCompare, ArrowRight } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
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
import { getNodeIcon, getOperatorDefinition, type OperatorField } from '@/lib/pipeline-definitions';
import { useWorkspace } from '@/hooks/useWorkspace';

interface NodePropertiesProps {
    node: Node | null;
    onClose: () => void;
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onDuplicate: (node: Node) => void;
}

const VALIDATION_CHECKS = [
    { label: 'Not Null', value: 'not_null' },
    { label: 'Unique', value: 'unique' },
    { label: 'Regex Match', value: 'regex' },
    { label: 'Min Value', value: 'min_value' },
    { label: 'Max Value', value: 'max_value' },
    { label: 'In List', value: 'in_list' },
    { label: 'Data Type', value: 'data_type' },
];

const DATA_TYPES = [
    { label: 'String', value: 'string' },
    { label: 'Integer', value: 'int' },
    { label: 'Float', value: 'float' },
];

const HelpIcon = ({ content }: { content?: string }) => {
    if (!content) return null;
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-primary cursor-help transition-colors ml-1.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-55 text-[10px] leading-relaxed p-3 rounded-xl border-border/40 bg-background/95 backdrop-blur-md shadow-2xl">
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

const RuleBuilder = ({ watch, setValue }: any) => {
    const rules = watch('schema_rules') || [];

    const addRule = () => {
        setValue('schema_rules', [...rules, { column: '', check: 'not_null' }]);
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        setValue('schema_rules', newRules);
    };

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setValue('schema_rules', newRules);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Validation Rules</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRule} className="h-7 text-[9px] font-bold uppercase tracking-wider rounded-lg border-primary/20 hover:bg-primary/5">
                    <Plus className="h-3 w-3 mr-1" /> Add Rule
                </Button>
            </div>

            <div className="space-y-3">
                {rules.map((rule: any, index: number) => (
                    <div key={index} className="p-4 rounded-xl border border-border/40 bg-background/40 space-y-3 relative group/rule">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeRule(index)}
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/rule:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 size={12} />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60">Column</Label>
                                <Input 
                                    placeholder="e.g. email" 
                                    value={rule.column} 
                                    onChange={(e) => updateRule(index, 'column', e.target.value)}
                                    className="h-8 text-xs bg-muted/20"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60">Check</Label>
                                <Select value={rule.check} onValueChange={(val) => updateRule(index, 'check', val)}>
                                    <SelectTrigger className="h-8 text-xs bg-muted/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VALIDATION_CHECKS.map(c => (
                                            <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            {rule.check === 'regex' && (
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground/60">Pattern</Label>
                                    <Input 
                                        placeholder="^[\\w-\.]+@([\\w-]+\.)+[\\w-]{2,4}$" 
                                        value={rule.pattern || ''} 
                                        onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                                        className="h-8 text-xs font-mono bg-muted/20"
                                    />
                                </div>
                            )}
                            {(rule.check === 'min_value' || rule.check === 'max_value') && (
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground/60">Threshold Value</Label>
                                    <Input 
                                        type="number"
                                        value={rule.value || 0} 
                                        onChange={(e) => updateRule(index, 'value', Number(e.target.value))}
                                        className="h-8 text-xs bg-muted/20"
                                    />
                                </div>
                            )}
                            {rule.check === 'in_list' && (
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground/60">Allowed Values (Comma Separated)</Label>
                                    <Input 
                                        placeholder="active, pending, deleted" 
                                        value={rule.values?.join(', ') || ''} 
                                        onChange={(e) => updateRule(index, 'values', e.target.value.split(',').map(s => s.trim()))}
                                        className="h-8 text-xs bg-muted/20"
                                    />
                                </div>
                            )}
                            {rule.check === 'data_type' && (
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground/60">Expected Type</Label>
                                    <Select value={rule.type || 'string'} onValueChange={(val) => updateRule(index, 'type', val)}>
                                        <SelectTrigger className="h-8 text-xs bg-muted/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DATA_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {rules.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-border/40 rounded-xl bg-muted/5">
                        <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No validation rules defined</p>
                        <Button type="button" variant="link" size="sm" onClick={addRule} className="text-[10px] text-primary h-auto p-0 mt-1">Create First Rule</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onClose, onUpdate, onDelete, onDuplicate }) => {
    const { register, handleSubmit, watch, reset, control, setValue } = useForm<any>();
    const [activeTab, setActiveTab] = useState('settings');
    const [schemaMode, setSchemaMode] = useState<'visual' | 'manual'>('visual');
    const { isEditor, isAdmin } = useWorkspace();

    // Watchers
    const nodeType = (watch('operator_type') || '').toLowerCase();
    const operatorClass = watch('operator_class');
    const selectedConnectionId = watch('connection_id');

    // Reset asset_id when connection changes
    useEffect(() => {
        if (selectedConnectionId) {
            const currentAssetId = watch('asset_id');
            // Only reset if it's not already empty and we're not in the initial load
            // (Initial load handled by reset() in the other useEffect)
            if (currentAssetId && node && String(node.data.connection_id) !== selectedConnectionId) {
                setValue('asset_id', '');
            }
        }
    }, [selectedConnectionId, setValue, watch, node]);

    // Get Definition
    const opDef = useMemo(() => getOperatorDefinition(operatorClass), [operatorClass]);

    // Fetch Connections
    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: getConnections,
    });

    // Fetch Assets
    const { data: assets, isLoading: isLoadingAssets } = useQuery({
        queryKey: ['assets', selectedConnectionId],
        queryFn: () => getConnectionAssets(parseInt(selectedConnectionId)),
        enabled: !!selectedConnectionId && !isNaN(parseInt(selectedConnectionId)),
    });

    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets.filter((a: any) => {
            if (nodeType === 'source') return a.is_source !== false; // Show unless explicitly false
            if (nodeType === 'sink') return a.is_destination !== false; // Show unless explicitly false
            return true;
        });
    }, [assets, nodeType]);

    useEffect(() => {
        if (node) {
            const config = node.data.config as any || {};
            const currentType = ((node.data.type as string) || (node.data.operator_type as string) || 'transform').toLowerCase();
            const currentOpClass = (node.data.operator_class as string) || (currentType === 'source' ? 'extractor' : currentType === 'sink' ? 'loader' : 'pandas_transform');

            const def = getOperatorDefinition(currentOpClass);

            // Auto-switch to diff tab if there's a diff
            if (node.data.diffStatus && node.data.diffStatus !== 'none') {
                setActiveTab('diff');
            } else {
                setActiveTab('settings');
            }

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
                timeout_seconds: node.data.timeout_seconds ?? 3600,
                schema_rules: currentOpClass === 'validate' ? (config.schema || []) : [],
                schema_json_manual: currentOpClass === 'validate' ? JSON.stringify(config.schema || [], null, 2) : ''
            };

            // Dynamic hydration based on definition fields
            if (def?.fields) {
                def.fields.forEach(field => {
                    const val = config[field.configKey];
                    // IMPORTANT: Use field.name as the key for react-hook-form
                    if (field.type === 'json') {
                        formValues[field.name] = val ? JSON.stringify(val, null, 2) : '';
                    } else if (field.type === 'boolean') {
                        formValues[field.name] = val === true;
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
                    let val = data[field.name]; // Retrieve from form using field.name
                    
                    // Special handling for schema rules in visual builder
                    if (field.name === 'schema' && data.operator_class === 'validate') {
                        val = schemaMode === 'visual' ? data.schema_rules : data.schema_json_manual;
                    }

                    if (field.type === 'json') {
                        try {
                            if (typeof val === 'string' && val.trim()) {
                                dynamicConfig[field.configKey] = JSON.parse(val);
                            } else if (typeof val === 'object') {
                                dynamicConfig[field.configKey] = val;
                            }
                        } catch (e) {
                            console.error(`Failed to parse JSON for field ${field.name}`, e);
                        }
                    } else if (field.description?.toLowerCase().includes('comma separated')) {
                        dynamicConfig[field.configKey] = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                    } else if (field.type === 'number') {
                        dynamicConfig[field.configKey] = val === '' || val === undefined ? undefined : Number(val);
                    } else if (field.type === 'boolean') {
                        dynamicConfig[field.configKey] = Boolean(val);
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
        if (field.name === 'schema' && operatorClass === 'validate') {
            return (
                <div key={field.name} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Label className="text-[10px] font-bold">{field.label}</Label>
                            <HelpIcon content={field.tooltip} />
                        </div>
                        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/40">
                            <Button 
                                type="button" 
                                variant={schemaMode === 'visual' ? "secondary" : "ghost"} 
                                size="sm" 
                                className="h-6 px-2 text-[9px] font-bold rounded-md"
                                onClick={() => setSchemaMode('visual')}
                            >
                                Visual
                            </Button>
                            <Button 
                                type="button" 
                                variant={schemaMode === 'manual' ? "secondary" : "ghost"} 
                                size="sm" 
                                className="h-6 px-2 text-[9px] font-bold rounded-md"
                                onClick={() => setSchemaMode('manual')}
                            >
                                JSON
                            </Button>
                        </div>
                    </div>
                    {schemaMode === 'visual' ? (
                        <RuleBuilder watch={watch} setValue={setValue} register={register} />
                    ) : (
                        <div className="space-y-2">
                            <Textarea 
                                {...register('schema_json_manual')} 
                                placeholder={field.placeholder}
                                readOnly={!isEditor}
                                className="font-mono text-[10px] min-h-40 bg-[#0a0a0a]/80 text-emerald-500 border-white/5 rounded-lg p-3"
                            />
                            <p className="text-[9px] text-muted-foreground">Manual JSON override. Use with caution.</p>
                        </div>
                    )}
                </div>
            );
        }
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
                                <Select onValueChange={selectField.onChange} value={selectField.value} disabled={!isEditor}>
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
                                                    readOnly={!isEditor}
                                                    className="font-mono text-[10px] min-h-25 bg-background/50 rounded-lg"
                                                />                        {field.description && <p className="text-[9px] text-muted-foreground">{field.description}</p>}
                    </div>
                );
            case 'boolean':
                return (
                    <Controller
                        key={field.name}
                        control={control}
                        name={field.name}
                        render={({ field: checkboxField }) => (
                            <div className="flex items-center space-x-2 py-1">
                                                                <Checkbox 
                                                                    id={field.name}
                                                                    checked={checkboxField.value} 
                                                                    onCheckedChange={checkboxField.onChange} 
                                                                    disabled={!isEditor}
                                                                />                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor={field.name}
                                        className="text-[10px] font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                                    >
                                        {field.label}
                                        <HelpIcon content={field.tooltip} />
                                    </label>
                                </div>
                            </div>
                        )}
                    />
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
                                                    readOnly={!isEditor}
                                                    className="h-9 bg-background/50 rounded-lg"
                                                />                        {field.description && <p className="text-[9px] text-muted-foreground">{field.description}</p>}
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
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="settings" className="gap-2"><Sliders size={14} /> Basic</TabsTrigger>
                        {node.data.diffStatus && node.data.diffStatus !== 'none' ? (
                            <TabsTrigger value="diff" className="gap-2 bg-amber-500/10 text-amber-500"><GitCompare size={14} /> Diff</TabsTrigger>
                        ) : (
                            <TabsTrigger value="advanced" className="gap-2"><Code size={14} /> Advanced</TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            <TabsContent value="settings" className="m-0 space-y-6 focus-visible:outline-none">
                                {/* Identity - Name Only */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Node Identity</Label>
                                    <Input
                                        {...register('label', { required: true })}
                                        placeholder="Descriptive name..."
                                        readOnly={!isEditor}
                                        className="h-10 rounded-lg bg-background/50 border-border/40 focus:ring-primary/20"
                                    />
                                </div>

                                {/* Operator Specific Config (IO or Logic) */}
                                <div className="space-y-4">
                                    {(nodeType === 'source' || nodeType === 'sink') && (
                                        <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-muted/10">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Database className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">IO Mapping</span>
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
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                                                            <SelectTrigger className="h-9 rounded-lg bg-background/50">
                                                                <SelectValue placeholder="Select connection" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {connections?.map((c: { id: React.Key | null | undefined; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
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
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedConnectionId || !isEditor || isLoadingAssets}>
                                                            <SelectTrigger className="h-9 rounded-lg bg-background/50">
                                                                <SelectValue placeholder={
                                                                    isLoadingAssets ? "Loading assets..." :
                                                                    !selectedConnectionId ? "Connect first" :
                                                                    filteredAssets.length === 0 ? "No assets found" :
                                                                    "Select asset"
                                                                } />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {filteredAssets?.map((a: any) => (
                                                                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                                                ))}
                                                                {filteredAssets.length === 0 && !isLoadingAssets && (
                                                                    <div className="p-4 text-center text-[10px] text-muted-foreground ">
                                                                        No {nodeType === 'sink' ? 'destination' : 'source'} assets found. 
                                                                        Go to Connections to discover and import them.
                                                                    </div>
                                                                )}
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
                                                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
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
                                                    <p className="text-[9px] text-muted-foreground ">Defines how data is committed to the target.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {opDef?.fields && (
                                        <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-primary/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sliders className="h-3 w-3 text-primary" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Operator Properties</span>
                                            </div>
                                            {opDef.fields.map(renderField)}
                                        </div>
                                    )}
                                </div>

                                <Separator className="opacity-50" />

                                {/* Reliability */}
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Orchestration & Reliability</Label>
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
                                                                                                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
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
                                                                                            <Input type="number" {...register('max_retries', { valueAsNumber: true })} readOnly={!isEditor} className="h-9 bg-background/50" />
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
                                                                                            <Input type="number" {...register('retry_delay_seconds', { valueAsNumber: true })} readOnly={!isEditor} className="h-9 bg-background/50" />
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="space-y-2">
                                                                                        <div className="flex items-center">
                                                                                            <Label className="text-[10px] font-bold">Execution TTL (sec)</Label>
                                                                                            <HelpIcon content="Maximum time this task is allowed to run before being killed." />
                                                                                        </div>
                                                                                        <Input type="number" {...register('timeout_seconds', { valueAsNumber: true })} readOnly={!isEditor} placeholder="3600" className="h-9 bg-background/50" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                            
                                                                            <Separator className="opacity-50" />
                                            
                                                                            {/* Secondary Info */}
                                                                            <div className="space-y-2">
                                                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Documentation</Label>
                                                                                <Textarea
                                                                                    {...register('description')}
                                                                                    placeholder="Optional node description or notes..."
                                                                                    readOnly={!isEditor}
                                                                                    className="min-h-20 rounded-lg bg-background/50 border-border/40 focus:ring-primary/20 text-xs resize-none"
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
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expert Configuration</Label>
                                        <Badge variant="outline" className="text-[9px] font-mono">JSON</Badge>
                                    </div>
                                    <Textarea
                                        {...register('config', { required: true })}
                                        className="font-mono text-[11px] min-h-112.5 bg-[#0a0a0a]/80 text-emerald-500 border-white/5 rounded-xl p-4 resize-none leading-relaxed shadow-2xl"
                                        spellCheck={false}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="diff" className="m-0 space-y-6 focus-visible:outline-none">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest",
                                            (node.data as any).diffStatus === 'added' ? "bg-emerald-500/20 text-emerald-500" :
                                                (node.data as any).diffStatus === 'removed' ? "bg-destructive/20 text-destructive" :
                                                    "bg-amber-500/20 text-amber-500"
                                        )}>
                                            {String((node.data as any).diffStatus || '')}
                                        </Badge>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Change Analysis</span>
                                    </div>

                                    {(node.data as any).diffInfo?.changes?.name && (
                                        <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Identity Changed</Label>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-destructive line-through decoration-destructive/50">{(node.data as any).diffInfo.changes.name.from}</span>
                                                <ArrowRight size={12} className="text-muted-foreground" />
                                                <span className="text-emerald-500 font-bold">{(node.data as any).diffInfo.changes.name.to}</span>
                                            </div>
                                        </div>
                                    )}

                                    {(node.data as any).diffInfo?.changes?.config && (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Configuration Delta</Label>
                                            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 overflow-hidden">
                                                <pre className="text-[10px] font-mono leading-relaxed text-muted-foreground overflow-x-auto">
                                                    {JSON.stringify((node.data as any).diffInfo.changes.config, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {(node.data as any).diffStatus === 'added' && (
                                        <div className="p-8 text-center border-2 border-dashed border-emerald-500/20 rounded-2xl bg-emerald-500/5">
                                            <Plus size={24} className="text-emerald-500/40 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-emerald-500/80">New Operator Added</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">This node was not present in the base version.</p>
                                        </div>
                                    )}

                                    {(node.data as any).diffStatus === 'removed' && (
                                        <div className="p-8 text-center border-2 border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
                                            <Trash2 size={24} className="text-destructive/40 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-destructive/80">Operator Decommissioned</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">This node was removed in the target version.</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>

                                        {/* Footer */}
                                        <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center gap-3 backdrop-blur-md">
                                            {isEditor && (
                                                <Button type="submit" className="flex-1 rounded-xl h-10 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                                    <Save size={14} className="mr-2" /> Save Config
                                                </Button>
                                            )}
                                            
                                            {isEditor && (
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
                                            )}
                    
                                            {isAdmin && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 size={18} />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-3xl border-border/40 backdrop-blur-2xl bg-background/95 shadow-2xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-xl font-bold uppercase tracking-tighter">De-provision Node?</AlertDialogTitle>
                                                            <AlertDialogDescription className="font-medium text-sm">This will permanently remove the operator and all its logical connections.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="gap-2 mt-6">
                                                            <AlertDialogCancel className="rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest border-border/40">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => { onDelete(node.id); onClose(); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest">Delete Operator</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>                </form>
            </Tabs>
        </div>
    );
};