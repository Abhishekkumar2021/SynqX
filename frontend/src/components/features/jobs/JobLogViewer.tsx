/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useJobLogs } from '@/hooks/useJobLogs';
import {
    Terminal, Play, Pause, 
    ArrowDown, Search, WrapText, CalendarCheck,
    ListFilter, Activity,
    Settings2, MoreVertical, FileDown, ClipboardCopy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobLogViewerProps {
    jobId: number | null;
}

export const JobLogViewer: React.FC<JobLogViewerProps> = ({ jobId }) => {
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [wordWrap, setWordWrap] = useState(false);
    const [showTimestamps, setShowTimestamps] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState<string[]>(['INFO', 'ERROR', 'WARNING', 'DEBUG', 'SUCCESS']);
    const [, setCopied] = useState(false);

    const { logs, isConnected } = useJobLogs(jobId);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter((log: any) => {
            const levelMatch = levelFilter.includes(log.level || 'INFO');
            const searchMatch = !searchQuery || 
                (log.message && log.message.toLowerCase().includes(searchQuery.toLowerCase()));
            return levelMatch && searchMatch;
        });
    }, [logs, levelFilter, searchQuery]);

    useEffect(() => {
        if (isAutoScroll && scrollViewportRef.current) {
            const viewport = scrollViewportRef.current;
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [filteredLogs, isAutoScroll]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (isAtBottom !== isAutoScroll) setIsAutoScroll(isAtBottom);
    };

    const handleDownload = () => {
        if (filteredLogs.length === 0) return;
        const content = filteredLogs.map((log: any) => {
            const timestamp = log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS') : '';
            return `${showTimestamps ? `${timestamp} ` : ''}[${log.level || 'INFO'}] ${log.message}`;
        }).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-job-${jobId}.txt`;
        a.click();
        toast.success("Logs exported");
    };

    const handleCopy = () => {
        const content = filteredLogs.map((log: any) => log.message).join('\n');
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard");
    };

    const getLevelConfig = (level: string) => {
        switch (level?.toUpperCase()) {
            case 'ERROR': return { 
                badge: "text-destructive bg-destructive/10 border-destructive/20", 
                line: "bg-destructive/5", 
                accent: "bg-destructive",
                text: "text-destructive/90 dark:text-red-400/90"
            };
            case 'WARNING': return { 
                badge: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20", 
                line: "bg-amber-500/5", 
                accent: "bg-amber-500",
                text: "text-amber-700 dark:text-amber-200/80"
            };
            case 'SUCCESS': return { 
                badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20", 
                line: "bg-emerald-500/5", 
                accent: "bg-emerald-500",
                text: "text-emerald-700 dark:text-emerald-200/80"
            };
            default: return { 
                badge: "text-primary bg-primary/10 border-primary/20", 
                line: "", 
                accent: "bg-primary",
                text: "text-foreground/80 dark:text-blue-50/70"
            };
        }
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-background text-foreground font-mono text-xs overflow-hidden transition-colors duration-300">
                {/* --- Optimized Production Toolbar --- */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-muted/30 border-b border-border/40 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-5">
                        <div className={cn(
                            "flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border transition-all duration-500",
                            isConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                        )}>
                            {isConnected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {isConnected ? 'Live' : 'Offline'}
                        </div>

                        <div className="relative group">
                            <Search className="z-20 absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Grep patterns..."
                                className="bg-muted/20 border-border/40 rounded-lg pl-8 pr-3 h-8 text-[11px] w-44 focus:w-64 transition-all duration-500 focus:bg-background shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Primary Interaction Group */}
                        <div className="flex items-center bg-muted/20 rounded-lg p-0.5 border border-border/40">
                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-background">
                                                <ListFilter className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] font-black uppercase tracking-widest">Severities</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end" className="w-48 glass-card border-border/40 rounded-xl p-1 shadow-2xl">
                                    {['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'DEBUG'].map(level => (
                                        <DropdownMenuCheckboxItem
                                            key={level}
                                            checked={levelFilter.includes(level)}
                                            onCheckedChange={(checked) => setLevelFilter(prev => checked ? [...prev, level] : prev.filter(l => l !== level))}
                                            className="text-[10px] font-bold uppercase rounded-lg"
                                        >
                                            {level}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="w-px h-3 bg-border/40 mx-0.5" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setIsAutoScroll(!isAutoScroll)} 
                                        className={cn("h-7 w-7 rounded-md transition-all", isAutoScroll ? "text-primary bg-primary/10" : "text-muted-foreground/60")}
                                    >
                                        {isAutoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest">{isAutoScroll ? 'Lock Scroll' : 'Follow'}</TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Display Settings */}
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-foreground">
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest">Display</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-56 glass-card border-border/40 rounded-xl p-1 shadow-2xl">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase opacity-40 px-3 py-2">Terminal Config</DropdownMenuLabel>
                                <DropdownMenuCheckboxItem checked={wordWrap} onCheckedChange={setWordWrap} className="text-[10px] font-bold uppercase rounded-lg cursor-pointer">
                                    <WrapText className="h-3.5 w-3.5 mr-2 opacity-60" /> Word Wrap
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={showTimestamps} onCheckedChange={setShowTimestamps} className="text-[10px] font-bold uppercase rounded-lg cursor-pointer">
                                    <CalendarCheck className="h-3.5 w-3.5 mr-2 opacity-60" /> Timestamps
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* More Actions */}
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-black uppercase tracking-widest">Actions</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 rounded-xl p-1 shadow-2xl">
                                <DropdownMenuItem onClick={handleCopy} className="text-[10px] font-bold uppercase rounded-lg py-2 cursor-pointer">
                                    <ClipboardCopy className="h-3.5 w-3.5 mr-2 opacity-60" /> Copy All Logs
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownload} className="text-[10px] font-bold uppercase rounded-lg py-2 cursor-pointer">
                                    <FileDown className="h-3.5 w-3.5 mr-2 opacity-60" /> Export forensic.txt
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* --- Log Stream with Enhanced Interaction --- */}
                <div 
                    ref={scrollViewportRef}
                    onScroll={handleScroll}
                    className={cn(
                        "flex-1 overflow-auto custom-scrollbar select-text bg-card/10",
                        wordWrap ? "whitespace-pre-wrap" : "whitespace-pre"
                    )}
                >
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                            <Terminal size={40} />
                            <span className="font-black uppercase tracking-[0.3em]">Awaiting Buffers...</span>
                        </div>
                    ) : (
                        <div className="min-w-full py-3">
                            {filteredLogs.map((log: any, idx: number) => {
                                const cfg = getLevelConfig(log.level);
                                return (
                                    <div 
                                        key={log.id || idx} 
                                        className={cn(
                                            "flex group relative min-h-[22px] transition-all duration-75 border-l-2 border-transparent hover:border-primary/50 hover:bg-muted/30",
                                            cfg.line
                                        )}
                                    >
                                        {/* Row Accent */}
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity", cfg.accent)} />
                                        
                                        {/* Gutter */}
                                        <div className="w-12 shrink-0 text-right pr-4 text-[9px] font-bold text-muted-foreground/20 select-none border-r border-border/40 pt-1 group-hover:text-primary/40">
                                            {idx + 1}
                                        </div>
                                        
                                        <div className="flex gap-4 items-start flex-1 min-w-0 pl-4 py-0.5 group-hover:translate-x-0.5 transition-transform">
                                            {showTimestamps && (
                                                <span className="text-[9px] font-black text-muted-foreground/30 shrink-0 select-none uppercase tracking-tighter w-24 pt-0.5">
                                                    {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss.SSS') : '00:00:00.000'}
                                                </span>
                                            )}
                                            
                                            <span className={cn(
                                                "shrink-0 uppercase text-[8px] px-1.5 py-0.5 rounded-sm font-black border tracking-widest transition-all w-16 text-center select-none mt-0.5",
                                                cfg.badge
                                            )}>
                                                {log.level || 'INFO'}
                                            </span>
                                            
                                            <span className={cn(
                                                "leading-relaxed font-medium selection:bg-primary/30 transition-colors",
                                                cfg.text
                                            )}>
                                                {log.message}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* --- Compact Footer --- */}
                <div className="px-5 py-1.5 bg-muted/30 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground/40 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <span className="font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Activity className="h-3 w-3" /> {filteredLogs.length} Events
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary font-black uppercase tracking-tighter">Top</button>
                        <button onClick={() => setIsAutoScroll(true)} className="hover:text-primary font-black uppercase tracking-tighter">Tail</button>
                    </div>
                </div>

                {!isAutoScroll && filteredLogs.length > 0 && (
                    <button
                        onClick={() => setIsAutoScroll(true)}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 px-5 py-2 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-2 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <ArrowDown className="h-3 w-3 animate-bounce" /> Resume Tail
                    </button>
                )}
            </div>
        </TooltipProvider>
    );
};
