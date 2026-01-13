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
    Share2,
    GitCompare,
    ArrowRight,
    Loader2,
    Sparkles,
    Shield,
    FileCode,
    Zap
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
import { getConnections, getConnectionAssets, getColumnLineage } from '@/lib/api';
import { getNodeIcon, getOperatorDefinition, type OperatorField } from '@/lib/pipeline-definitions';
import { useWorkspace } from '@/hooks/useWorkspace';

interface NodePropertiesProps {
    node: Node | null;
    onClose: () => void;
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onDuplicate: (node: Node) => void;
}

// --- Automated Lineage Component ---
const AutomatedLineageView = ({ assetId }: { assetId: number }) => {
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [lineageData, setLineageData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const { data: assets } = useQuery({
        queryKey: ['asset-detail', assetId],
        queryFn: () => getConnectionAssets(assetId), // This should ideally be getAsset but let's assume assets is available
        enabled: !!assetId
    });

    const columns = useMemo(() => {
        // Find the specific asset from the list
        const asset = assets?.find((a: any) => a.id === assetId);
        return asset?.schema_metadata?.columns?.map((c: any) => c.name) || [];
    }, [assets, assetId]);

    const fetchLineage = async (col: string) => {
        setSelectedColumn(col);
        setLoading(true);
        try {
            const data = await getColumnLineage(assetId, col);
            setLineageData(data);
        } catch (err) {
            toast.error("Lineage Trace Failed", { description: "Could not retrieve automated lineage for this column." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trace Output Column</Label>
                <Select onValueChange={fetchLineage}>
                    <SelectTrigger className="h-9 rounded-lg bg-muted/20 border-border/40">
                        <SelectValue placeholder="Select column to trace ancestry..." />
                    </SelectTrigger>
                    <SelectContent>
                        {columns.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin opacity-40" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Analyzing Ancestry...</p>
                </div>
            ) : lineageData ? (
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Share2 size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Origin Point</p>
                                <p className="text-xs font-mono font-bold text-foreground truncate max-w-[200px]">Asset #{lineageData.origin_asset_id} • {lineageData.origin_column_name}</p>
                            </div>
                        </div>

                        <div className="space-y-3 relative">
                            {/* Vertical Path Line */}
                            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-linear-to-b from-primary/40 to-transparent" />
                            
                            {lineageData.path.map((step: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-4 relative pl-8">
                                    <div className="absolute left-[11px] top-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background ring-4 ring-primary/10 shadow-sm" />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[8px] h-4 uppercase tracking-tighter bg-background/50 border-primary/20 text-primary/80">
                                                {step.transformation_type}
                                            </Badge>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Node {step.node_id}</span>
                                        </div>
                                        <p className="text-[11px] font-medium text-foreground">
                                            <span className="text-muted-foreground/60">{step.source_column}</span>
                                            <ArrowRight size={10} className="inline mx-1.5 text-muted-foreground/40" />
                                            <span className="text-primary/90">{step.target_column}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Automated Insights</p>
                    <p className="text-[9px] text-muted-foreground mt-2 max-w-[200px] mx-auto leading-relaxed">Select an output column above to visually trace its journey through the entire workspace.</p>
                </div>
            )}
        </div>
    );
};

// --- Lineage Mapper Component ---
const LineageMapper = ({ watch, setValue }: any) => {
    const mapping = watch('column_mapping_obj') || [];

    const addMapping = () => {
        setValue('column_mapping_obj', [...mapping, { source: '', target: '' }]);
    };

    const removeMapping = (index: number) => {
        const newMapping = [...mapping];
        newMapping.splice(index, 1);
        setValue('column_mapping_obj', newMapping);
    };

    const updateMapping = (index: number, field: 'source' | 'target', value: string) => {
        const newMapping = [...mapping];
        newMapping[index] = { ...newMapping[index], [field]: value };
        setValue('column_mapping_obj', newMapping);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Column Mappings</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMapping} className="h-7 text-[9px] font-bold uppercase tracking-wider rounded-lg border-primary/20 hover:bg-primary/5">
                    <Plus className="h-3 w-3 mr-1" /> Add Mapping
                </Button>
            </div>

            <div className="space-y-3">
                {mapping.map((m: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 group/map">
                        <Input 
                            placeholder="Source Column" 
                            value={m.source} 
                            onChange={(e) => updateMapping(index, 'source', e.target.value)}
                            className="h-8 text-[10px] font-mono bg-muted/20"
                        />
                        <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                        <Input 
                            placeholder="Target Column" 
                            value={m.target} 
                            onChange={(e) => updateMapping(index, 'target', e.target.value)}
                            className="h-8 text-[10px] font-mono bg-muted/20"
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeMapping(index)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/map:opacity-100 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </Button>
                    </div>
                ))}

                {mapping.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-border/40 rounded-xl bg-muted/5">
                        <Share2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No manual lineage mapping</p>
                        <p className="text-[9px] text-muted-foreground mt-1 max-w-[200px] mx-auto">SynqX will attempt to trace lineage automatically based on operator logic.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const VALIDATION_CHECKS = [
    { label: 'Not Null', value: 'not_null' },
    { label: 'Unique', value: 'unique' },
    { label: 'Regex Match', value: 'regex' },
    { label: 'Min Value', value: 'min_value' },
    { label: 'Max Value', value: 'max_value' },
    { label: 'In List', value: 'in_list' },
    { label: 'Data Type', value: 'data_type' },
];

const GUARDRAIL_METRICS = [
    { label: 'Null Percentage', value: 'null_percentage' },
    { label: 'Minimum Value', value: 'min' },
    { label: 'Maximum Value', value: 'max' },
    { label: 'Mean Average', value: 'mean' },
];

const GUARDRAIL_OPERATORS = [
    { label: 'Greater Than', value: 'greater_than' },
    { label: 'Less Than', value: 'less_than' },
    { label: 'Equal To', value: 'equal' },
];

const DATA_TYPES = [
    { label: 'String', value: 'string' },
    { label: 'Integer', value: 'int' },
    { label: 'Float', value: 'float' },
    { label: 'Boolean', value: 'bool' },
    { label: 'Date/Time', value: 'date' },
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

const RuleBuilder = ({ watch, setValue, rulesKey = 'schema_rules' }: any) => {
    const rules = watch(rulesKey) || [];

    const addRule = () => {
        setValue(rulesKey, [...rules, { column: '', check: 'not_null' }]);
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        setValue(rulesKey, newRules);
    };

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setValue(rulesKey, newRules);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">Governance Rules</Label>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Logic validation sequence</span>
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addRule} 
                    className="h-8 text-[9px] font-bold uppercase tracking-widest rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all gap-2"
                >
                    <Plus className="h-3.5 w-3.5" /> New Clause
                </Button>
            </div>

            <div className="space-y-4">
                {rules.map((rule: any, index: number) => (
                    <div key={index} className="group p-5 rounded-3xl border border-border/40 bg-muted/5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300 relative">
                        <div className="absolute -left-1.5 top-6 bottom-6 w-1 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                        
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeRule(index)}
                            className="absolute top-4 right-4 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 size={14} />
                        </Button>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Field Identifier</Label>
                                <Input 
                                    placeholder="e.g. email_address" 
                                    value={rule.column} 
                                    onChange={(e) => updateRule(index, 'column', e.target.value)}
                                    className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40 focus:ring-primary/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Constraint Type</Label>
                                <Select value={rule.check} onValueChange={(val) => updateRule(index, 'check', val)}>
                                    <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl border-border/40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/40">
                                        {VALIDATION_CHECKS.map(c => (
                                            <SelectItem key={c.value} value={c.value} className="text-xs font-medium">{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            {rule.check === 'regex' && (
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Pattern Match (Regex)</Label>
                                    <Input 
                                        placeholder="^[a-z]+$" 
                                        value={rule.pattern || ''} 
                                        onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                                        className="h-9 text-xs font-mono bg-black/20 text-primary border-white/5 rounded-xl"
                                    />
                                </div>
                            )}
                            {(rule.check === 'min_value' || rule.check === 'max_value') && (
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Threshold Bound</Label>
                                    <Input 
                                        type="number"
                                        value={rule.value || 0} 
                                        onChange={(e) => updateRule(index, 'value', Number(e.target.value))}
                                        className="h-9 text-xs font-mono bg-background/50 rounded-xl"
                                    />
                                </div>
                            )}
                            {rule.check === 'data_type' && (
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Enforced Primitive</Label>
                                    <Select value={rule.type || 'string'} onValueChange={(val) => updateRule(index, 'type', val)}>
                                        <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/40">
                                            {DATA_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value} className="text-xs font-medium">{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {rule.check === 'in_list' && (
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Allowed Values</Label>
                                    <Input 
                                        placeholder="e.g. active, pending, deleted" 
                                        value={rule.values ? (Array.isArray(rule.values) ? rule.values.join(', ') : rule.values) : ''} 
                                        onChange={(e) => updateRule(index, 'values', e.target.value.split(',').map(s => s.trim()))}
                                        className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {rules.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5 group hover:bg-muted/10 transition-colors duration-500">
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full group-hover:bg-primary/20 transition-all" />
                            <div className="relative h-16 w-16 rounded-3xl glass-card flex items-center justify-center border-0 shadow-xl mx-auto">
                                <Shield className="h-8 w-8 text-primary/40 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">No Active Contract Clauses</p>
                        <p className="text-[9px] text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">Secure your data stream by adding validation rules. Violations will be diverted to quarantine automatically.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const GuardrailBuilder = ({ watch, setValue }: any) => {
    const guardrails = watch('guardrails_list') || [];

    const addGuardrail = () => {
        setValue('guardrails_list', [...guardrails, { column: '', metric: 'null_percentage', operator: 'greater_than', threshold: 0 }]);
    };

    const removeGuardrail = (index: number) => {
        const newGuardrails = [...guardrails];
        newGuardrails.splice(index, 1);
        setValue('guardrails_list', newGuardrails);
    };

    const updateGuardrail = (index: number, field: string, value: any) => {
        const newGuardrails = [...guardrails];
        newGuardrails[index] = { ...newGuardrails[index], [field]: value };
        setValue('guardrails_list', newGuardrails);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">Circuit Rules</Label>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Statistical enforcement thresholds</span>
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addGuardrail} 
                    className="h-8 text-[9px] font-bold uppercase tracking-widest rounded-xl border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 transition-all gap-2"
                >
                    <Plus className="h-3.5 w-3.5" /> Arm Breaker
                </Button>
            </div>

            <div className="space-y-4">
                {guardrails.map((gr: any, index: number) => (
                    <div key={index} className="group p-5 rounded-3xl border border-border/40 bg-muted/5 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all duration-300 relative">
                        <div className="absolute -left-1.5 top-6 bottom-6 w-1 rounded-full bg-amber-500/20 group-hover:bg-amber-500/40 transition-colors" />
                        
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeGuardrail(index)}
                            className="absolute top-4 right-4 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 size={14} />
                        </Button>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Monitored Column</Label>
                                <Input 
                                    placeholder="e.g. order_id" 
                                    value={gr.column} 
                                    onChange={(e) => updateGuardrail(index, 'column', e.target.value)}
                                    className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Telemetry Metric</Label>
                                    <Select value={gr.metric} onValueChange={(val) => updateGuardrail(index, 'metric', val)}>
                                        <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl border-border/40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/40">
                                            {GUARDRAIL_METRICS.map(m => (
                                                <SelectItem key={m.value} value={m.value} className="text-xs font-medium">{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Condition</Label>
                                    <Select value={gr.operator} onValueChange={(val) => updateGuardrail(index, 'operator', val)}>
                                        <SelectTrigger className="h-9 text-xs bg-background/50 rounded-xl border-border/40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/40">
                                            {GUARDRAIL_OPERATORS.map(o => (
                                                <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Termination Threshold</Label>
                                <div className="relative">
                                    <Input 
                                        type="number"
                                        value={gr.threshold} 
                                        onChange={(e) => updateGuardrail(index, 'threshold', Number(e.target.value))}
                                        className="h-9 text-xs font-mono bg-background/50 rounded-xl border-border/40 pr-12"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/40 uppercase">
                                        {gr.metric === 'null_percentage' ? '%' : 'Val'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {guardrails.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5 group hover:bg-muted/10 transition-colors duration-500">
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full group-hover:bg-amber-500/20 transition-all" />
                            <div className="relative h-16 w-16 rounded-3xl glass-card flex items-center justify-center border-0 shadow-xl mx-auto">
                                <Zap className="h-8 w-8 text-amber-500/40 group-hover:text-amber-500 transition-colors" />
                            </div>
                        </div>
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">No Active Circuit Breakers</p>
                        <p className="text-[9px] text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">Establish threshold rules that will automatically terminate execution if data quality deviates from standards.</p>
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
            if (nodeType === 'source') return a.is_source !== false;
            if (nodeType === 'sink') return a.is_destination !== false;
            return true;
        });
    }, [assets, nodeType]);

    useEffect(() => {
        if (node) {
            const config = node.data.config as any || {};
            const currentType = ((node.data.type as string) || (node.data.operator_type as string) || 'transform').toLowerCase();
            const currentOpClass = (node.data.operator_class as string) || (currentType === 'source' ? 'extractor' : currentType === 'sink' ? 'loader' : 'pandas_transform');

            const mapping = node.data.column_mapping || {};
            const mappingArray = Object.entries(mapping).map(([target, source]) => ({ 
                source: String(source), 
                target: String(target) 
            }));

            const formValues: any = {
                label: (node.data.label as string) || '',
                description: (node.data.description as string) || '',
                operator_type: currentType,
                operator_class: currentOpClass,
                config: JSON.stringify(config, null, 2),
                column_mapping_obj: mappingArray,
                connection_id: node.data.connection_id ? String(node.data.connection_id) : '',
                asset_id: (node.data.asset_id || node.data.source_asset_id || node.data.destination_asset_id) ? 
                    String(node.data.asset_id || node.data.source_asset_id || node.data.destination_asset_id) : '',
                write_strategy: (node.data as any).write_strategy || config.write_mode || 'append',
                schema_evolution_policy: (node.data as any).schema_evolution_policy || 'strict',
                incremental: config.incremental === true,
                watermark_column: config.watermark_column || '',
                max_retries: node.data.max_retries ?? 3,
                retry_strategy: (node.data as any).retry_strategy || 'fixed',
                retry_delay_seconds: node.data.retry_delay_seconds ?? 60,
                timeout_seconds: node.data.timeout_seconds ?? 3600,
                data_contract_json: (node.data as any).data_contract ? 
                    (typeof (node.data as any).data_contract === 'string' ? (node.data as any).data_contract : JSON.stringify((node.data as any).data_contract, null, 2)) : '',
                contract_rules: (node.data as any).data_contract?.columns || [],
                quarantine_asset_id: (node.data as any).quarantine_asset_id ? String((node.data as any).quarantine_asset_id) : '',
                schema_rules: currentOpClass === 'validate' ? (config.schema || []) : [],
                schema_json_manual: currentOpClass === 'validate' ? JSON.stringify(config.schema || [], null, 2) : '',
                guardrails_list: (node.data as any).guardrails || []
            };

            const def = getOperatorDefinition(currentOpClass);
            if (def?.fields) {
                def.fields.forEach(field => {
                    const val = config[field.configKey];
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

            if (opDef?.fields) {
                opDef.fields.forEach(field => {
                    let val = data[field.name];
                    if (field.name === 'schema' && data.operator_class === 'validate') {
                        val = schemaMode === 'visual' ? data.schema_rules : data.schema_json_manual;
                    }

                    if (field.type === 'json') {
                        try {
                            if (typeof val === 'string' && val.trim()) dynamicConfig[field.configKey] = JSON.parse(val);
                            else if (typeof val === 'object') dynamicConfig[field.configKey] = val;
                        } catch (e) { console.error(e); }
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

            const colMapping: any = {};
            if (data.column_mapping_obj) {
                data.column_mapping_obj.forEach((m: any) => {
                    if (m.source && m.target) colMapping[m.target] = m.source;
                });
            }

            // Resolve Data Contract (JSON)
            let finalContract: any = {};
            try {
                if (activeTab === 'contract') {
                    // If we are on the contract tab, prefer the visual rules if in visual mode
                    if (schemaMode === 'visual') {
                        finalContract = { columns: data.contract_rules, strict: false };
                    } else {
                        finalContract = data.data_contract_json ? JSON.parse(data.data_contract_json) : {};
                    }
                } else {
                    // Use existing logic
                    finalContract = data.data_contract_json ? JSON.parse(data.data_contract_json) : {};
                }
            } catch (e) {
                console.error("Failed to parse contract JSON", e);
            }

            const payload: any = {
                label: data.label,
                description: data.description,
                type: data.operator_type,
                operator_class: data.operator_class,
                config: {
                    ...baseConfig,
                    ...dynamicConfig,
                    incremental: data.operator_type === 'source' ? data.incremental : undefined,
                    watermark_column: data.operator_type === 'source' ? data.watermark_column : undefined
                },
                column_mapping: colMapping,
                write_strategy: data.operator_type === 'sink' ? data.write_strategy : undefined,
                schema_evolution_policy: data.operator_type === 'sink' ? data.schema_evolution_policy : undefined,
                data_contract: finalContract,
                guardrails: data.guardrails_list,
                quarantine_asset_id: data.quarantine_asset_id ? parseInt(data.quarantine_asset_id) : undefined,
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
                            <Button type="button" variant={schemaMode === 'visual' ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-[9px] font-bold rounded-md" onClick={() => setSchemaMode('visual')}>Visual</Button>
                            <Button type="button" variant={schemaMode === 'manual' ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-[9px] font-bold rounded-md" onClick={() => setSchemaMode('manual')}>JSON</Button>
                        </div>
                    </div>
                    {schemaMode === 'visual' ? <RuleBuilder watch={watch} setValue={setValue} /> : (
                        <div className="space-y-2">
                            <Textarea {...register('schema_json_manual')} placeholder={field.placeholder} readOnly={!isEditor} className="font-mono text-[10px] min-h-40 bg-[#0a0a0a]/80 text-emerald-500 border-white/5 rounded-lg p-3" />
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
                                        {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
                        <Textarea {...register(field.name)} placeholder={field.placeholder} readOnly={!isEditor} className="font-mono text-[10px] min-h-25 bg-background/50 rounded-lg" />
                        {field.description && <p className="text-[9px] text-muted-foreground">{field.description}</p>}
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
                                <Checkbox id={field.name} checked={checkboxField.value} onCheckedChange={checkboxField.onChange} disabled={!isEditor} />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor={field.name} className="text-[10px] font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">{field.label}<HelpIcon content={field.tooltip} /></label>
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
                        <Input {...register(field.name)} type={field.type} placeholder={field.placeholder} readOnly={!isEditor} className="h-9 bg-background/50 rounded-lg" />
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
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8"><X size={16} /></Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pt-4 shrink-0">
                    <TabsList className="w-full grid grid-cols-5 h-10 p-1 bg-muted/30 rounded-xl">
                        <TabsTrigger value="settings" className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0">
                            <Sliders size={11} /> Config
                        </TabsTrigger>
                        <TabsTrigger value="contract" className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0">
                            <Shield size={11} /> Contract
                        </TabsTrigger>
                        <TabsTrigger value="guardrails" className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0 data-[state=active]:text-amber-500">
                            <Zap size={11} /> Safety
                        </TabsTrigger>
                        <TabsTrigger value="lineage" className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0">
                            <Share2 size={11} /> Lineage
                        </TabsTrigger>
                        {node.data.diffStatus && node.data.diffStatus !== 'none' ? (
                            <TabsTrigger value="diff" className="gap-1.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-tighter transition-all px-0"><GitCompare size={11} /> Diff</TabsTrigger>
                        ) : <TabsTrigger value="advanced" className="gap-1.5 text-[9px] font-bold uppercase tracking-tighter transition-all px-0"><Code size={11} /> Expert</TabsTrigger>}
                    </TabsList>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            <TabsContent value="settings" className="m-0 space-y-6 focus-visible:outline-none">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Node Identity</Label>
                                    <Input {...register('label', { required: true })} placeholder="Descriptive name..." readOnly={!isEditor} className="h-10 rounded-lg bg-background/50 border-border/40 focus:ring-primary/20" />
                                </div>

                                <div className="space-y-4">
                                    {(nodeType === 'source' || nodeType === 'sink') && (
                                        <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-muted/10">
                                            <div className="flex items-center gap-2 mb-1"><Database className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">IO Mapping</span></div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold">Connection</Label>
                                                <Controller control={control} name="connection_id" render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                                                        <SelectTrigger className="h-9 rounded-lg bg-background/50"><SelectValue placeholder="Select connection" /></SelectTrigger>
                                                        <SelectContent>{connections?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold">Target Asset</Label>
                                                <Controller control={control} name="asset_id" render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedConnectionId || !isEditor || isLoadingAssets}>
                                                        <SelectTrigger className="h-9 rounded-lg bg-background/50"><SelectValue placeholder={isLoadingAssets ? "Loading assets..." : !selectedConnectionId ? "Connect first" : filteredAssets.length === 0 ? "No assets found" : "Select asset"} /></SelectTrigger>
                                                        <SelectContent>
                                                            {filteredAssets?.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                                            {filteredAssets.length === 0 && !isLoadingAssets && <div className="p-4 text-center text-[10px] text-muted-foreground ">No assets found.</div>}
                                                        </SelectContent>
                                                    </Select>
                                                )} />
                                            </div>
                                            {nodeType === 'source' && (
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id="incremental" 
                                                            checked={watch('incremental')} 
                                                            onCheckedChange={(val) => setValue('incremental', val)} 
                                                            disabled={!isEditor} 
                                                        />
                                                        <Label htmlFor="incremental" className="text-[10px] font-bold leading-none cursor-pointer">Incremental Sync</Label>
                                                    </div>
                                                    {watch('incremental') && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <Label className="text-[10px] font-bold">Watermark Column</Label>
                                                            <Input 
                                                                {...register('watermark_column')} 
                                                                placeholder="e.g. updated_at" 
                                                                readOnly={!isEditor} 
                                                                className="h-8 text-[10px] font-mono bg-background/50" 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {nodeType === 'sink' && (
                                                <div className="space-y-4 pt-2">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold flex items-center">Write Strategy <HelpIcon content="Determines how data is committed to the target asset." /></Label>
                                                        <Controller control={control} name="write_strategy" render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                                                                <SelectTrigger className="h-9 rounded-lg bg-background/50 border-primary/20"><SelectValue placeholder="Select strategy" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="append" className="text-xs font-bold">Append</SelectItem>
                                                                    <SelectItem value="overwrite" className="text-xs font-bold">Overwrite</SelectItem>
                                                                    <SelectItem value="upsert" className="text-xs font-bold">Upsert</SelectItem>
                                                                    <SelectItem value="scd2" className="text-xs font-bold">SCD Type 2</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )} />
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold flex items-center">Evolution Policy <HelpIcon content="Defines behavior when incoming data schema differs from target." /></Label>
                                                        <Controller control={control} name="schema_evolution_policy" render={({ field }) => (
                                                            <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                                                                <SelectTrigger className="h-9 rounded-lg bg-background/50 border-primary/20"><SelectValue placeholder="Select policy" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="strict" className="text-xs font-bold">Strict (Fail on mismatch)</SelectItem>
                                                                    <SelectItem value="evolve" className="text-xs font-bold">Evolve (Auto-Alter Table)</SelectItem>
                                                                    <SelectItem value="ignore" className="text-xs font-bold">Ignore (Drop new columns)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {opDef?.fields && <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-primary/5">{opDef.fields.map(renderField)}</div>}
                                </div>

                                <Separator className="opacity-50" />
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reliability</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold">Retry Logic</Label>
                                            <Controller control={control} name="retry_strategy" render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                                                    <SelectTrigger className="h-9 rounded-lg bg-background/50"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Disabled</SelectItem>
                                                        <SelectItem value="fixed">Fixed</SelectItem>
                                                        <SelectItem value="linear_backoff">Linear</SelectItem>
                                                        <SelectItem value="exponential_backoff">Exponential</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        {watch('retry_strategy') !== 'none' && <div className="space-y-2"><Label className="text-[10px] font-bold">Max Retries</Label><Input type="number" {...register('max_retries', { valueAsNumber: true })} readOnly={!isEditor} className="h-9 bg-background/50" /></div>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold">Retry Delay (s)</Label>
                                            <Input type="number" {...register('retry_delay_seconds', { valueAsNumber: true })} readOnly={!isEditor} className="h-9 bg-background/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold">Timeout (s)</Label>
                                            <Input type="number" {...register('timeout_seconds', { valueAsNumber: true })} placeholder="3600" readOnly={!isEditor} className="h-9 bg-background/50" />
                                        </div>
                                    </div>
                                </div>
                                <Separator className="opacity-50" />
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Documentation</Label>
                                    <Textarea {...register('description')} placeholder="Notes..." readOnly={!isEditor} className="min-h-20 rounded-lg bg-background/50 border-border/40 text-xs resize-none" />
                                </div>
                            </TabsContent>

                            <TabsContent value="contract" className="m-0 focus-visible:outline-none">
                                <div className="p-6 space-y-8 pb-32">
                                    <div className="space-y-6">
                                        <div className="relative group overflow-hidden p-6 rounded-[2rem] bg-primary/5 border border-primary/10 transition-all duration-500 hover:bg-primary/10">
                                            <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/10 blur-3xl rounded-full" />
                                            <div className="relative z-10 flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                                                    <Shield size={24} />
                                                </div>
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Trust Governance</h4>
                                                        <div className="flex items-center gap-1 bg-background/40 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-inner">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setSchemaMode('visual')}
                                                                className={cn(
                                                                    "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                                    schemaMode === 'visual' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                            >
                                                                Visual
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setSchemaMode('manual')}
                                                                className={cn(
                                                                    "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                                    schemaMode === 'manual' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                            >
                                                                JSON
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed font-medium">
                                                        Define the structural integrity of your data stream. Violations are automatically diverted to isolation while keeping the pipeline active.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {schemaMode === 'visual' ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <RuleBuilder watch={watch} setValue={setValue} rulesKey="contract_rules" />
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex items-center justify-between px-1">
                                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">Source Blueprint (JSON)</Label>
                                                    <Badge variant="outline" className="text-[8px] font-mono opacity-60 bg-background/50 border-0 h-5 px-2">STRICT_VALIDATION: OFF</Badge>
                                                </div>
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-primary/5 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                                    <Textarea 
                                                        {...register('data_contract_json')} 
                                                        placeholder='{ "columns": [{ "name": "id", "type": "int" }] }' 
                                                        className="font-mono text-[11px] min-h-87.5 bg-[#0a0a0a] text-primary/90 border-white/5 rounded-2xl p-6 shadow-2xl relative z-10 focus:ring-primary/20 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Separator className="opacity-50" />

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quarantine Buffer</span>
                                        </div>
                                        
                                        <div className="space-y-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold">Sink Connection</Label>
                                                <Controller control={control} name="quarantine_connection_id" render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditor}>
                                                        <SelectTrigger className="h-9 rounded-lg bg-background/50 border-destructive/10"><SelectValue placeholder="Select connection..." /></SelectTrigger>
                                                        <SelectContent>{connections?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold">Quarantine Asset</Label>
                                                <Controller control={control} name="quarantine_asset_id" render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={!watch('quarantine_connection_id') || !isEditor}>
                                                        <SelectTrigger className="h-9 rounded-lg bg-background/50 border-destructive/10"><SelectValue placeholder="Select asset..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {/* We'd need to fetch assets for this specific connection too, but for prototype let's reuse assets if same connection or assume user knows */}
                                                            {filteredAssets?.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )} />
                                            </div>
                                            <p className="text-[9px] text-muted-foreground">Invalid rows will be written to this asset with a <code>__synqx_quarantine_reason__</code> column.</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="guardrails" className="m-0 focus-visible:outline-none">
                                <div className="p-6 space-y-8 pb-32">
                                    <div className="space-y-6">
                                        <div className="relative group overflow-hidden p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 transition-all duration-500 hover:bg-amber-500/10">
                                            <div className="absolute -right-10 -top-10 h-32 w-32 bg-amber-500/10 blur-3xl rounded-full" />
                                            <div className="relative z-10 flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner border border-amber-500/20">
                                                    <Zap size={24} />
                                                </div>
                                                <div className="space-y-1.5 flex-1">
                                                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Fail-Safe Infrastructure</h4>
                                                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed font-medium">
                                                        Establish automated circuit breakers. These rules monitor statistical telemetry in real-time and will terminate the job instantly if reliability thresholds are breached.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <GuardrailBuilder watch={watch} setValue={setValue} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="lineage" className="m-0 focus-visible:outline-none">
                                <div className="p-6">
                                    {(nodeType === 'source' || nodeType === 'sink') && watch('asset_id') ? (
                                        <div className="space-y-8">
                                            <AutomatedLineageView assetId={parseInt(watch('asset_id'))} />
                                            <Separator className="opacity-50" />
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Sliders className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manual Override</span>
                                                </div>
                                                <LineageMapper watch={watch} setValue={setValue} />
                                            </div>
                                        </div>
                                    ) : (
                                        <LineageMapper watch={watch} setValue={setValue} />
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="advanced" className="m-0 h-full focus-visible:outline-none">
                                <div className="p-6 space-y-4 h-full">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expert Configuration</Label>
                                    <Textarea {...register('config', { required: true })} className="font-mono text-[11px] min-h-112.5 bg-[#0a0a0a]/80 text-emerald-500 border-white/5 rounded-xl p-4 resize-none shadow-2xl" spellCheck={false} />
                                </div>
                            </TabsContent>

                            <TabsContent value="diff" className="m-0 space-y-6 focus-visible:outline-none">
                                <div className="p-6 space-y-4">
                                    <Badge className={cn("text-[10px] font-bold uppercase tracking-widest", (node.data as any).diffStatus === 'added' ? "bg-emerald-500/20 text-emerald-500" : (node.data as any).diffStatus === 'removed' ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-500")}>{String((node.data as any).diffStatus || '')}</Badge>
                                    {(node.data as any).diffInfo?.changes?.config && (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Delta</Label>
                                            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 overflow-hidden"><pre className="text-[10px] font-mono text-muted-foreground">{JSON.stringify((node.data as any).diffInfo.changes.config, null, 2)}</pre></div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center gap-3 backdrop-blur-md">
                        {isEditor && <Button type="submit" className="flex-1 rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"><Save size={14} className="mr-2" /> Save Config</Button>}
                        {isEditor && <Button type="button" variant="secondary" size="icon" onClick={() => onDuplicate(node)} className="h-10 w-10 rounded-xl"><Copy size={16} /></Button>}
                        {isAdmin && <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground/40 hover:text-destructive"><Trash2 size={18} /></Button></AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-border/40 backdrop-blur-2xl bg-background/95 shadow-2xl">
                                <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold uppercase tracking-tighter">De-provision Node?</AlertDialogTitle><AlertDialogDescription className="font-medium text-sm">This will permanently remove the operator.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter className="gap-2 mt-6"><AlertDialogCancel className="rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest border-border/40">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { onDelete(node.id); onClose(); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest">Delete Operator</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent></AlertDialog>}
                    </div>
                </form>
            </Tabs>
        </div>
    );
};
