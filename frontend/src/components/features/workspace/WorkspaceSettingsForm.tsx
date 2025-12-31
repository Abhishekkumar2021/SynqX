/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { updateWorkspace } from '@/lib/api';
import { Settings2, Globe, Info, CheckCircle2, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface WorkspaceSettingsFormProps {
    activeWorkspace: any;
    isAdmin: boolean;
    queryClient: any;
}

export const WorkspaceSettingsForm: React.FC<WorkspaceSettingsFormProps> = ({
    activeWorkspace,
    isAdmin,
    queryClient
}) => {
    const [wsName, setWsName] = useState(activeWorkspace?.name || '');
    const [wsDesc, setWsDesc] = useState(activeWorkspace?.description || '');

    useEffect(() => {
        if (activeWorkspace) {
            setWsName(activeWorkspace.name);
            setWsDesc(activeWorkspace.description || '');
        }
    }, [activeWorkspace]);

    const updateWsMutation = useMutation({
        mutationFn: (data: { name?: string, description?: string }) => 
            updateWorkspace(activeWorkspace!.id, data),
        onSuccess: () => {
            toast.success("Workspace Identity Updated");
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
        onError: (err: any) => {
            toast.error("Failed to update workspace", { description: err.response?.data?.detail });
        }
    });

    const hasChanges = wsName !== activeWorkspace?.name || wsDesc !== (activeWorkspace?.description || '');

    const handleReset = () => {
        setWsName(activeWorkspace?.name || '');
        setWsDesc(activeWorkspace?.description || '');
    };

    const handleSave = () => {
        updateWsMutation.mutate({ name: wsName, description: wsDesc });
    };

    return (
        <div className="lg:col-span-3 flex flex-col rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
            
            <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Settings2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold tracking-tight text-foreground">
                            Workspace Configuration
                        </h3>
                        <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase opacity-70">
                            TECHNICAL SPECIFICATIONS • ID: {activeWorkspace?.id}
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 tracking-widest px-2.5 py-0.5 font-black rounded-lg text-[8px] uppercase">
                    {activeWorkspace?.role} Permissions
                </Badge>
            </div>

            <div className="p-8 space-y-10">
                {/* Identity Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/80 flex items-center gap-2 whitespace-nowrap">
                            <Globe className="h-2.5 w-2.5" /> Identity & Branding
                        </h4>
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                    </div>

                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                                Workspace Name
                            </Label>
                            <Input 
                                value={wsName} 
                                onChange={e => setWsName(e.target.value)} 
                                className="h-11 bg-muted/20 border-border/40 rounded-xl font-bold text-base focus-visible:bg-background/80 transition-all px-5 shadow-sm focus-visible:ring-primary/20 text-foreground"
                                placeholder="e.g. Analytics Production"
                                readOnly={!isAdmin}
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                                Resource Slug
                            </Label>
                            <div className="h-11 flex items-center px-5 rounded-xl border border-border/40 bg-muted/5 backdrop-blur-sm cursor-not-allowed group/slug relative">
                                <code className="text-xs font-mono font-black text-primary/60 tracking-wider">
                                    {activeWorkspace?.slug}
                                </code>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 ml-auto opacity-0 group-hover/slug:opacity-100 transition-opacity text-primary hover:bg-primary/10 rounded-lg"
                                    onClick={() => {
                                        navigator.clipboard.writeText(activeWorkspace?.slug || '');
                                        toast.success("Slug copied to clipboard");
                                    }}
                                >
                                    <Copy size={12} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/80 flex items-center gap-2 whitespace-nowrap">
                            <Info className="h-2.5 w-2.5" /> Governance & Purpose
                        </h4>
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                            Mission Statement & Description
                        </Label>
                        <Textarea 
                            value={wsDesc} 
                            onChange={e => setWsDesc(e.target.value)} 
                            className="min-h-28 bg-muted/20 border-border/40 rounded-2xl p-6 text-sm leading-relaxed focus-visible:bg-background/80 transition-all resize-none font-medium shadow-sm focus-visible:ring-primary/20 text-foreground"
                            placeholder="Document the primary goals and data integrations for this workspace..."
                            readOnly={!isAdmin}
                        />
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div className="p-4 bg-muted/5 border-t border-border/20 flex justify-end gap-3 relative z-10">
                    <Button 
                        variant="ghost" 
                        className="rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[9px] hover:bg-muted/50 transition-all"
                        onClick={handleReset}
                        disabled={!hasChanges}
                    >
                        Discard
                    </Button>
                    <Button 
                        className="rounded-xl h-11 px-10 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all gap-2 bg-primary text-primary-foreground"
                        onClick={handleSave}
                        disabled={updateWsMutation.isPending || !hasChanges}
                    >
                        {updateWsMutation.isPending ? (
                            <RefreshCw className="animate-spin h-3.5 w-3.5" />
                        ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Apply Changes
                    </Button>
                </div>
            )}
        </div>
    );
};
