import React from 'react';
import {
    Sliders, Layers, Terminal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from '@/components/ui/docs/CodeBlock';
import { cn } from '@/lib/utils';
import type { OperatorDef } from '@/types/operator';

interface OperatorDetailDialogProps {
    selectedOp: OperatorDef | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const OperatorDetailDialog: React.FC<OperatorDetailDialogProps> = ({ selectedOp, open, onOpenChange }) => {
    if (!selectedOp) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl border-border/60 bg-background/95 shadow-2xl backdrop-blur-3xl">
                <div className="flex flex-col h-[70vh]">
                    {/* --- Header --- */}
                    <div className="px-8 py-8 border-b border-border/40 bg-muted/5 relative overflow-hidden">
                        {/* Subtle background glow */}
                        <div className={cn(
                            "absolute -right-16 -top-16 h-48 w-48 blur-[80px] rounded-full opacity-15", 
                            selectedOp.color.split(' ')[0].replace('text-', 'bg-')
                        )} />
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className={cn("p-4 rounded-2xl border shadow-sm shrink-0", selectedOp.color)}>
                                <selectedOp.icon size={32} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        {selectedOp.name}
                                    </h2>
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted/50 border-border/40">
                                        {selectedOp.category}
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                    {selectedOp.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="config" className="flex-1 flex min-h-0">
                        {/* --- Sidebar Navigation --- */}
                        <div className="w-56 border-r border-border/40 bg-muted/20 p-4 flex flex-col gap-1 shrink-0">
                            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 border-none shadow-none">
                                <TabsTrigger
                                    value="config"
                                    className={cn(
                                        "w-full justify-start gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-bold",
                                        "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary",
                                        "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/40"
                                    )}
                                >
                                    <Sliders className="h-4 w-4" />
                                    Parameters
                                </TabsTrigger>
                                <TabsTrigger
                                    value="example"
                                    className={cn(
                                        "w-full justify-start gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-bold",
                                        "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary",
                                        "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/40"
                                    )}
                                >
                                    <Terminal className="h-4 w-4" />
                                    Definition
                                </TabsTrigger>
                            </TabsList>

                            {/* Info Card */}
                            <div className="mt-auto p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Operator ID</div>
                                <code className="text-[10px] font-mono font-bold text-primary block truncate">
                                    {selectedOp.id}
                                </code>
                            </div>
                        </div>

                        {/* --- Main Content Area --- */}
                        <div className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden relative">
                            <TabsContent value="config" className="flex-1 m-0 overflow-y-auto p-8 animate-in fade-in duration-300">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">Configuration Schema</h3>
                                        <div className="h-px flex-1 bg-border/40" />
                                    </div>

                                    <div className="grid gap-3">
                                        {Object.entries(selectedOp.configSchema).map(([key, type]) => {
                                            const isRequired = type.toLowerCase().includes('required');
                                            const cleanType = type.replace('(required)', '').replace('(optional)', '').trim();
                                            
                                            return (
                                                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-border/60 transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-1.5 w-1.5 rounded-full",
                                                            isRequired ? "bg-primary" : "bg-muted-foreground/30"
                                                        )} />
                                                        <code className="text-sm font-bold text-foreground font-mono">{key}</code>
                                                        {isRequired && (
                                                            <span className="text-[9px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                                                Required
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/30 border-border/40">
                                                        {cleanType}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                        
                                        {Object.keys(selectedOp.configSchema).length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/20 rounded-2xl gap-3 text-muted-foreground/30 bg-muted/5">
                                                <Layers size={32} strokeWidth={1.5} />
                                                <span className="text-xs font-bold uppercase tracking-widest">No parameters required</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="example" className="flex-1 m-0 animate-in fade-in duration-300 overflow-hidden relative">
                                <CodeBlock
                                    code={selectedOp.example}
                                    language="json"
                                    className="h-full border-0 bg-transparent"
                                    maxHeight="100%"
                                    wrap={true}
                                />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};
