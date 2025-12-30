/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConnection, updateConnection, type ConnectionCreate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Use primitive Label for robustness
import {
    ShieldCheck, Lock, RefreshCw, CheckCircle2, Server, ArrowLeft, Search, 
    LayoutGrid, List as ListIcon
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
    DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { CONNECTOR_META, CONNECTOR_CONFIG_SCHEMAS, SafeIcon } from '@/lib/connector-definitions';

// --- Zod Schema ---
const connectionSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    connector_type: z.string().min(1, "Connection type is required"),
    description: z.string().optional(),
    config: z.record(z.string(), z.any()),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

interface CreateConnectionDialogProps {
    initialData?: any;
    onClose: () => void;
}

export const CreateConnectionDialog: React.FC<CreateConnectionDialogProps> = ({ initialData, onClose }) => {
    const isEditMode = !!initialData;
    const [step, setStep] = useState<'select' | 'configure'>('select');
    const [selectedType, setSelectedType] = useState<string | null>(initialData?.connector_type || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const queryClient = useQueryClient();

    const categories = ['All', 'Database', 'Warehouse', 'File', 'API', 'Generic'];

    const filteredConnectors = Object.entries(CONNECTOR_META).filter(([_, meta]) => {
        const matchesSearch = meta.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             meta.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || meta.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        if (initialData?.connector_type) {
            setSelectedType(initialData.connector_type);
            setStep('configure');
        }
    }, [initialData]);

    const form = useForm<ConnectionFormValues>({
        resolver: zodResolver(connectionSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            connector_type: initialData?.connector_type || '',
            config: initialData?.config || {}
        }
    });

    const configValues = form.watch('config') || {};

    const mutation = useMutation({
        mutationFn: (data: ConnectionFormValues) => {
            if (isEditMode && initialData?.id) {
                return updateConnection(initialData.id, data);
            }
            return createConnection(data as ConnectionCreate);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success(`Connection ${isEditMode ? 'Updated' : 'Created'}`, {
                description: `Successfully ${isEditMode ? 'updated' : 'configured'} "${form.getValues('name')}".`
            });
            onClose();
        },
        onError: (err: any) => {
            toast.error(`Configuration Failed`, {
                description: err.response?.data?.detail?.message || `There was an error ${isEditMode ? 'updating' : 'creating'} the connection. Please check your settings.`
            });
        }
    });

    const handleSelect = (type: string) => {
        setSelectedType(type);
        form.setValue('connector_type', type);
        setStep('configure');
    };

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || '',
                description: initialData.description || '',
                connector_type: initialData.connector_type || '',
                config: initialData.config || {}
            });
            setSelectedType(initialData.connector_type);
            setStep('configure');
        } else {
            form.reset({
                name: '',
                description: '',
                connector_type: '',
                config: {}
            });
            setSelectedType(null);
            setStep('select');
        }
    }, [initialData, form]);

    // --- STEP 1: Selection View ---
    if (step === 'select' && !isEditMode) {
        return (
            <div className="flex flex-col h-full bg-background">
                <header className="px-8 py-5 border-b border-border/40 shrink-0 bg-muted/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none select-none">
                        <Server className="h-20 w-20 rotate-12" />
                    </div>
                    
                    <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <DialogTitle className="text-xl font-bold tracking-tight">Select a Connector</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground leading-relaxed">
                                Choose from 30+ native protocols to begin data integration.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="relative z-30 flex flex-col lg:flex-row items-center gap-4 mt-5">
                        <div className="relative flex-1 w-full group">
                            <Search className="z-20 absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Search connectors..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-9 rounded-lg bg-background border-border/60 focus:ring-primary/20 transition-all shadow-xs text-xs"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <nav className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/40 overflow-x-auto no-scrollbar relative z-40">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActiveCategory(cat);
                                        }}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer relative z-50",
                                            activeCategory === cat 
                                                ? "bg-primary text-primary-foreground shadow-sm" 
                                                : "text-muted-foreground hover:bg-background hover:text-foreground"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </nav>

                            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/40 shrink-0 relative z-40">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-1 rounded-md transition-all cursor-pointer relative z-50",
                                        viewMode === 'grid' ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-1 rounded-md transition-all cursor-pointer relative z-50",
                                        viewMode === 'list' ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <ListIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {filteredConnectors.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {filteredConnectors.map(([key, meta]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleSelect(key)}
                                        className={cn(
                                            "group relative flex flex-col items-start gap-5 p-6 rounded-[2rem] text-left transition-all duration-500",
                                            "border border-border/40 bg-card/50 hover:bg-muted/30 hover:border-primary/40 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 backdrop-blur-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:shadow-md bg-background",
                                            meta.color.replace('text-', 'text-opacity-90 text-'),
                                            "border-border/40"
                                        )}>
                                            <SafeIcon icon={meta.icon} className="h-7 w-7" />
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">{meta.name}</h4>
                                                {meta.popular && (
                                                    <div className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-tighter">
                                                        Popular
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-medium opacity-80">
                                                {meta.description}
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-2 flex items-center justify-between w-full">
                                            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-black">{meta.category}</span>
                                            <div className="h-6 w-6 rounded-full bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                                                <ArrowLeft className="h-3 w-3 text-primary rotate-180 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {filteredConnectors.map(([key, meta]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleSelect(key)}
                                        className={cn(
                                            "group flex items-center gap-6 p-4 rounded-2xl text-left transition-all duration-300",
                                            "border border-border/40 bg-card/50 hover:bg-muted/30 hover:border-primary/40 hover:shadow-sm backdrop-blur-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center border shadow-xs transition-all duration-300 group-hover:scale-105 bg-background",
                                            meta.color.replace('text-', 'text-opacity-90 text-'),
                                            "border-border/40"
                                        )}>
                                            <SafeIcon icon={meta.icon} className="h-6 w-6" />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">{meta.name}</h4>
                                                {meta.popular && (
                                                    <div className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-tighter">
                                                        Popular
                                                    </div>
                                                )}
                                                <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-black ml-auto">{meta.category}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate leading-relaxed font-medium opacity-80 mt-0.5">
                                                {meta.description}
                                            </p>
                                        </div>

                                        <div className="h-8 w-8 rounded-xl bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                                            <ArrowLeft className="h-4 w-4 text-primary rotate-180 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in duration-500">
                            <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                                <Search className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">No connectors found</h3>
                            <p className="text-muted-foreground mt-2 max-w-xs font-medium">
                                We couldn't find any connectors matching "{searchQuery}". Try a different search term or category.
                            </p>
                            <Button 
                                variant="outline" 
                                className="mt-8 rounded-xl px-6"
                                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                            >
                                Clear filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- STEP 2: Configuration View ---
    const meta = (selectedType && CONNECTOR_META[selectedType])
        ? CONNECTOR_META[selectedType]
        : { name: selectedType || 'Unknown', icon: <Server />, description: 'Custom or deprecated connector type.', color: 'bg-muted text-muted-foreground' };

    const schema = selectedType ? CONNECTOR_CONFIG_SCHEMAS[selectedType] : null;

    return (
        <div className="flex h-full bg-background">

            {/* Sidebar (Info Panel) */}
            <div className="w-[280px] bg-muted/20 border-r border-border/50 p-6 hidden md:flex flex-col gap-8 shrink-0 relative overflow-hidden">
                <div className="z-10">
                    {!isEditMode && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 mb-6 text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => setStep('select')}
                        >
                            <ArrowLeft className="h-4 w-4" /> Change Connector
                        </Button>
                    )}
                    <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center mb-6 border shadow-lg bg-background",
                        meta?.color.replace('text-', 'text-opacity-90 text-')
                    )}>
                        <SafeIcon icon={meta.icon} className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                        {isEditMode ? 'Edit' : 'Configure'} <br />
                        <span className="text-primary">{meta?.name}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-medium">
                        {meta?.description}
                    </p>
                </div>

                <div className="mt-auto space-y-4 z-10">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                        <div className="flex items-center gap-2 font-bold mb-1.5 uppercase tracking-wide opacity-90">
                            <ShieldCheck className="h-3.5 w-3.5" /> Secure Storage
                        </div>
                        Credentials are encrypted at rest using AES-256 GCM.
                    </div>
                </div>
            </div>

            {/* Form Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-background/50 backdrop-blur-sm">
                <DialogHeader className="px-8 py-6 border-b border-border/40 shrink-0">
                    <DialogTitle className="text-lg font-bold">Connection Details</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Form Provider wraps everything */}
                    <Form {...form}>
                        <form id="conn-form" onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-8 max-w-2xl mx-auto py-2">

                            {/* General Section */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-3 opacity-80">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20">1</span>
                                    General Information
                                </h4>
                                <div className="grid gap-5 pl-9">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-sm font-semibold mb-2 block">Connection Name</Label>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. Production DB" className="h-10 rounded-lg bg-background" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-sm font-semibold mb-2 block">Description</Label>
                                            <FormControl>
                                                <Input {...field} placeholder="Optional context" className="h-10 rounded-lg bg-background" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            <div className="h-px w-full bg-border/50" />

                            {/* Config Section */}
                            <div className="space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-3 opacity-80">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20">2</span>
                                    Credentials & Config
                                </h4>
                                <div className="grid gap-5 pl-9">
                                    {schema?.fields?.map((field: any) => {
                                        // Dependency Check
                                        if (field.dependency) {
                                            const depVal = configValues[field.dependency.field];
                                            const requiredVal = field.dependency.value;
                                            
                                            const isMatch = Array.isArray(requiredVal) 
                                                ? requiredVal.includes(depVal)
                                                : depVal === requiredVal;

                                            if (!isMatch) return null;
                                        }
                                        return (
                                            <FormField key={field.name} control={form.control} name={`config.${field.name}`} render={({ field: f }) => (
                                                <FormItem>
                                                    <Label className="text-sm font-semibold mb-2 block">{field.label}</Label>
                                                    <FormControl>
                                                        {field.type === 'select' ? (
                                                            <Select 
                                                                onValueChange={(val) => {
                                                                    // Convert string back to boolean/number if necessary
                                                                    if (val === 'true') f.onChange(true);
                                                                    else if (val === 'false') f.onChange(false);
                                                                    else f.onChange(val);
                                                                }} 
                                                                value={String(f.value ?? '')}
                                                            >
                                                                <SelectTrigger className="h-10 rounded-lg bg-background">
                                                                    <SelectValue placeholder="Select an option" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {field.options?.map((o: any) => (
                                                                        <SelectItem key={String(o.value)} value={String(o.value)}>
                                                                            {o.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : field.type === 'textarea' ? (
                                                            <Textarea
                                                                {...f}
                                                                placeholder={field.placeholder}
                                                                className="min-h-[120px] rounded-lg bg-background font-mono text-xs"
                                                            />
                                                        ) : (
                                                            <div className="relative">
                                                                <Input
                                                                    {...f}
                                                                    type={field.type}
                                                                    min={field.min}
                                                                    placeholder={field.placeholder}
                                                                    className={cn("h-10 rounded-lg bg-background", field.type === 'password' && 'pl-10')}
                                                                />
                                                                {field.type === 'password' && (
                                                                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground opacity-70" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        );
                                    })}
                                    {(!schema?.fields || schema.fields.length === 0) && (
                                        <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-xl border border-border/50 text-center">
                                            No additional configuration required for this connector type.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="p-6 border-t border-border/40 bg-muted/10 shrink-0 flex items-center justify-between z-20">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Cancel</Button>
                    <Button form="conn-form" type="submit" disabled={mutation.isPending} className="px-6 rounded-full shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all">
                        {mutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        {isEditMode ? 'Update Connection' : 'Save Connection'}
                    </Button>
                </DialogFooter>
            </div>
        </div>
    );
};