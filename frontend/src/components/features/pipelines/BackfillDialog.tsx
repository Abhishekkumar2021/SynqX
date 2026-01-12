/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, History, AlertCircle, Info, Loader2, ChevronDown } from 'lucide-react';
import { backfillPipeline, type Pipeline } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface BackfillDialogProps {
    pipeline: Pipeline | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BackfillDialog: React.FC<BackfillDialogProps> = ({ pipeline, open, onOpenChange }) => {
    const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
    const [endDate, setEndDate] = useState<Date>(new Date());

    const mutation = useMutation({
        mutationFn: () => {
            if (!pipeline) throw new Error("No pipeline selected");
            return backfillPipeline(pipeline.id, {
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                version_id: pipeline.published_version_id
            });
        },
        onSuccess: (data) => {
            toast.success("Backfill Initiated", {
                description: data.message
            });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error("Backfill Failed", {
                description: err.response?.data?.detail || "Could not trigger backfill runs."
            });
        }
    });

    if (!pipeline) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-[2rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                <DialogHeader className="p-8 pb-6 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-border/50 shadow-sm">
                            <History className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight">Data Backfill</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground">
                                Re-run <span className="font-bold text-foreground">{pipeline.name}</span> for a historical period.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full h-12 justify-between text-left font-medium rounded-xl border-border/40 bg-background/50",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{startDate ? format(startDate, "PPP") : "Pick a date"}</span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={(date) => date && setStartDate(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full h-12 justify-between text-left font-medium rounded-xl border-border/40 bg-background/50",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{endDate ? format(endDate, "PPP") : "Pick a date"}</span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={(date) => date && setEndDate(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 text-xs leading-relaxed font-medium">
                        <div className="p-1 rounded-lg bg-amber-500/10 shrink-0">
                            <Info className="h-3.5 w-3.5" />
                        </div>
                        <p>
                            This will trigger a separate job for each day in the selected range. 
                            Maximum 31 days allowed per backfill request.
                        </p>
                    </div>

                    {!pipeline.published_version_id && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold">
                            <AlertCircle className="h-4 w-4" />
                            No published version found. Please publish a version first.
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 pt-2 pb-10 sm:justify-center">
                    <div className="flex flex-col w-full gap-4">
                        <Button 
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending || !pipeline.published_version_id}
                            className="w-full rounded-2xl h-14 text-base font-bold shadow-2xl shadow-amber-500/20 gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all bg-amber-500 hover:bg-amber-600 text-white border-none"
                        >
                            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <History className="h-5 w-5" />}
                            Execute Backfill
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

