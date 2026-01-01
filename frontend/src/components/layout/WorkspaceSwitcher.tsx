import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronsUpDown,
    Check,
    PlusCircle,
    Building2,
    Settings2,
    Loader2,
    Download,
    Search,
    ArrowRight,
    RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/hooks/useWorkspace';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import { AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

interface WorkspaceSwitcherProps {
    variant?: 'header' | 'sidebar';
    isCollapsed?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ variant = 'header', isCollapsed = false }) => {
    const navigate = useNavigate();
    const { workspaces, activeWorkspace, switchActiveWorkspace, downloadWorkspaceContext, refreshWorkspaces, isSwitching, isLoading } = useWorkspace();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredWorkspaces = useMemo(() => {
        return workspaces.filter(ws => 
            ws.name.toLowerCase().includes(search.toLowerCase()) ||
            ws.role.toLowerCase().includes(search.toLowerCase())
        );
    }, [workspaces, search]);

    if (!activeWorkspace && workspaces.length === 0) return null;

    const SwitcherTrigger = (
        <button className={cn(
            "flex items-center gap-3 rounded-2xl transition-all duration-300 outline-none group",
            variant === 'header' 
                ? "px-3 py-1.5 border border-border/60 bg-background/40 hover:bg-muted/30 hover:border-primary/30 min-w-48"
                : cn(
                    "w-full p-2",
                    isCollapsed 
                        ? "h-10 w-10 justify-center bg-primary/10 border border-primary/20 text-primary" 
                        : "h-14 bg-muted/20 border border-border/40 hover:border-primary/30 hover:bg-primary/5"
                  )
        )}>
            <div className={cn(
                "flex shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                variant === 'header' ? "h-6 w-6 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" :
                isCollapsed ? "h-6 w-6" : "h-9 w-9 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            )}>
                {isSwitching || isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
            </div>

            {(!isCollapsed || variant === 'header') && (
                <div className="flex flex-1 flex-col items-start overflow-hidden whitespace-nowrap">
                    {variant === 'sidebar' && <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 leading-none mb-1">Workspace</span>}
                    <span className={cn(
                        "font-bold truncate text-left",
                        variant === 'header' ? "text-[11px]" : "text-sm w-32"
                    )}>
                        {activeWorkspace?.name || 'Select Workspace'}
                    </span>
                </div>
            )}

            {(!isCollapsed || variant === 'header') && <ChevronsUpDown className="h-3.5 w-3.5 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />}
        </button>
    );

    return (
        <div className={cn(variant === 'sidebar' && "px-2 py-2", variant === 'sidebar' && !isCollapsed && "px-4")}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {SwitcherTrigger}
                </DropdownMenuTrigger>

                <DropdownMenuContent 
                    align={variant === 'sidebar' && isCollapsed ? "start" : "center"} 
                    side={variant === 'sidebar' && isCollapsed ? "right" : "bottom"}
                    sideOffset={12}
                    className="w-72 rounded-[1.5rem] glass-card shadow-2xl p-2 border-border/40 bg-background/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="px-2 py-2 mb-2">
                        <div className="relative group">
                            <Search className="z-20 absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Search workspaces..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 pl-8 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/10 mb-1">
                        <DropdownMenuLabel className="p-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                            {search ? 'Search Results' : 'My Workspaces'}
                        </DropdownMenuLabel>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded-md hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                refreshWorkspaces();
                            }}
                            title="Refresh Workspace List"
                        >
                            <RotateCcw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 py-1">
                        <AnimatePresence mode="popLayout">
                            {filteredWorkspaces.map((ws) => (
                                <DropdownMenuItem 
                                    key={ws.id} 
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 cursor-pointer group",
                                        activeWorkspace?.id === ws.id ? "bg-primary/10 text-primary" : "focus:bg-muted/50"
                                    )}
                                    onClick={() => switchActiveWorkspace(ws.id)}
                                >
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center border transition-all duration-300",
                                        activeWorkspace?.id === ws.id 
                                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                            : "bg-muted border-border/40 group-hover:border-primary/30"
                                    )}>
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-1 flex-col overflow-hidden">
                                        <span className="text-sm font-bold truncate leading-tight">{ws.name}</span>
                                        <span className="text-[10px] font-medium opacity-50 uppercase tracking-tighter">{ws.role}</span>
                                    </div>
                                    {activeWorkspace?.id === ws.id ? (
                                        <Check className="h-4 w-4 text-primary animate-in zoom-in duration-300" />
                                    ) : (
                                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-all -translate-x-2 group-hover:translate-x-0" />
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </AnimatePresence>
                        
                        {filteredWorkspaces.length === 0 && (
                            <div className="py-8 text-center">
                                <p className="text-xs text-muted-foreground font-medium">No workspaces found</p>
                            </div>
                        )}
                    </div>

                    <DropdownMenuSeparator className="bg-border/40 mx-1 my-2" />
                    
                    <div className="grid gap-1">
                        <DropdownMenuItem 
                            className="p-2 rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer transition-colors group"
                            onClick={downloadWorkspaceContext}
                        >
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mr-1">
                                <Download className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold leading-tight">Download Context</span>
                                <span className="text-[9px] opacity-50 font-medium">Export environment bundle</span>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            className="p-2 rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer transition-colors group"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mr-1">
                                <PlusCircle className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold leading-tight">Create Workspace</span>
                                <span className="text-[9px] opacity-50 font-medium">Launch a new environment</span>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            className="p-2 rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer transition-colors group"
                            onClick={() => navigate('/settings')}
                        >
                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mr-1">
                                <Settings2 className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold leading-tight">Preferences</span>
                                <span className="text-[9px] opacity-50 font-medium">Customize your experience</span>
                            </div>
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateWorkspaceDialog 
                open={createDialogOpen} 
                onOpenChange={setCreateDialogOpen} 
            />
        </div>
    );
};
