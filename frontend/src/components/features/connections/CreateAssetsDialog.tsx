/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { type AssetBulkCreate, bulkCreateAssets } from '@/lib/api';
import { AssetType, ConnectorType } from '@/lib/enums';
import { ASSET_META } from '@/lib/asset-definitions';
import { toast } from 'sonner';
import { Plus, X, Database, ArrowRightLeft, Sparkles, Loader2, Code, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateAssetsDialogProps {
    connectionId: number;
    connectorType: ConnectorType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type FormValues = {
    assets: {
        name: string;
        fully_qualified_name?: string;
        asset_type: string;
        usageType: 'source' | 'destination';
        query?: string;
        is_incremental_capable: boolean;
        watermark_column?: string;
        write_mode: 'append' | 'replace' | 'upsert';
    }[];
};

const CONNECTOR_ASSET_TYPES: Partial<Record<ConnectorType, AssetType[]>> = {
    [ConnectorType.POSTGRESQL]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.MYSQL]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.MARIADB]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.MSSQL]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.ORACLE]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.SQLITE]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.DUCKDB]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.SNOWFLAKE]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.BIGQUERY]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.REDSHIFT]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.DATABRICKS]: [AssetType.TABLE, AssetType.VIEW, AssetType.SQL_QUERY],
    [ConnectorType.MONGODB]: [AssetType.COLLECTION, AssetType.NOSQL_QUERY],
    [ConnectorType.REDIS]: [AssetType.KEY_PATTERN],
    [ConnectorType.ELASTICSEARCH]: [AssetType.COLLECTION, AssetType.NOSQL_QUERY],
    [ConnectorType.CASSANDRA]: [AssetType.TABLE, AssetType.NOSQL_QUERY],
    [ConnectorType.DYNAMODB]: [AssetType.TABLE, AssetType.NOSQL_QUERY],
    [ConnectorType.LOCAL_FILE]: [AssetType.FILE],
    [ConnectorType.S3]: [AssetType.FILE],
    [ConnectorType.GCS]: [AssetType.FILE],
    [ConnectorType.AZURE_BLOB]: [AssetType.FILE],
    [ConnectorType.FTP]: [AssetType.FILE],
    [ConnectorType.SFTP]: [AssetType.FILE],
    [ConnectorType.REST_API]: [AssetType.API_ENDPOINT],
    [ConnectorType.GRAPHQL]: [AssetType.API_ENDPOINT],
    [ConnectorType.GOOGLE_SHEETS]: [AssetType.TABLE],
    [ConnectorType.AIRTABLE]: [AssetType.TABLE],
    [ConnectorType.SALESFORCE]: [AssetType.TABLE],
    [ConnectorType.HUBSPOT]: [AssetType.TABLE],
    [ConnectorType.STRIPE]: [AssetType.TABLE],
    [ConnectorType.KAFKA]: [AssetType.STREAM],
    [ConnectorType.RABBITMQ]: [AssetType.STREAM],
    [ConnectorType.CUSTOM_SCRIPT]: [
        AssetType.PYTHON_SCRIPT,
        AssetType.SHELL_SCRIPT,
        AssetType.JAVASCRIPT_SCRIPT
    ],
    [ConnectorType.SINGER_TAP]: [AssetType.TABLE],
};

const DEFAULT_ASSET_TYPES = [AssetType.TABLE, AssetType.FILE];

const QUERY_SCRIPT_TYPES = [
    AssetType.SQL_QUERY, AssetType.NOSQL_QUERY,
    AssetType.PYTHON_SCRIPT, AssetType.SHELL_SCRIPT, AssetType.JAVASCRIPT_SCRIPT
];

export const CreateAssetsDialog: React.FC<CreateAssetsDialogProps> = ({ connectionId, connectorType, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const availableAssetTypes = CONNECTOR_ASSET_TYPES[connectorType] || DEFAULT_ASSET_TYPES;
    const defaultAssetType = availableAssetTypes[0];

    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            assets: [{
                name: '',
                asset_type: defaultAssetType,
                usageType: 'source',
                query: '',
                is_incremental_capable: false,
                watermark_column: 'timestamp',
                write_mode: 'append'
            }]
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "assets" });
    const watchedAssets = watch("assets");

    useEffect(() => {
        if (open) {
            reset({
                assets: [{
                    name: '',
                    asset_type: defaultAssetType,
                    usageType: 'source',
                    query: '',
                    is_incremental_capable: false,
                    watermark_column: 'timestamp',
                    write_mode: 'append'
                }]
            });
        }
    }, [open, reset, defaultAssetType]);

    const mutation = useMutation({
        mutationFn: (payload: AssetBulkCreate) => bulkCreateAssets(connectionId, payload),
        onSuccess: (data) => {
            if (data.successful_creates > 0) {
                toast.success("Assets Created", { description: `${data.successful_creates} assets successfully added.`, });
            }
            if (data.failed_creates > 0) {
                toast.warning("Partial Success", { description: `${data.failed_creates} assets failed.`, });
            }
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error("Operation Failed", { description: err.response?.data?.detail?.message || "Error during creation." });
        }
    });

    const onSubmit = (data: FormValues) => {
        const payload: AssetBulkCreate = {
            assets: data.assets.filter(a => a.name.trim() !== '').map(asset => {
                let config: Record<string, any> = {};
                
                // For REST APIs, we treat the name as an endpoint
                let finalName = asset.name.trim();
                if (connectorType === ConnectorType.REST_API && !finalName.startsWith('/')) {
                    finalName = '/' + finalName;
                }

                if (([AssetType.SQL_QUERY, AssetType.NOSQL_QUERY] as string[]).includes(asset.asset_type)) {
                    config.query = asset.query;
                } else if ((QUERY_SCRIPT_TYPES as string[]).includes(asset.asset_type)) {
                    config.code = asset.query;
                    config.language = asset.asset_type;
                }
                if (asset.is_incremental_capable && asset.watermark_column) {
                    config.watermark_column = asset.watermark_column;
                }
                if (asset.usageType === 'destination') {
                    config.write_mode = asset.write_mode;
                }
                return {
                    name: finalName,
                    fully_qualified_name: asset.fully_qualified_name?.trim() || finalName,
                    asset_type: asset.asset_type,
                    is_source: asset.usageType === 'source',
                    is_destination: asset.usageType === 'destination',
                    is_incremental_capable: asset.is_incremental_capable,
                    config: config
                };
            }),
        };
        if (payload.assets.length === 0) {
            toast.error("Validation Error", { description: "Please provide at least one asset." });
            return;
        }
        mutation.mutate(payload);
    };

    const getPlaceholder = (type: string) => {
        if (type === AssetType.SQL_QUERY) return "SELECT * FROM ...";
        if (type === AssetType.PYTHON_SCRIPT) return "def extract():\n    return [{'id': 1}]";
        if (type === AssetType.JAVASCRIPT_SCRIPT) return "console.log(JSON.stringify([{'id': 1}]))";
        if (type === AssetType.SHELL_SCRIPT) return "curl https://api.example.com/data";
        return '{ "collection": "users", ... }';
    };

    const getQueryHelp = (type: string) => {
        if (type === AssetType.SQL_QUERY) return "Enter a valid SQL query.";
        if (([AssetType.PYTHON_SCRIPT, AssetType.JAVASCRIPT_SCRIPT, AssetType.SHELL_SCRIPT] as string[]).includes(type))
            return "Enter script code. Standard output must be valid JSON.";
        return "Enter a JSON object query.";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2.5rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                <DialogHeader className="p-10 pb-6 border-b border-border/40 bg-linear-to-b from-muted/20 to-transparent shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-3xl bg-primary/10 text-primary ring-1 ring-border/50 shadow-sm">
                            <Sparkles className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-bold tracking-tight">Manual Asset Registration</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-muted-foreground">
                                Define multiple data entities or script-based assets for your connection.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1">
                        <div className="p-10 pt-6 space-y-4">
                            <div className="grid grid-cols-12 gap-4 px-4 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                <div className="col-span-3">Display Name</div>
                                <div className="col-span-3">Technical Identifier (FQN)</div>
                                <div className="col-span-2">Object Type</div>
                                <div className="col-span-2 text-center">Sync Direction</div>
                                <div className="col-span-1 text-center">Strategy</div>
                                <div className="col-span-1"></div>
                            </div>

                            <AnimatePresence initial={false}>
                                {fields.map((field, index) => {
                                    const assetType = watchedAssets?.[index]?.asset_type;
                                    const isQuery = (QUERY_SCRIPT_TYPES as string[]).includes(assetType);
                                    const isIncremental = watchedAssets?.[index]?.is_incremental_capable;
                                    const usageType = watchedAssets?.[index]?.usageType;

                                    return (
                                        <motion.div
                                            key={field.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            className="group flex flex-col bg-muted/5 hover:bg-muted/10 rounded-3xl border border-border/30 hover:border-primary/20 transition-all p-1"
                                        >
                                            <div className="grid grid-cols-12 gap-3 items-center p-3">
                                                {/* Name */}
                                                <div className="col-span-3">
                                                    <Input
                                                        {...register(`assets.${index}.name`, { required: true })}
                                                        placeholder="e.g. Users Feed"
                                                        className="h-10 rounded-2xl bg-background/50 border-border/40 focus:bg-background transition-all text-xs font-semibold"
                                                    />
                                                </div>

                                                {/* FQN */}
                                                <div className="col-span-3">
                                                    <Input
                                                        {...register(`assets.${index}.fully_qualified_name`)}
                                                        placeholder="e.g. public.users"
                                                        className="h-10 rounded-2xl bg-background/30 border-border/30 font-mono text-[10px] focus:bg-background transition-all"
                                                    />
                                                </div>

                                                {/* Type */}
                                                <div className="col-span-2">
                                                    <Controller
                                                        control={control}
                                                        name={`assets.${index}.asset_type`}
                                                        render={({ field: f }) => (
                                                            <Select onValueChange={(val) => { 
                                                                f.onChange(val); 
                                                                if ((QUERY_SCRIPT_TYPES as string[]).includes(val)) {
                                                                    setValue(`assets.${index}.usageType`, 'source');
                                                                }
                                                            }} defaultValue={f.value}>
                                                                <SelectTrigger className="h-10 rounded-2xl bg-background/50 border-border/40 text-xs font-bold">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                                    {availableAssetTypes.map(type => (
                                                                        <SelectItem key={type} value={type} className="rounded-xl">
                                                                            <div className="flex items-center gap-2">
                                                                                {React.createElement(ASSET_META[type].icon, { className: "h-3.5 w-3.5 opacity-70" })}
                                                                                {ASSET_META[type].name}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                </div>

                                                {/* Usage */}
                                                <div className="col-span-2">
                                                    <Controller
                                                        control={control}
                                                        name={`assets.${index}.usageType`}
                                                        render={({ field: f }) => (
                                                            <Select onValueChange={f.onChange} value={f.value} disabled={isQuery}>
                                                                <SelectTrigger className="h-10 rounded-2xl bg-background/50 border-border/40 text-xs font-bold uppercase tracking-wider">
                                                                    <div className="flex items-center justify-center w-full gap-2">
                                                                        <ArrowRightLeft className="h-3.5 w-3.5 text-primary/60" />
                                                                        <SelectValue />
                                                                    </div>
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl shadow-xl">
                                                                    <SelectItem value="source" className="rounded-xl">Source</SelectItem>
                                                                    <SelectItem value="destination" className="rounded-xl">Destination</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    />
                                                </div>

                                                {/* Strategy */}
                                                <div className="col-span-1">
                                                    {usageType === 'source' ? (
                                                        <Controller
                                                            control={control}
                                                            name={`assets.${index}.is_incremental_capable`}
                                                            render={({ field: f }) => (
                                                                <Select 
                                                                    onValueChange={(val) => f.onChange(val === 'incremental')} 
                                                                    value={f.value ? 'incremental' : 'full'}
                                                                >
                                                                    <SelectTrigger className={cn(
                                                                        "h-10 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all",
                                                                        f.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-background/50 border-border/40 text-muted-foreground"
                                                                    )}>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl">
                                                                        <SelectItem value="full" className="rounded-xl text-[10px] font-bold">FULL</SelectItem>
                                                                        <SelectItem value="incremental" className="rounded-xl text-[10px] font-bold">INCR</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    ) : (
                                                        <Controller
                                                            control={control}
                                                            name={`assets.${index}.write_mode`}
                                                            render={({ field: f }) => (
                                                                <Select onValueChange={f.onChange} value={f.value}>
                                                                    <SelectTrigger className="h-10 rounded-2xl bg-background/50 border-border/40 text-[9px] font-black uppercase tracking-tighter">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-2xl">
                                                                        <SelectItem value="append" className="rounded-xl text-[10px] font-bold">APPEND</SelectItem>
                                                                        <SelectItem value="replace" className="rounded-xl text-[10px] font-bold">REPLACE</SelectItem>
                                                                        <SelectItem value="upsert" className="rounded-xl text-[10px] font-bold">UPSERT</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    )}
                                                </div>

                                                {/* Remove */}
                                                <div className="col-span-1 flex justify-end">
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" 
                                                        onClick={() => remove(index)} 
                                                        disabled={fields.length <= 1}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Advanced Config Section */}
                                            <AnimatePresence>
                                                {(isIncremental || isQuery) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden border-t border-border/20 bg-primary/5"
                                                    >
                                                        <div className="p-4 space-y-4">
                                                            {isIncremental && (
                                                                <div className="flex items-center gap-4 bg-background/60 border border-primary/20 rounded-2xl p-3 shadow-inner">
                                                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                                        <TrendingUp className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex-1 flex items-center gap-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Watermark Column</Label>
                                                                        <Input 
                                                                            {...register(`assets.${index}.watermark_column`, { required: isIncremental })} 
                                                                            placeholder="e.g. updated_at or id" 
                                                                            className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-0 font-mono" 
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {isQuery && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between px-1">
                                                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                                            <Code className="h-3 w-3 text-primary" /> Logic Definition
                                                                        </Label>
                                                                        <span className="text-[9px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                                                            {getQueryHelp(assetType)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="relative group">
                                                                        <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
                                                                        <Textarea 
                                                                            {...register(`assets.${index}.query`, { required: isQuery })} 
                                                                            placeholder={getPlaceholder(assetType)} 
                                                                            className="min-h-32 font-mono text-[11px] leading-relaxed p-4 rounded-2xl bg-background/80 border-border/40 focus:border-primary/30 relative z-10 shadow-sm" 
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-14 rounded-3xl border-dashed border-border/60 bg-background/20 hover:bg-primary/5 hover:border-primary/30 transition-all font-black uppercase tracking-widest text-muted-foreground hover:text-primary gap-3 mt-4 text-[10px]"
                                onClick={() => append({ 
                                    name: '', 
                                    asset_type: defaultAssetType, 
                                    usageType: 'source', 
                                    query: '', 
                                    is_incremental_capable: false, 
                                    watermark_column: 'timestamp', 
                                    write_mode: 'append' 
                                })}
                            >
                                <Plus className="h-4 w-4" /> Add Another Asset
                            </Button>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-10 border-t border-border/40 bg-muted/10 gap-4 shrink-0">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="rounded-2xl h-12 px-8 font-bold text-muted-foreground hover:bg-background" 
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="rounded-2xl h-12 px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] gap-3" 
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                            Register {fields.length} Asset{fields.length !== 1 ? 's' : ''}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};