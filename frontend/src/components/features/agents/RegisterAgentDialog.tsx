/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useRef } from 'react';
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
  Search,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 leading-none flex items-center gap-2">
                    <Tags className="h-3 w-3" /> Groups / Labels
                </label>
                <span className="text-[9px] font-bold text-primary/60 italic leading-none">Multiselect enabled</span>
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
                                                    <span className="font-black text-[10px] uppercase tracking-tight">{group}</span>
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
                                            <p className="text-sm font-black text-foreground uppercase tracking-tight">No matching groups</p>
                                            <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed max-w-[180px] mx-auto">Create a unique processing label for this agent.</p>
                                        </div>
                                        {inputValue.trim() && (
                                            <Button 
                                                size="sm" 
                                                className="rounded-xl h-11 px-8 font-black text-[10px] uppercase tracking-[0.2em] gap-3 shadow-2xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all"
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
                                    className="[&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-muted-foreground/50 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:mt-2"
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
                                                <span className="text-xs font-black uppercase tracking-tight">{group}</span>
                                            </div>
                                            {selectedGroups.includes(group) ? (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Selected</span>
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
                                            className="[&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-emerald-500/60 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2"
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
                                                        <span className="text-xs font-black uppercase tracking-tight">New Group: {inputValue}</span>
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

export const SetupInstructions = ({clientId, apiKey, runnerName, tags, isNew = false, onClose }: any) => {
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
                runner_name: runnerName,
                client_id: clientId,
                api_key: apiKey,
                tags: tags
            }, { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `synqx-agent-${runnerName.toLowerCase().replace(/\s+/g, '-')}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Developer Kit Downloaded");
        } catch (e) {
            toast.error("Package Generation Failed");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadJson = () => {
        const data = {
            agent_name: runnerName,
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
        a.download = `synqx-agent-${runnerName.toLowerCase().replace(/\s+/g, '-')}-config.json`;
        a.click();
        toast.success("Credentials saved as JSON");
    };

    const dockerCommand = `docker run -d \
  --name synqx-agent-${runnerName.toLowerCase().replace(/\s+/g, '-')} \
  -e SYNQX_API_URL="${API_URL}" \
  -e SYNQX_CLIENT_ID="${clientId}" \
  -e SYNQX_API_KEY="${apiKey}" \
  -e SYNQX_TAGS="${tags}" \
  synqx/agent:latest`;

    const shellCommand = platform === 'windows' 
        ? `powershell -ExecutionPolicy ByPass -Command "iwr https://get.synqx.com/install.ps1 | iex" -ApiUrl "${API_URL}" -ClientId "${clientId}" -ApiKey "${apiKey}"`
        : `curl -fsSL https://get.synqx.com/install.sh | bash -s -- --api-url "${API_URL}" --client-id "${clientId}" --api-key "${apiKey}"`;

    const pythonCommand = platform === 'windows' 
        ? `# 1. Isolate Environment
uv venv
.venv\Scripts\Activate.ps1

# 2. Install Standard CLI
uv pip install -e . 

# 3. Permanent Configuration
synqx-agent configure --client-id ${clientId} --api-key ${apiKey} --tags ${tags}

# 4. Start Agent
synqx-agent start`
        : `# 1. Isolate Environment
uv venv
source .venv/bin/activate

# 2. Install Standard CLI
uv pip install -e . 

# 3. Permanent Configuration
synqx-agent configure --client-id "${clientId}" --api-key "${apiKey}" --tags "${tags}"

# 4. Start Agent
synqx-agent start`;

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden text-foreground">
            <div className={cn(
                "p-8 pb-6 border-b border-border/40 shrink-0",
                isNew 
                    ? "bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:via-background" 
                    : "bg-linear-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/15 dark:via-background"
            )}>
                <div className="flex items-center justify-between mb-4 pr-10">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-2xl ring-1 shadow-sm",
                            isNew 
                                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-400/20" 
                                : "bg-primary/10 text-primary ring-primary/30 dark:bg-blue-500/20 dark:text-blue-400 dark:ring-blue-400/20"
                        )}>
                            {isNew ? <ShieldCheck className="h-7 w-7" /> : <Terminal className="h-7 w-7" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter text-foreground leading-none text-balance">
                                {isNew ? "Agent Authorized" : "Agent Setup"}
                            </h2>
                            <p className="text-sm text-muted-foreground font-semibold mt-1">
                                {isNew ? "Credentials generated. Save them before closing." : `Re-install agent for ${runnerName}`}
                            </p>
                        </div>
                    </div>
                    <Badge className={cn(
                        "font-black px-3 py-1 rounded-full text-[9px] tracking-widest shadow-lg shrink-0",
                        isNew ? "bg-emerald-500 hover:bg-emerald-500 shadow-emerald-500/20 text-white" : "bg-primary hover:bg-primary shadow-primary/20 text-white"
                    )}>
                        {isNew ? "PRIVATE" : "CONFIG"}
                    </Badge>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6 space-y-8">
                {/* --- Unified Utility Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {/* Backup Module */}
                    <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-900/60 dark:text-emerald-400/60 leading-none">Backup Identity</p>
                                <p className="text-[10px] font-bold text-emerald-800/80 dark:text-emerald-500/80 leading-tight">Save key to avoid re-registration.</p>
                            </div>
                        </div>
                        <Button size="sm" onClick={handleDownloadJson} variant="outline" className="h-9 rounded-xl text-[10px] font-black uppercase border-emerald-500/20 bg-background hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-2 shadow-sm shrink-0">
                            <FileJson className="h-3.5 w-3.5" /> JSON
                        </Button>
                    </div>

                    {/* Platform Selector Module */}
                    <div className="flex items-center justify-between bg-muted/20 p-4 rounded-2xl border border-border/40 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Laptop className="h-5 w-5 text-primary shrink-0" />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">Target Platform</p>
                                <p className="text-[10px] font-bold text-foreground leading-tight truncate max-w-[120px]">Active OS: <span className="text-primary capitalize">{platform}</span></p>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2 shadow-xs bg-background shrink-0 text-foreground">
                                    Change <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 backdrop-blur-xl bg-background/80">
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
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shadow-sm">2</div>
                        <h3 className="font-black text-base tracking-tight uppercase opacity-80 text-foreground leading-none">Installation Path</h3>
                        <div className="h-px flex-1 bg-border/50 ml-2" />
                    </div>

                    <Tabs value={installMethod} onValueChange={setInstallTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-12 px-2 rounded-2xl bg-muted/30 border border-border/40 dark:bg-muted/20 shadow-inner">
                            <TabsTrigger value="one-liner" className="rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <Terminal className="h-3.5 w-3.5" /> CLI One-Liner
                            </TabsTrigger>
                            <TabsTrigger value="docker" className="rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <Box className="h-3.5 w-3.5" /> Docker
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                                <Code2 className="h-3.5 w-3.5" /> Manual steps
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-6">
                            <TabsContent value="one-liner" className="mt-0 space-y-4 animate-in fade-in-50 duration-300">
                                <p className="text-[11px] font-medium text-muted-foreground px-1 italic leading-relaxed">Automatic {platform} setup. Handles virtual environment & dependencies.</p>
                                <CodeBlock language="bash" code={shellCommand} rounded wrap maxHeight="120px" className="border-border/40 bg-muted/5 dark:bg-slate-950/50 shadow-xs" />
                            </TabsContent>

                            <TabsContent value="docker" className="mt-0 space-y-4 animate-in fade-in-50 duration-300">
                                <p className="text-[11px] font-medium text-muted-foreground px-1 italic leading-relaxed">Isolated container execution. The preferred method for production servers.</p>
                                <CodeBlock language="bash" code={dockerCommand} rounded wrap maxHeight="120px" className="border-border/40 bg-muted/5 dark:bg-slate-950/50 shadow-xs" />
                            </TabsContent>

                            <TabsContent value="manual" className="mt-0 space-y-8 animate-in fade-in-50 duration-300">
                                {/* ZIP Download Hero Section */}
                                <div className="p-8 rounded-[2.5rem] border border-primary/20 bg-primary/5 dark:bg-primary/10 flex items-center justify-between gap-8 group hover:border-primary/40 transition-all shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 rounded-2xl bg-background border border-primary/10 shadow-xl group-hover:scale-110 transition-transform">
                                            <ArrowDownToLine className={cn("h-8 w-8 text-primary", isDownloading && "animate-bounce")} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-black text-lg tracking-tight text-foreground">Source Package</h4>
                                            <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-70">Pre-configured agent with full source code and credentials.</p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleDownloadZip} 
                                        disabled={isDownloading || !isNew} 
                                        className="rounded-2xl h-14 px-8 font-black gap-2 shadow-2xl shadow-primary/20 shrink-0 transition-all hover:scale-[1.02] active:scale-95 bg-primary text-primary-foreground"
                                    >
                                        {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                                        Download ZIP
                                    </Button>
                                </div>

                                {/* Manual Reference Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_var(--color-blue-500)]" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">Custom Configuration Reference</h4>
                                    </div>
                                    <CodeBlock 
                                        language="bash" 
                                        code={pythonCommand} 
                                        rounded 
                                        wrap 
                                        maxHeight="220px" 
                                        className="border-border/40 bg-muted/5 dark:bg-slate-950/50 shadow-inner" 
                                    />
                                    <p className="text-[10px] text-center text-muted-foreground italic opacity-60">Use this if you prefer to clone the repository manually or use an existing environment.</p>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {isNew && (
                    <Alert className="rounded-2xl bg-amber-500/10 border-amber-500/30 py-4 px-6 border-dashed dark:bg-amber-500/5 dark:border-amber-500/20">
                        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        <div className="text-[11px] text-amber-900 dark:text-amber-400 font-bold ml-2 leading-none">
                            Awaiting initial heartbeat. Status will turn <span className="underline decoration-amber-500/50 underline-offset-4">online</span> automatically.
                        </div>
                    </Alert>
                )}
            </div>

            <div className="p-6 border-t bg-muted/30 dark:bg-muted/10 flex items-center justify-between shrink-0 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-muted-foreground px-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Real-time Listener Active</span>
                </div>
                <Button onClick={onClose} variant="ghost" className="rounded-xl font-black h-10 px-6 hover:bg-background border border-transparent hover:border-border transition-all text-foreground shadow-sm">
                    Done <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
};

export const RegisterAgentDialog = ({ open, onOpenChange, agents }: any) => {
    const queryClient = useQueryClient();
    const [newRunnerName, setNewRunnerName] = useState('');
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
        setNewRunnerName('');
        setSelectedGroups(['default']);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-212.5 rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl ring-1 ring-white/10 dark:ring-white/5 max-h-[85vh] flex flex-col">
                <VisuallyHidden.Root>
                    <DialogTitle>Register New Remote Agent</DialogTitle>
                    <DialogDescription>Input agent details and generate credentials.</DialogDescription>
                </VisuallyHidden.Root>

                {!generatedCreds ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-10 space-y-8 overflow-y-auto custom-scrollbar bg-background text-foreground">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shadow-inner shadow-primary/5 dark:bg-primary/20 ring-1 ring-primary/20">
                                    <Zap className="h-8 w-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase leading-none">Register Agent</h2>
                                    <p className="text-base font-medium text-muted-foreground/60 mt-1">Provision a new execution slot for your private environment.</p>
                                </div>
                            </div>
                        </DialogHeader>
                        
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 leading-none">Friendly Name</label>
                                    <Input 
                                        placeholder="e.g. West-Cloud-Prod" 
                                        value={newRunnerName} 
                                        onChange={(e) => setNewRunnerName(e.target.value)}
                                        className="rounded-[1.5rem] h-16 text-lg px-8 font-bold placeholder:text-muted-foreground/30 text-foreground shadow-sm shadow-black/5 bg-muted/20 border-border/40 focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
                                    />
                                </div>
                                
                                <GroupSelector 
                                    selectedGroups={selectedGroups} 
                                    setSelectedGroups={setSelectedGroups} 
                                    existingGroups={existingGroups} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-6 rounded-[2rem] bg-muted/10 border border-border/50 space-y-3 dark:bg-muted/5 group hover:bg-muted/20 transition-all shadow-sm">
                                    <div className="p-2.5 w-fit rounded-xl bg-background shadow-lg border border-border/50 group-hover:scale-110 transition-transform">
                                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-widest text-foreground">Secure Tunnels</p>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed opacity-70">Outbound-only connectivity via HTTPS. Zero firewall configuration needed.</p>
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-muted/10 border border-border/40 space-y-3 dark:bg-muted/5 group hover:bg-muted/20 transition-all shadow-sm">
                                    <div className="p-2.5 w-fit rounded-xl bg-background shadow-lg border border-border/50 group-hover:scale-110 transition-transform">
                                        <Box className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-widest text-foreground">Unified Compute</p>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed opacity-70">Deploy on Docker, Windows, or Linux. All agents join your global pool.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/40">
                            <Button 
                                onClick={() => createMutation.mutate({
                                    name: newRunnerName, 
                                    tags: { groups: selectedGroups } 
                                })}
                                disabled={!newRunnerName || createMutation.isPending}
                                className="w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-primary/20 dark:shadow-none gap-3 transition-all hover:scale-[1.01] active:scale-95 bg-primary text-primary-foreground"
                            >
                                {createMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Plus className="h-6 w-6" /> Create & Generate Credentials</>}</Button>
                        </div>
                    </motion.div>
                ) : (
                    <SetupInstructions 
                        clientId={generatedCreds.client_id}
                        apiKey={generatedCreds.api_key}
                        runnerName={newRunnerName}
                        tags={selectedGroups.join(',')}
                        isNew
                        onClose={handleClose}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};