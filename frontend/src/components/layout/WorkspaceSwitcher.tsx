import React, { useState, useMemo } from 'react';
import {
    ChevronsUpDown,
    Check,
    PlusCircle,
    Building2,
    Loader2,
    Download,
    Search,
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
            "flex items-center gap-2.5 rounded-xl transition-all duration-300 outline-none group",
            variant === 'header' 
                ? "px-2.5 py-1.5 border border-border/40 bg-background/40 hover:bg-background/60 hover:border-primary/30 min-w-44"
                : cn(
                    "w-full p-2",
                    isCollapsed 
                        ? "h-10 w-10 justify-center bg-primary/10 border border-primary/20 text-primary" 
                        : "h-12 bg-muted/10 border border-border/30 hover:border-primary/20 hover:bg-primary/5"
                  )
        )}>
            <div className={cn(
                "flex shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                variant === 'header' ? "h-6 w-6 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" :
                isCollapsed ? "h-6 w-6" : "h-8 w-8 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            )}>
                {isSwitching || isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
            </div>

            {(!isCollapsed || variant === 'header') && (
                <div className="flex flex-1 flex-col items-start overflow-hidden whitespace-nowrap mr-1">
                    <div className="flex items-center gap-2 mb-0.5 w-full">
                        <span className="text-[9px] font-medium uppercase tracking-widest text-primary/60 leading-none shrink-0">
                            Workspace
                        </span>
                        {activeWorkspace?.default_agent_group && (
                            <span className="ml-auto text-[8px] font-semibold uppercase tracking-tighter text-emerald-500 bg-emerald-500/10 px-1.5 py-px rounded border border-emerald-500/20 truncate max-w-16" title={`Agent: ${activeWorkspace.default_agent_group}`}>
                                {activeWorkspace.default_agent_group}
                            </span>
                        )}
                    </div>
                    <span className={cn(
                        "font-semibold truncate text-left",
                        variant === 'header' ? "text-[11px]" : "text-sm w-28"
                    )}>
                        {activeWorkspace?.name || 'Select Workspace'}
                    </span>
                </div>
            )}

            {(!isCollapsed || variant === 'header') && <ChevronsUpDown className="h-3 w-3 ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />}
        </button>
    );

    return (
        <div className={cn(variant === 'sidebar' && "px-2 py-2", variant === 'sidebar' && !isCollapsed && "px-2.5")}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {SwitcherTrigger}
                </DropdownMenuTrigger>

                <DropdownMenuContent 
                    align={variant === 'sidebar' && isCollapsed ? "start" : "center"} 
                    side={variant === 'sidebar' && isCollapsed ? "right" : "bottom"}
                    sideOffset={12}
                    className="w-64 rounded-xl glass-card shadow-2xl p-1 border-border/40 bg-background/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="px-2 py-2 mb-1">
                        <div className="relative group">
                            <Search className="z-20 absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Find workspace..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 pl-8 rounded-lg bg-muted/20 border-none focus-visible:ring-primary/20 text-xs font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1 mb-1">
                        <DropdownMenuLabel className="p-0 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                            {search ? 'Matches' : 'Environments'}
                        </DropdownMenuLabel>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 rounded-md hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                refreshWorkspaces();
                            }}
                        >
                            <RotateCcw className={cn("h-2.5 w-2.5", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                    
                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5 py-1">
                        <AnimatePresence mode="popLayout">
                            {filteredWorkspaces.map((ws) => (
                                <DropdownMenuItem 
                                    key={ws.id} 
                                    className={cn(
                                        "flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 cursor-pointer group",
                                        activeWorkspace?.id === ws.id ? "bg-primary/10 text-primary" : "focus:bg-muted/50"
                                    )}
                                    onClick={() => switchActiveWorkspace(ws.id)}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center border transition-all duration-300",
                                        activeWorkspace?.id === ws.id 
                                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                            : "bg-muted border-border/40 group-hover:border-primary/30"
                                    )}>
                                        <Building2 className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex flex-1 flex-col overflow-hidden">
                                        <span className="text-xs font-semibold truncate leading-tight">{ws.name}</span>
                                        <span className="text-[9px] font-medium opacity-50 uppercase tracking-tighter">{ws.role}</span>
                                    </div>
                                    {activeWorkspace?.id === ws.id && <Check className="h-3.5 w-3.5 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                        </AnimatePresence>
                    </div>

                    <DropdownMenuSeparator className="bg-border/10 mx-1 my-1" />
                    
                    <div className="p-1 space-y-0.5">
                        <DropdownMenuItem 
                            className="flex items-center gap-2.5 p-2 rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer transition-colors"
                            onClick={downloadWorkspaceContext}
                        >
                            <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Download className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-medium">Export Context</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            className="flex items-center gap-2.5 p-2 rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer transition-colors"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <PlusCircle className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-medium">New Workspace</span>
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
