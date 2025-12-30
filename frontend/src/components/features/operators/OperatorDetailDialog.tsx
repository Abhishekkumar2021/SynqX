import React from 'react';
import {
    Code2, Sliders, Layers
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
            <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-[2.5rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
                <div className="flex flex-col h-[75vh]">
                    {/* Header */}
                    <div className="px-10 py-8 relative z-10 border-b border-border/40 bg-muted/5">
                        <div className="flex items-start gap-6">
                            <div className={cn("p-4 rounded-3xl shadow-lg border ring-1 ring-white/20 shrink-0", selectedOp.color)}>
                                <selectedOp.icon size={36} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-3 flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                                        {selectedOp.name}
                                    </h2>
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-background border border-border/50">
                                        {selectedOp.category}
                                    </Badge>
                                </div>
                                <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
                                    {selectedOp.description}
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                    <code className="text-[10px] font-mono font-bold bg-muted/50 px-2 py-1 rounded text-muted-foreground/70 tracking-wider uppercase">
                                        ID: {selectedOp.id}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="config" className="flex-1 flex min-h-0">
                        {/* Sidebar Navigation */}
                        <div className="w-60 border-r border-border/40 bg-muted/10 p-6 flex flex-col gap-2 shrink-0">
                            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-2 border-none">
                                {[
                                    { id: "config", label: "Configuration", icon: Sliders },
                                    { id: "example", label: "JSON Definition", icon: Code2 },
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
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col min-w-0 bg-background/30 overflow-hidden relative">
                            <TabsContent value="config" className="flex-1 m-0 overflow-y-auto custom-scrollbar p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid gap-3 max-w-3xl">
                                    {Object.entries(selectedOp.configSchema).map(([key, type]) => (
                                        <div key={key} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/60 hover:bg-card/80 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                                <code className="text-sm font-bold text-foreground font-mono">{key}</code>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/30 border-border/50">
                                                {type}
                                            </Badge>
                                        </div>
                                    ))}
                                    {Object.keys(selectedOp.configSchema).length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/30 rounded-3xl gap-4 text-muted-foreground/40 bg-muted/5">
                                            <Layers size={32} />
                                            <span className="text-xs font-black uppercase tracking-[0.2em]">No Configuration Required</span>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="example" className="flex-1 m-0 relative animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="absolute inset-0">
                                    <CodeBlock
                                        language="json"
                                        code={selectedOp.example}
                                        className="h-full shadow-none rounded-none! border-none!"
                                        title="operator_def.json"
                                        rounded={false}
                                        maxHeight="100%"
                                    />
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};
