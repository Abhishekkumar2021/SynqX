import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPipelines, getJobs } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Workflow, ChevronRight, Command, Hash, Activity, Book } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { docsRegistry } from '@/lib/docs';

interface SearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SearchDialog: React.FC<SearchDialogProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- 1. Define selection handlers first to avoid ReferenceErrors ---
    const handleSelectPipeline = useCallback((id: number) => {
        navigate(`/pipelines/${id}`);
        onClose();
        setSearch('');
    }, [navigate, onClose]);

    const handleSelectJob = useCallback((id: number) => {
        navigate(`/jobs/${id}`);
        onClose();
        setSearch('');
    }, [navigate, onClose]);

    const handleSelectDoc = useCallback((href: string) => {
        navigate(href);
        onClose();
        setSearch('');
    }, [navigate, onClose]);
    
    // --- 2. Queries ---
    const pipelinesQuery = useQuery({
        queryKey: ['pipelines'],
        queryFn: () => getPipelines(),
        enabled: isOpen
    });

    const jobsQuery = useQuery({
        queryKey: ['jobs'],
        queryFn: () => getJobs(),
        enabled: isOpen
    });

    const pipelines = pipelinesQuery.data;
    const jobs = jobsQuery.data;

    // --- 3. Filtering Logic ---
    const filteredPipelines = useMemo(() => {
        if (!pipelines) return [];
        const s = search.toLowerCase();
        if (!s) return pipelines.slice(0, 8);
        return pipelines.filter(p => 
            p.name.toLowerCase().includes(s) ||
            (p.description || '').toLowerCase().includes(s)
        ).slice(0, 8);
    }, [pipelines, search]);

    const filteredJobs = useMemo(() => {
        if (!jobs) return [];
        const s = search.toLowerCase().replace('#', '');
        if (!s) return jobs.slice(0, 5);
        
        return jobs.filter(j => 
            j.id.toString().includes(s) ||
            j.status.toLowerCase().includes(s) ||
            j.pipeline_id.toString().includes(s)
        ).slice(0, 5);
    }, [jobs, search]);

    const filteredDocs = useMemo(() => {
        const s = search.toLowerCase();
        if (!s) return docsRegistry.slice(0, 5);
        return docsRegistry.filter(d => 
            d.title.toLowerCase().includes(s) ||
            d.description.toLowerCase().includes(s)
        ).slice(0, 5);
    }, [search]);

    const totalResults = useMemo(() => [
        ...filteredJobs.map(j => ({ ...j, type: 'job' })), 
        ...filteredPipelines.map(p => ({ ...p, type: 'pipeline' })),
        ...filteredDocs.map(d => ({ ...d, type: 'doc' }))
    ], [filteredJobs, filteredPipelines, filteredDocs]);

    const isLoading = pipelinesQuery.isLoading || jobsQuery.isLoading;

    // --- 4. Effects ---
    useEffect(() => {
        setSelectedIndex(0);
    }, [search, totalResults.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (totalResults.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % totalResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + totalResults.length) % totalResults.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected: any = totalResults[selectedIndex];
                if (selected) {
                    if (selected.type === 'job') handleSelectJob(selected.id);
                    else if (selected.type === 'pipeline') handleSelectPipeline(selected.id);
                    else if (selected.type === 'doc') handleSelectDoc(selected.href);
                }
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, totalResults, handleSelectJob, handleSelectPipeline, handleSelectDoc]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent hideClose className="sm:max-w-[750px] p-0 gap-0 glass-card border-border/40 overflow-hidden rounded-[2rem] shadow-2xl scale-100 animate-in fade-in zoom-in-95 duration-200">
                <DialogTitle className="sr-only">Search Pipelines and Executions</DialogTitle>
                
                {/* Search Bar Container */}
                <div className="p-5 border-b border-border/10 bg-muted/5 shrink-0">
                    <div className="relative group">
                        {/* Icon Container (Absolute) */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none">
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            ) : (
                                <Search className="h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
                            )}
                        </div>

                        {/* Search Input (Premium Styling) */}
                        <Input
                            placeholder="Search pipelines or executions..."
                            className={cn(
                                "pl-12 pr-28 h-14 text-xl font-bold tracking-tight",
                                "bg-background/40 border border-border/40 rounded-2xl shadow-inner",
                                "focus-visible:ring-0 focus-visible:border-primary/40 focus-visible:bg-background/60",
                                "placeholder:text-muted-foreground/30 selection:bg-primary/20",
                                "transition-all duration-300 group-hover:bg-background/50 group-hover:border-border/60"
                            )}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />

                        {/* Shortcuts (Absolute Right) */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-md shadow-sm pointer-events-none ring-1 ring-border/5">
                                <Command className="h-3.5 w-3.5 text-muted-foreground/60" />
                                <span className="text-[10px] font-black text-muted-foreground/60">K</span>
                            </div>
                            <button 
                                onClick={onClose}
                                className="h-9 px-4 flex items-center justify-center rounded-xl border border-border/40 bg-background/80 text-[10px] font-black text-muted-foreground/60 hover:text-foreground hover:border-border hover:bg-muted/30 transition-all active:scale-95 shadow-sm"
                            >
                                ESC
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Results Container */}
                <div 
                    ref={scrollContainerRef}
                    className="max-h-[480px] overflow-y-auto p-4 custom-scrollbar bg-transparent"
                >
                    {isLoading && totalResults.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground/40 animate-in fade-in duration-500">
                            <div className="h-12 w-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
                            <p className="text-sm font-medium">Fetching results...</p>
                        </div>
                    ) : totalResults.length > 0 ? (
                        <div className="space-y-6">
                            {/* Jobs Section */}
                            {filteredJobs.length > 0 && (
                                <div className="space-y-2">
                                    <div className="px-4 py-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary/60">
                                        <Activity className="h-3 w-3" />
                                        Forensic History
                                    </div>
                                    <div className="space-y-1">
                                        {filteredJobs.map((j, idx) => (
                                            <button
                                                key={`job-${j.id}`}
                                                onClick={() => handleSelectJob(j.id)}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group text-left",
                                                    selectedIndex === idx 
                                                        ? "bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 translate-x-1" 
                                                        : "hover:bg-muted/30 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-500",
                                                        selectedIndex === idx ? "bg-primary text-primary-foreground rotate-6 scale-110 shadow-lg shadow-primary/20" : "bg-muted/50 text-muted-foreground"
                                                    )}>
                                                        <Hash className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-bold font-mono tracking-tight">Execution #{j.id}</span>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-medium">
                                                            <span className="capitalize">{j.status}</span>
                                                            <span className="h-1 w-1 rounded-full bg-border" />
                                                            <span>Pipeline {j.pipeline_id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className={cn(
                                                    "h-4 w-4 transition-all duration-500",
                                                    selectedIndex === idx ? "text-primary opacity-100 translate-x-0" : "text-muted-foreground opacity-0 -translate-x-4"
                                                )} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pipelines Section */}
                            {filteredPipelines.length > 0 && (
                                <div className="space-y-2">
                                    <div className="px-4 py-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-blue-500/60">
                                        <Workflow className="h-3 w-3" />
                                        Data Pipelines
                                    </div>
                                    <div className="space-y-1">
                                        {filteredPipelines.map((p, idx) => {
                                            const actualIdx = idx + filteredJobs.length;
                                            return (
                                                <button
                                                    key={`pipe-${p.id}`}
                                                    onClick={() => handleSelectPipeline(p.id)}
                                                    onMouseEnter={() => setSelectedIndex(actualIdx)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group text-left",
                                                        selectedIndex === actualIdx 
                                                            ? "bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/5 translate-x-1" 
                                                            : "hover:bg-muted/30 border border-transparent"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-500",
                                                            selectedIndex === actualIdx ? "bg-blue-500 text-white rotate-6 scale-110 shadow-lg shadow-blue-500/20" : "bg-muted/50 text-muted-foreground"
                                                        )}>
                                                            <Workflow className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-sm font-bold tracking-tight">{p.name}</span>
                                                            <span className="text-xs text-muted-foreground/60 line-clamp-1 font-medium italic">{p.description || 'No description provided'}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={cn(
                                                        "h-4 w-4 transition-all duration-500",
                                                        selectedIndex === actualIdx ? "text-blue-500 opacity-100 translate-x-0" : "text-muted-foreground opacity-0 -translate-x-4"
                                                    )} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Docs Section */}
                            {filteredDocs.length > 0 && (
                                <div className="space-y-2">
                                    <div className="px-4 py-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/60">
                                        <Book className="h-3 w-3" />
                                        Knowledge Base
                                    </div>
                                    <div className="space-y-1">
                                        {filteredDocs.map((d, idx) => {
                                            const actualIdx = idx + filteredJobs.length + filteredPipelines.length;
                                            return (
                                                <button
                                                    key={`doc-${d.href}`}
                                                    onClick={() => handleSelectDoc(d.href)}
                                                    onMouseEnter={() => setSelectedIndex(actualIdx)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group text-left",
                                                        selectedIndex === actualIdx 
                                                            ? "bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5 translate-x-1" 
                                                            : "hover:bg-muted/30 border border-transparent"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-500",
                                                            selectedIndex === actualIdx ? "bg-amber-500 text-white rotate-6 scale-110 shadow-lg shadow-amber-500/20" : "bg-muted/50 text-muted-foreground"
                                                        )}>
                                                            <Book className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-sm font-bold tracking-tight">{d.title}</span>
                                                            <span className="text-xs text-muted-foreground/60 line-clamp-1 font-medium italic">{d.description || 'View documentation page'}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={cn(
                                                        "h-4 w-4 transition-all duration-500",
                                                        selectedIndex === actualIdx ? "text-amber-500 opacity-100 translate-x-0" : "text-muted-foreground opacity-0 -translate-x-4"
                                                    )} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground/40 animate-in fade-in duration-500">
                            <div className="relative mb-6">
                                <Search className="h-16 w-16 opacity-10" />
                                <Command className="absolute -bottom-2 -right-2 h-8 w-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">No results found for "{search}"</p>
                            <p className="text-[10px] uppercase tracking-widest mt-2 font-bold opacity-50">Try searching for a different keyword</p>
                        </div>
                    )}
                </div>

                {/* Footer with Hints */}
                <div className="border-t border-border/10 px-6 py-4 flex items-center justify-between bg-muted/10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <kbd className="rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 font-mono text-[11px] shadow-sm">↵</kbd>
                            <span>Select</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <kbd className="rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 font-mono text-[11px] shadow-sm">↑↓</kbd>
                            <span>Navigate</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">SynqX</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
