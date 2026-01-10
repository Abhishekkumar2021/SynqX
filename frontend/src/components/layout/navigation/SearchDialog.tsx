/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPipelines, getJobs } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Workflow, ChevronRight, Command, Hash, Book } from 'lucide-react';
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

                <DialogContent hideClose className="sm:max-w-2xl p-0 gap-0 border-border/40 overflow-hidden rounded-[2.5rem] shadow-2xl scale-100 animate-in fade-in zoom-in-95 duration-300 bg-background/60 backdrop-blur-3xl">

                    <DialogTitle className="sr-only">SynqX Omni-Search</DialogTitle>

                    

                    {/* Search Bar Container */}

                    <div className="p-6 border-b border-border/20 bg-muted/5 shrink-0 relative overflow-hidden">

                        <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent pointer-events-none" />

                        <div className="relative group z-10">

                            {/* Icon Container (Absolute) */}

                            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center z-20 pointer-events-none">

                                {isLoading ? (

                                    <div className="h-6 w-6 border-[2.5px] border-primary/30 border-t-primary rounded-full animate-spin" />

                                ) : (

                                    <Search className="h-6 w-6 text-muted-foreground/40 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-500" />

                                )}

                            </div>

    

                            {/* Search Input (Premium Styling) */}

                            <Input

                                placeholder="What are you looking for?"

                                className={cn(

                                    "pl-14 pr-32 h-16 text-2xl font-bold tracking-tight",

                                    "bg-background/40 border-2 border-border/40 rounded-[1.25rem] shadow-inner",

                                    "focus-visible:ring-0 focus-visible:border-primary/50 focus-visible:bg-background/80",

                                    "placeholder:text-muted-foreground/20 selection:bg-primary/30",

                                    "transition-all duration-500 group-hover:bg-background/60 group-hover:border-border/60"

                                )}

                                value={search}

                                onChange={(e) => setSearch(e.target.value)}

                                autoFocus

                            />

    

                            {/* Shortcuts (Absolute Right) */}

                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">

                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-md shadow-sm pointer-events-none ring-1 ring-border/5">

                                    <Command className="h-4 w-4 text-muted-foreground/40" />

                                    <span className="text-xs font-bold text-muted-foreground/40">K</span>

                                </div>

                                <div className="h-8 w-px bg-border/20 mx-1 hidden sm:block" />

                                <button 

                                    onClick={onClose}

                                    className="h-10 px-4 flex items-center justify-center rounded-xl border border-border/40 bg-background/80 text-xs font-bold text-muted-foreground/40 hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95 shadow-sm uppercase tracking-widest"

                                >

                                    ESC

                                </button>

                            </div>

                        </div>

                    </div>

                    

                    {/* Results Container */}

                    <div 

                        ref={scrollContainerRef}

                        className="max-h-140 overflow-y-auto p-6 custom-scrollbar bg-transparent"

                    >

                        {isLoading && totalResults.length === 0 ? (

                            <div className="py-24 flex flex-col items-center justify-center text-muted-foreground/40 animate-in fade-in duration-500">

                                <div className="relative">

                                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />

                                    <div className="relative h-20 w-20 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-6" />

                                </div>

                                <p className="text-lg font-bold tracking-tight text-foreground/60">Scanning Architecture...</p>

                                <p className="text-xs font-medium uppercase tracking-widest opacity-40 mt-2">Aggregating resources and docs</p>

                            </div>

                        ) : totalResults.length > 0 ? (

                            <div className="space-y-8">

                                {/* Jobs Section */}

                                {filteredJobs.length > 0 && (

                                    <div className="space-y-3">

                                        <div className="px-5 py-1 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.3em] text-primary">

                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />

                                            Forensic History

                                        </div>

                                        <div className="space-y-2">

                                            {filteredJobs.map((j, idx) => (

                                                <button

                                                    key={`job-${j.id}`}

                                                    onClick={() => handleSelectJob(j.id)}

                                                    onMouseEnter={() => setSelectedIndex(idx)}

                                                    className={cn(

                                                        "w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all duration-500 group text-left relative overflow-hidden",

                                                        selectedIndex === idx 

                                                            ? "bg-primary/10 border border-primary/20 shadow-xl shadow-primary/5 translate-x-2" 

                                                            : "hover:bg-muted/30 border border-transparent"

                                                    )}

                                                >

                                                    <div className="flex items-center gap-5 relative z-10">

                                                        <div className={cn(

                                                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 border shadow-inner",

                                                            selectedIndex === idx ? "bg-primary border-primary text-primary-foreground rotate-6 scale-110 shadow-lg shadow-primary/20" : "bg-muted/40 text-muted-foreground border-border/40"

                                                        )}>

                                                            <Hash className="h-6 w-6" />

                                                        </div>

                                                        <div className="flex flex-col gap-1">

                                                            <span className="text-base font-bold font-mono tracking-tight text-foreground">Execution #{j.id}</span>

                                                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold uppercase tracking-tight">

                                                                <span className={cn(

                                                                    j.status === 'success' ? "text-emerald-500" : "text-destructive"

                                                                )}>{j.status}</span>

                                                                <span className="h-1 w-1 rounded-full bg-border" />

                                                                <span className="opacity-40">Pipeline {j.pipeline_id}</span>

                                                            </div>

                                                        </div>

                                                    </div>

                                                    <ChevronRight className={cn(

                                                        "h-5 w-5 transition-all duration-500",

                                                        selectedIndex === idx ? "text-primary opacity-100 translate-x-0" : "text-muted-foreground opacity-0 -translate-x-4"

                                                    )} />

                                                    {selectedIndex === idx && (

                                                        <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent pointer-events-none" />

                                                    )}

                                                </button>

                                            ))}

                                        </div>

                                    </div>

                                )}

    

                                {/* Pipelines Section */}

                                {filteredPipelines.length > 0 && (

                                    <div className="space-y-3">

                                        <div className="px-5 py-1 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.3em] text-blue-500">

                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />

                                            Data Pipelines

                                        </div>

                                        <div className="space-y-2">

                                            {filteredPipelines.map((p, idx) => {

                                                const actualIdx = idx + filteredJobs.length;

                                                return (

                                                    <button

                                                        key={`pipe-${p.id}`}

                                                        onClick={() => handleSelectPipeline(p.id)}

                                                        onMouseEnter={() => setSelectedIndex(actualIdx)}

                                                        className={cn(

                                                            "w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all duration-500 group text-left relative overflow-hidden",

                                                            selectedIndex === actualIdx 

                                                                ? "bg-blue-500/10 border border-blue-500/20 shadow-xl shadow-blue-500/5 translate-x-2" 

                                                                : "hover:bg-muted/30 border border-transparent"

                                                        )}

                                                    >

                                                        <div className="flex items-center gap-5 relative z-10">

                                                            <div className={cn(

                                                                "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 border shadow-inner",

                                                                selectedIndex === actualIdx ? "bg-blue-500 border-blue-500 text-white rotate-6 scale-110 shadow-lg shadow-blue-500/20" : "bg-muted/40 text-muted-foreground border-border/40"

                                                            )}>

                                                                <Workflow className="h-6 w-6" />

                                                            </div>

                                                            <div className="flex flex-col gap-1">

                                                                <span className="text-base font-bold tracking-tight text-foreground">{p.name}</span>

                                                                <span className="text-xs text-muted-foreground/60 line-clamp-1 font-medium italic">{p.description || 'No description provided'}</span>

                                                            </div>

                                                        </div>

                                                        <ChevronRight className={cn(

                                                            "h-5 w-5 transition-all duration-500",

                                                            selectedIndex === actualIdx ? "text-blue-500 opacity-100 translate-x-0" : "text-muted-foreground opacity-0 -translate-x-4"

                                                        )} />

                                                        {selectedIndex === actualIdx && (

                                                            <div className="absolute inset-0 bg-linear-to-r from-blue-500/5 to-transparent pointer-events-none" />

                                                        )}

                                                    </button>

                                                );

                                            })}

                                        </div>

                                    </div>

                                )}

    

                                {/* Docs Section */}

                                {filteredDocs.length > 0 && (

                                    <div className="space-y-3">

                                        <div className="px-5 py-1 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-500">

                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />

                                            Knowledge Base

                                        </div>

                                        <div className="space-y-2">

                                            {filteredDocs.map((d, idx) => {

                                                const actualIdx = idx + filteredJobs.length + filteredPipelines.length;

                                                return (

                                                    <button

                                                        key={`doc-${d.href}`}

                                                        onClick={() => handleSelectDoc(d.href)}

                                                        onMouseEnter={() => setSelectedIndex(actualIdx)}

                                                        className={cn(

                                                            "w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all duration-500 group text-left relative overflow-hidden",

                                                            selectedIndex === actualIdx 

                                                                ? "bg-amber-500/10 border border-amber-500/20 shadow-xl shadow-amber-500/5 translate-x-2" 

                                                                : "hover:bg-muted/30 border border-transparent"

                                                        )}

                                                    >

                                                        <div className="flex items-center gap-5 relative z-10">

                                                            <div className={cn(

                                                                "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 border shadow-inner",

                                                                selectedIndex === actualIdx ? "bg-amber-500 border-amber-500 text-white rotate-6 scale-110 shadow-lg shadow-amber-500/20" : "bg-muted/40 text-muted-foreground border-border/40"

                                                            )}>

                                                                <Book className="h-6 w-6" />

                                                            </div>

                                                            <div className="flex flex-col gap-1">

                                                                <span className="text-base font-bold tracking-tight text-foreground">{d.title}</span>

                                                                <span className="text-xs text-muted-foreground/60 line-clamp-1 font-medium">{d.description || 'View documentation page'}</span>

                                                            </div>

                                                        </div>

                                                        <ChevronRight className={cn(

                                                            "h-5 w-5 transition-all duration-500",

                                                            selectedIndex === actualIdx ? "text-amber-500 opacity-100 translate-x-0" : "text-muted-foreground opacity-0 -translate-x-4"

                                                        )} />

                                                        {selectedIndex === actualIdx && (

                                                            <div className="absolute inset-0 bg-linear-to-r from-amber-500/5 to-transparent pointer-events-none" />

                                                        )}

                                                    </button>

                                                );

                                            })}

                                        </div>

                                    </div>

                                )}

                            </div>

                        ) : (

                            <div className="py-24 flex flex-col items-center justify-center text-muted-foreground/40 animate-in fade-in duration-500">

                                <div className="relative mb-8">

                                    <div className="absolute inset-0 bg-muted/20 blur-3xl rounded-full" />

                                    <Search className="relative h-20 w-20 opacity-10" />

                                    <Command className="absolute -bottom-3 -right-3 h-10 w-10 opacity-20" />

                                </div>

                                <p className="text-xl font-bold tracking-tight text-foreground/40">No matches discovered</p>

                                <p className="text-xs uppercase tracking-[0.2em] mt-3 font-bold opacity-30 text-center max-w-[240px] leading-relaxed">Try adjusting your search query for better results</p>

                            </div>

                        )}

                    </div>

    

                    {/* Footer with Hints */}

                    <div className="border-t border-border/20 px-8 py-5 flex items-center justify-between bg-muted/10 relative overflow-hidden">

                        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent opacity-50" />

                        <div className="flex items-center gap-8 relative z-10">

                            <div className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">

                                <kbd className="rounded-lg border border-border/40 bg-background/80 px-2 py-1 font-mono text-xs shadow-sm ring-1 ring-border/5">↵</kbd>

                                <span>Execute</span>

                            </div>

                            <div className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">

                                <kbd className="rounded-lg border border-border/40 bg-background/80 px-2 py-1 font-mono text-xs shadow-sm ring-1 ring-border/5">↑↓</kbd>

                                <span>Traverse</span>

                            </div>

                        </div>

                        <div className="flex items-center gap-3 relative z-10">

                            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />

                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/60">SynqX Omni</span>

                        </div>

                    </div>

                </DialogContent>

            </Dialog>

        );
};
