/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Terminal, 
  ShieldCheck, 
  Box,
  Code2,
  Zap,
  Loader2,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  X,
  Download,
  Laptop,
  ArrowDownToLine,
  FileJson,
  Check,
  Tags
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { api } from '@/lib/api/base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from 'sonner';

// Existing Shared Components
import { ConfigField } from '@/components/features/connections/ConfigField';
import { CodeBlock } from '@/components/ui/docs/CodeBlock';

// --- API Helpers ---
const createAgent = async (data: { name: string, tags: any }) => (await api.post('/agents/', data)).data;

/**
 * Enhanced GroupSelector using shadcn Command & Popover
 */
const GroupSelector = ({ 
    selectedGroups, 
    setSelectedGroups, 
    existingGroups 
}: { 
    selectedGroups: string[], 
    setSelectedGroups: (groups: string[]) => void,
    existingGroups: string[]
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const toggleGroup = (group: string) => {
        const clean = group.trim().toLowerCase();
        if (!clean) return;

        if (clean === 'internal') {
            toast.error("Reserved Name", {
                description: "'internal' is reserved for SynqX cloud mode."
            });
            return;
        }
        
        if (selectedGroups.includes(clean)) {
            setSelectedGroups(selectedGroups.filter(g => g !== clean));
        } else {
            setSelectedGroups([...selectedGroups, clean]);
            toast.success(`Group "${clean}" selected`);
        }
        setInputValue('');
    };

    const handleCreateNew = () => {
        if (!inputValue.trim()) return;
        toggleGroup(inputValue);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 leading-none flex items-center gap-2">
                    <Tags className="h-3 w-3" /> Groups / Labels
                </label>
                <span className="text-[9px] font-bold text-primary/60  leading-none">Multiselect enabled</span>
            </div>

            <div className="space-y-3">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                                "w-full min-h-16 h-auto rounded-[1.5rem] justify-between px-6 py-3 border-border/40 bg-muted/20 hover:bg-muted/30 transition-all text-foreground shadow-sm",
                                open && "ring-2 ring-primary/20 border-primary/40 bg-background"
                            )}
                        >
                            <div className="flex flex-wrap gap-2 items-center text-left">
                                {selectedGroups.length > 0 ? (
                                    <AnimatePresence mode="popLayout">
                                        {selectedGroups.map((group) => (
                                            <motion.div
                                                key={group}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                layout
                                            >
                                                <Badge 
                                                    variant="secondary" 
                                                    className="pl-3 pr-1.5 py-1 gap-1.5 rounded-xl border border-primary/10 bg-background shadow-xs hover:border-primary/30 transition-all group/badge"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleGroup(group);
                                                    }}
                                                >
                                                    <span className="font-bold text-[10px] uppercase tracking-tight">{group}</span>
                                                    <X className="h-3 w-3 text-muted-foreground/60 group-hover/badge:text-destructive transition-colors" />
                                                </Badge>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                ) : (
                                    <span className="text-muted-foreground/40 font-bold text-sm">Select processing groups...</span>
                                )}
                            </div>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-[2rem] overflow-hidden border-border/40 shadow-2xl backdrop-blur-2xl bg-background/95" 
                        align="start"
                        sideOffset={8}
                    >
                        <Command className="bg-transparent [&_[data-slot=command-input-wrapper]]:bg-muted/20 [&_[data-slot=command-input-wrapper]]:h-14 [&_[data-slot=command-input-wrapper]]:border-b-border/10 [&_[data-slot=command-input-wrapper]]:px-6">
                            <CommandInput 
                                placeholder="Search or create group..." 
                                value={inputValue}
                                onValueChange={setInputValue}
                                className="h-14 border-none focus:ring-0 font-bold text-sm bg-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inputValue.trim()) {
                                        handleCreateNew();
                                    }
                                }}
                            />
                            <CommandList className="max-h-72 custom-scrollbar p-2">
                                <CommandEmpty className="p-0">
                                    <div className="p-8 flex flex-col items-center gap-4 text-center">
                                        <div className="p-4 rounded-[1.5rem] bg-primary/5 text-primary/30 ring-1 ring-primary/10">
                                            <Tags className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-sm font-bold text-foreground uppercase tracking-tight">No matching groups</p>
                                            <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed max-w-[180px] mx-auto">Create a unique processing label for this agent.</p>
                                        </div>
                                        {inputValue.trim() && (
                                            <Button 
                                                size="sm" 
                                                className="rounded-xl h-11 px-8 font-bold text-[10px] uppercase tracking-[0.2em] gap-3 shadow-2xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all"
                                                onClick={handleCreateNew}
                                            >
                                                <div className="p-1 rounded-md bg-white/20">
                                                    <Plus className="h-3 w-3 stroke-[3]" />
                                                </div>
                                                Create "{inputValue}"
                                            </Button>
                                        )}
                                    </div>
                                </CommandEmpty>
                                
                                <CommandGroup 
                                    heading="Existing Groups" 
                                    className="[&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-muted-foreground/50 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:mt-2"
                                >
                                    {existingGroups.map((group) => (
                                        <CommandItem
                                            key={group}
                                            onSelect={() => toggleGroup(group)}
                                            className="rounded-xl px-4 py-3 mb-1 cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-all group/item flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-5 w-5 rounded-lg border border-border/60 flex items-center justify-center transition-all duration-300",
                                                    selectedGroups.includes(group) 
                                                        ? "bg-primary border-primary shadow-lg shadow-primary/20" 
                                                        : "bg-muted/40 group-hover/item:border-primary/40"
                                                )}>
                                                    <AnimatePresence>
                                                        {selectedGroups.includes(group) && (
                                                            <motion.div
                                                                initial={{ scale: 0.5, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.5, opacity: 0 }}
                                                            >
                                                                <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-tight">{group}</span>
                                            </div>
                                            {selectedGroups.includes(group) ? (
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Selected</span>
                                            ) : (
                                                <Plus className="h-3.5 w-3.5 opacity-0 group-hover/item:opacity-40 transition-opacity" />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                
                                {inputValue.trim() && !existingGroups.includes(inputValue.toLowerCase()) && (
                                    <>
                                        <CommandSeparator className="my-2 bg-border/20" />
                                        <CommandGroup 
                                            heading="Quick Create"
                                            className="[&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-emerald-500/60 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2"
                                        >
                                            <CommandItem
                                                onSelect={handleCreateNew}
                                                className="rounded-xl px-4 py-3 cursor-pointer bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 data-[selected=true]:bg-emerald-500/10 transition-all border border-emerald-500/20 border-dashed hover:border-emerald-500/40"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-6 w-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                        <Plus className="h-3.5 w-3.5 stroke-[4]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold uppercase tracking-tight">New Group: {inputValue}</span>
                                                        <span className="text-[9px] font-bold opacity-60">Add to processing queue</span>
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

export const SetupInstructions = ({clientId, apiKey, agentName, tags, isNew = false, onClose }: any) => {
    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>(() => {
        const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
        if (ua.includes('win')) return 'windows';
        if (ua.includes('mac')) return 'macos';
        return 'linux';
    });

    const [installMethod, setInstallTab] = useState('one-liner');
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadZip = async () => {
        setIsDownloading(true);
        try {
            const response = await api.post('/agents/export', {
                agent_name: agentName,
                client_id: clientId,
                api_key: apiKey,
                tags: tags
            }, { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `synqx-agent-${agentName.toLowerCase().replace(/\s+/g, '-')}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Developer Kit Downloaded");
        } catch {
            toast.error("Package Generation Failed");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadJson = () => {
        const data = {
            agent_name: agentName,
            client_id: clientId,
            api_key: apiKey,
            tags: tags,
            api_url: API_URL,
            generated_at: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `synqx-agent-${agentName.toLowerCase().replace(/\s+/g, '-')}-config.json`;
        a.click();
        toast.success("Credentials saved as JSON");
    };

    const dockerCommand = `docker run -d \\
  --name synqx-agent-${agentName.toLowerCase().replace(/\s+/g, '-')} \\
  -e SYNQX_API_URL="${API_URL}" \\
  -e SYNQX_CLIENT_ID="${clientId}" \\
  -e SYNQX_API_KEY="${apiKey}" \\
  -e SYNQX_TAGS="${tags}" \\
  synqx/agent:latest`;

    const shellCommand = platform === 'windows' 
        ? `powershell -ExecutionPolicy ByPass -Command "iwr https://get.synqx.com/install.ps1 | iex" -ApiUrl "${API_URL}" -ClientId "${clientId}" -ApiKey "${apiKey}"`
        : `curl -fsSL https://get.synqx.com/install.sh | bash -s -- --api-url "${API_URL}" --client-id "${clientId}" --api-key "${apiKey}"`;

    const pythonCommand = platform === 'windows' 
        ? `# 1. Isolate Environment
uv venv
.venv\\Scripts\\Activate.ps1

# 2. Install Standard CLI
uv pip install -e . 

# 3. Permanent Configuration
synqx-agent configure --api-url "${API_URL}" --client-id "${clientId}" --api-key "${apiKey}" --tags "${tags}"

# 4. Start Agent
synqx-agent start`
        : `# 1. Isolate Environment
uv venv
source .venv/bin/activate

# 2. Install Standard CLI
uv pip install -e . 

# 3. Permanent Configuration
synqx-agent configure --api-url "${API_URL}" --client-id "${clientId}" --api-key "${apiKey}" --tags "${tags}"

# 4. Start Agent
synqx-agent start`;

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-3xl overflow-hidden text-foreground">
            <div className={cn(
                "p-8 pb-6 border-b border-border/40 shrink-0",
                isNew 
                    ? "bg-emerald-500/5" 
                    : "bg-primary/5"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-5">
                        <div className={cn(
                            "p-4 rounded-2xl ring-1 shadow-sm",
                            isNew 
                                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" 
                                : "bg-primary/10 text-primary ring-primary/20"
                        )}>
                            {isNew ? <ShieldCheck className="h-7 w-7" /> : <Terminal className="h-7 w-7" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground leading-none">
                                {isNew ? "Agent Authorized" : "Agent Setup"}
                            </h2>
                            <p className="text-sm text-muted-foreground font-medium mt-1.5 opacity-80">
                                {isNew ? "Credentials generated. Save them before closing." : `Re-install agent for ${agentName}`}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn(
                        "font-bold px-3 py-1 rounded-lg text-[10px] tracking-wider shrink-0",
                        isNew ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" : "border-primary/30 text-primary bg-primary/5"
                    )}>
                        {isNew ? "PRIVATE" : "CONFIG"}
                    </Badge>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6 space-y-8">
                {/* --- Unified Utility Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {/* Backup Module */}
                    <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/60 dark:text-emerald-400/60 leading-none">Backup Identity</p>
                                <p className="text-[11px] font-bold text-emerald-800/80 dark:text-emerald-500/80 leading-tight">Save key for re-registration.</p>
                            </div>
                        </div>
                        <Button size="sm" onClick={handleDownloadJson} variant="outline" className="h-9 rounded-lg text-[10px] font-bold uppercase border-emerald-500/20 bg-background hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-2 shadow-sm shrink-0">
                            <FileJson className="h-3.5 w-3.5" /> JSON
                        </Button>
                    </div>

                    {/* Platform Selector Module */}
                    <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/40 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Laptop className="h-5 w-5 text-primary shrink-0" />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-none">Target Platform</p>
                                <p className="text-[11px] font-bold text-foreground leading-tight truncate max-w-[120px]">OS: <span className="text-primary capitalize">{platform}</span></p>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold text-[10px] uppercase gap-2 shadow-sm bg-background shrink-0 text-foreground border-border/40">
                                    Change <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 backdrop-blur-xl bg-background/95">
                                <DropdownMenuItem onClick={() => setPlatform('macos')} className="rounded-lg font-bold py-2 cursor-pointer text-xs">macOS</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPlatform('linux')} className="rounded-lg font-bold py-2 cursor-pointer text-xs">Linux</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPlatform('windows')} className="rounded-lg font-bold py-2 cursor-pointer text-xs">Windows</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConfigField label="Agent Client ID" value={clientId} copyable />
                    <ConfigField label="Secret API Key" value={apiKey} sensitive={!isNew} copyable={isNew} />
                </div>

                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shadow-sm border border-primary/20">2</div>
                        <h3 className="font-bold text-sm tracking-widest uppercase opacity-80 text-foreground leading-none">Installation Path</h3>
                        <div className="h-px flex-1 bg-border/20 ml-2" />
                    </div>

                    <Tabs value={installMethod} onValueChange={setInstallTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/30 border border-border/40 rounded-xl p-1 h-11">
                            <TabsTrigger value="one-liner" className="gap-2 text-[11px] font-bold uppercase tracking-tight rounded-lg">
                                <Terminal className="h-3.5 w-3.5" /> CLI One-Liner
                            </TabsTrigger>
                            <TabsTrigger value="docker" className="gap-2 text-[11px] font-bold uppercase tracking-tight rounded-lg">
                                <Box className="h-3.5 w-3.5" /> Docker
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="gap-2 text-[11px] font-bold uppercase tracking-tight rounded-lg">
                                <Code2 className="h-3.5 w-3.5" /> Manual steps
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-6">
                            <TabsContent value="one-liner" className="mt-0 space-y-4 animate-in fade-in-50 duration-300">
                                <p className="text-[11px] font-medium text-muted-foreground px-1 leading-relaxed">Automatic {platform} setup. Handles virtual environment & dependencies.</p>
                                <CodeBlock language="bash" code={shellCommand} rounded wrap maxHeight="120px" className="border-border/40 bg-muted/10 shadow-sm" />
                            </TabsContent>

                            <TabsContent value="docker" className="mt-0 space-y-4 animate-in fade-in-50 duration-300">
                                <p className="text-[11px] font-medium text-muted-foreground px-1 leading-relaxed">Isolated container execution. The preferred method for production servers.</p>
                                <CodeBlock language="bash" code={dockerCommand} rounded wrap maxHeight="120px" className="border-border/40 bg-muted/10 shadow-sm" />
                            </TabsContent>

                            <TabsContent value="manual" className="mt-0 space-y-8 animate-in fade-in-50 duration-300">
                                {/* ZIP Download Hero Section */}
                                <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex items-center justify-between gap-6 group hover:border-primary/40 transition-all shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 rounded-xl bg-background border border-primary/10 shadow-md group-hover:scale-110 transition-transform">
                                            <ArrowDownToLine className={cn("h-7 w-7 text-primary", isDownloading && "animate-bounce")} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-base tracking-tight text-foreground">Source Package</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed max-w-70">Pre-configured agent with full source code.</p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleDownloadZip} 
                                        disabled={isDownloading || !isNew} 
                                        className="rounded-xl h-12 px-6 font-bold gap-2 shadow-lg shadow-primary/20 shrink-0 transition-all hover:scale-[1.02] active:scale-95 bg-primary text-primary-foreground"
                                    >
                                        {isDownloading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4.5 w-4.5" />}
                                        Download ZIP
                                    </Button>
                                </div>

                                {/* Manual Reference Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_var(--color-primary)]" />
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">Custom Configuration Reference</h4>
                                    </div>
                                    <CodeBlock 
                                        language="bash" 
                                        code={pythonCommand} 
                                        rounded 
                                        wrap 
                                        maxHeight="220px" 
                                        className="border-border/40 bg-muted/10 shadow-inner" 
                                    />
                                    <p className="text-[10px] text-center text-muted-foreground opacity-60 font-medium uppercase tracking-tight">Manual setup with uv isolation</p>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {isNew && (
                    <Alert className="rounded-xl bg-amber-500/10 border-amber-500/20 py-4 px-6 border-dashed dark:bg-amber-500/5">
                        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        <div className="text-[11px] text-amber-900 dark:text-amber-400 font-bold ml-2 leading-none">
                            Awaiting initial heartbeat. Status will turn <span className="underline decoration-amber-500/40 underline-offset-4">online</span> automatically.
                        </div>
                    </Alert>
                )}
            </div>

            <div className="p-6 border-t border-border/40 bg-muted/30 dark:bg-muted/10 flex items-center justify-between shrink-0 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-muted-foreground px-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Real-time Listener Active</span>
                </div>
                <Button onClick={onClose} variant="ghost" className="rounded-xl font-bold h-10 px-6 hover:bg-background border border-border/40 transition-all text-foreground shadow-sm">
                    Done <ArrowRight className="h-4 w-4 ml-2 text-primary" />
                </Button>
            </div>
        </div>
    );
};

export const RegisterAgentDialog = ({ open, onOpenChange, agents }: any) => {
    const queryClient = useQueryClient();
    const [newAgentName, setNewAgentName] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<string[]>(['default']);
    const [generatedCreds, setGeneratedCreds] = useState<any | null>(null);

    const existingGroups = useMemo(() => {
        if (!agents) return ['default'];
        const groups = new Set(['default']);
        agents.forEach((r: any) => {
            if (r.tags?.groups) r.tags.groups.forEach((g: string) => groups.add(g));
        });
        return Array.from(groups);
    }, [agents]);

    const createMutation = useMutation({
        mutationFn: (data: { name: string, tags: any }) => createAgent(data),
        onSuccess: (data) => {
            setGeneratedCreds(data);
            queryClient.invalidateQueries({ queryKey: ['agents'] });
        },
        onError: (err: any) => {
            toast.error("Registration Failed", {
                description: err.response?.data?.detail || "Make sure the agent name is unique."
            });
        }
    });

    const handleClose = () => {
        onOpenChange(false);
        setGeneratedCreds(null);
        setNewAgentName('');
        setSelectedGroups(['default']);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-4xl rounded-2xl p-0 overflow-hidden border-border/40 bg-background/95 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10 dark:ring-white/5 max-h-[85vh] flex flex-col gap-0">
                <VisuallyHidden.Root>
                    <DialogTitle>Register New Remote Agent</DialogTitle>
                    <DialogDescription>Input agent details and generate credentials.</DialogDescription>
                </VisuallyHidden.Root>

                {!generatedCreds ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-10 space-y-10 overflow-y-auto custom-scrollbar bg-background text-foreground flex-1">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                                    <Zap className="h-8 w-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tight text-foreground leading-none">Register Agent</h2>
                                    <p className="text-sm font-medium text-muted-foreground mt-2 opacity-80">Provision a new execution slot for your private environment.</p>
                                </div>
                            </div>
                        </DialogHeader>
                        
                        <div className="space-y-8 max-w-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1 leading-none">Friendly Name</label>
                                    <Input 
                                        placeholder="e.g. West-Cloud-Prod" 
                                        value={newAgentName} 
                                        onChange={(e) => setNewAgentName(e.target.value)}
                                        className="rounded-xl h-14 text-base px-6 font-bold placeholder:text-muted-foreground/30 text-foreground shadow-sm bg-muted/20 border-border/40 focus:bg-background transition-all"
                                    />
                                </div>
                                
                                <GroupSelector 
                                    selectedGroups={selectedGroups} 
                                    setSelectedGroups={setSelectedGroups} 
                                    existingGroups={existingGroups} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-3 group hover:bg-muted/30 transition-all shadow-sm">
                                    <div className="p-2.5 w-fit rounded-xl bg-background shadow-md border border-border/40 group-hover:scale-105 transition-transform">
                                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">Secure Tunnels</p>
                                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80">Outbound-only connectivity via HTTPS. Zero firewall setup.</p>
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-3 group hover:bg-muted/30 transition-all shadow-sm">
                                    <div className="p-2.5 w-fit rounded-xl bg-background shadow-md border border-border/40 group-hover:scale-105 transition-transform">
                                        <Box className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">Unified Compute</p>
                                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80">Deploy on Docker, Windows, or Linux. Joins global pool.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-border/40 flex justify-end">
                            <Button 
                                onClick={() => createMutation.mutate({
                                    name: newAgentName, 
                                    tags: { groups: selectedGroups } 
                                })}
                                disabled={!newAgentName || createMutation.isPending}
                                className="h-14 px-10 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 gap-3 transition-all hover:scale-[1.01] active:scale-95 bg-primary text-primary-foreground min-w-[240px]"
                            >
                                {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="h-5 w-5" /> Generate Identity</>}</Button>
                        </div>
                    </motion.div>
                ) : (
                    <SetupInstructions 
                        clientId={generatedCreds.client_id}
                        apiKey={generatedCreds.api_key}
                        agentName={newAgentName}
                        tags={selectedGroups.join(',')}
                        isNew
                        onClose={handleClose}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};