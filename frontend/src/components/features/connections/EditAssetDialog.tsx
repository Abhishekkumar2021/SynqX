/* eslint-disable react-hooks/incompatible-library */
import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateAsset, type Asset, type AssetUpdate } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles, Loader2, Code, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EditAssetDialogProps {
    connectionId: number;
    asset: Asset | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type FormValues = {
    name: string;
    fully_qualified_name?: string;
    description?: string;
    is_incremental_capable: boolean;
    watermark_column?: string;
    write_mode?: 'append' | 'replace' | 'upsert';
    query?: string;
};

export const EditAssetDialog: React.FC<EditAssetDialogProps> = ({ connectionId, asset, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>();

    const isIncremental = watch("is_incremental_capable");
    
    useEffect(() => {
        if (open && asset) {
            let query = '';
            let watermark_column = 'timestamp';
            let write_mode: any = 'append';

            if (asset.config) {
                if (asset.config.query) query = asset.config.query;
                if (asset.config.code) query = asset.config.code;
                if (asset.config.watermark_column) watermark_column = asset.config.watermark_column;
                if (asset.config.write_mode) write_mode = asset.config.write_mode;
            }

            reset({
                name: asset.name,
                fully_qualified_name: asset.fully_qualified_name || '',
                description: asset.description || '',
                is_incremental_capable: asset.is_incremental_capable,
                watermark_column: watermark_column,
                write_mode: write_mode,
                query: query
            });
        }
    }, [open, asset, reset]);

    const mutation = useMutation({
        mutationFn: (payload: AssetUpdate) => updateAsset(connectionId, asset!.id, payload),
        onSuccess: () => {
            toast.success("Asset Updated", {
                description: `Configuration for ${asset?.name} saved.`,
            });
            queryClient.invalidateQueries({ queryKey: ['assets', connectionId] });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error("Update Failed", {
                description: err.response?.data?.detail?.message || "Unexpected error."
            });
        }
    });

    const onSubmit = (data: FormValues) => {
        if (!asset) return;

        let config: Record<string, any> = { ...asset.config };
        
        // Update Query if applicable
        if (['sql_query', 'nosql_query'].includes(asset.asset_type)) {
            config.query = data.query;
        } else if (['python', 'shell'].includes(asset.asset_type)) {
            config.code = data.query;
        }

        // Update Incremental Config
        if (data.is_incremental_capable) {
            config.watermark_column = data.watermark_column;
        }

        // Update Writing Strategy
        if (asset.is_destination) {
            config.write_mode = data.write_mode;
        }

        const payload: AssetUpdate = {
            name: data.name,
            fully_qualified_name: data.fully_qualified_name,
            description: data.description,
            is_incremental_capable: data.is_incremental_capable,
            config: config
        };

        mutation.mutate(payload);
    };

    if (!asset) return null;

    const isQuery = ['sql_query', 'nosql_query', 'python', 'shell'].includes(asset.asset_type);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-[2rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                <DialogHeader className="p-8 pb-6 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-border/50 shadow-sm">
                            <Settings className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight">Configure Asset</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground">
                                Adjust settings for <span className="font-bold text-foreground">{asset.name}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                    <div className="p-8 pt-6 space-y-6">
                        
                        {/* Identifiers */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Display Name</Label>
                                <Input
                                    {...register("name", { required: true })}
                                    placeholder="e.g. User Activity Feed"
                                    className="bg-background/50 border-border/40 text-sm h-10 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                    Technical Identifier
                                    <span className="text-[8px] font-mono opacity-50">FQN</span>
                                </Label>
                                <Input
                                    {...register("fully_qualified_name")}
                                    placeholder="e.g. public.users"
                                    className="bg-background/50 border-border/40 font-mono text-xs h-10 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</Label>
                            <Textarea 
                                {...register('description')}
                                placeholder="Describe the purpose of this asset..."
                                className="bg-background/50 border-border/40 min-h-[80px] text-sm"
                            />
                        </div>

                        {/* Incremental Toggle (Source Only) */}
                        {asset.is_source && (
                            <div className="p-4 rounded-2xl border border-border/40 bg-muted/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Incremental Loading</Label>
                                        <p className="text-[10px] text-muted-foreground">Track state to only process new data.</p>
                                    </div>
                                    <Controller
                                        control={control}
                                        name="is_incremental_capable"
                                        render={({ field }) => (
                                            <Switch 
                                                checked={field.value} 
                                                onCheckedChange={field.onChange} 
                                                className="data-[state=checked]:bg-primary"
                                            />
                                        )}
                                    />
                                </div>

                                {isIncremental && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="pt-2"
                                    >
                                        <div className="flex items-center gap-3 bg-background/50 border border-border/40 rounded-xl p-3">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            <Label className="text-xs font-semibold whitespace-nowrap">Watermark Column:</Label>
                                            <Input 
                                                {...register('watermark_column', { required: isIncremental })}
                                                placeholder="e.g. updated_at"
                                                className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-2"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Writing Strategy (Destination Only) */}
                        {asset.is_destination && (
                            <div className="p-4 rounded-2xl border border-border/40 bg-muted/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Writing Strategy</Label>
                                        <p className="text-[10px] text-muted-foreground">Define how data is ingested into this asset.</p>
                                    </div>
                                    <Controller
                                        control={control}
                                        name="write_mode"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-[120px] h-9 rounded-xl bg-background border-border/40 text-xs font-bold uppercase">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="append">Append</SelectItem>
                                                    <SelectItem value="replace">Replace</SelectItem>
                                                    <SelectItem value="upsert">Upsert</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Query Editor (if applicable) */}
                        {isQuery && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                    <Code className="h-3 w-3" /> Definition
                                </Label>
                                <Textarea 
                                    {...register('query')}
                                    className="font-mono text-xs min-h-[120px] bg-background/50 border-border/40"
                                />
                            </div>
                        )}

                    </div>

                    <DialogFooter className="p-6 border-t border-border/40 bg-muted/10 gap-3">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="rounded-xl font-bold"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};