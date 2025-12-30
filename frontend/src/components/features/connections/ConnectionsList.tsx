import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Database, MoreVertical, Pencil, Trash2,
    Activity, Loader2, ArrowRight, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface Connection {
    id: number;
    name: string;
    connector_type: string;
    health_status?: string;
    description?: string;
}

interface ConnectionsListProps {
    connections: Connection[];
    isLoading: boolean;
    viewMode: 'grid' | 'list';
    testingId: number | null;
    onTest: (id: number) => void;
    onEdit: (connection: Connection) => void;
    onDelete: (connection: Connection) => void;
}

const ConnectionCard = ({
    connection,
    testingId,
    onTest,
    onEdit,
    onDelete
}: {
    connection: Connection;
    testingId: number | null;
    onTest: (id: number) => void;
    onEdit: (connection: Connection) => void;
    onDelete: (connection: Connection) => void;
}) => {
    const navigate = useNavigate();
    const isTesting = testingId === connection.id;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative"
        >
            <div
                className={cn(
                    "relative flex flex-col rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 cursor-pointer h-full"
                )}
                onClick={() => navigate(`/connections/${connection.id}`)}
            >
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300",
                            "bg-primary/10 border-primary/20 text-primary group-hover:scale-105"
                        )}>
                            <Database className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
                                {connection.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-wider px-1.5 py-0 rounded-md border",
                                        connection.health_status === 'healthy'
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : connection.health_status === 'unhealthy' 
                                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                                : "bg-muted/50 text-muted-foreground border-border/50"
                                    )}
                                >
                                    {connection.health_status || 'Unknown'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-lg p-1">
                                <DropdownMenuItem onClick={() => navigate(`/connections/${connection.id}`)} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    <ArrowRight className="mr-2 h-3.5 w-3.5 opacity-70" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onTest(connection.id)} disabled={isTesting} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    {isTesting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5 opacity-70" />}
                                    Test Connection
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border/40 my-1" />
                                <DropdownMenuItem onClick={() => onEdit(connection)} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    <Pencil className="mr-2 h-3.5 w-3.5 opacity-70" /> Edit Configuration
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border/40 my-1" />
                                <DropdownMenuItem onClick={() => onDelete(connection)} className="rounded-lg font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                                    <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-medium min-h-[2.5em]">
                        {connection.description || 'No description provided.'}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/20">
                            <span className="uppercase tracking-wider">{connection.connector_type}</span>
                        </div>
                        
                        <Button
                            variant="ghost" 
                            size="sm"
                            className="h-7 text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 -mr-2"
                            onClick={(e) => { e.stopPropagation(); navigate(`/connections/${connection.id}`); }}
                        >
                            Details <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ConnectionRow = ({
    connection,
    testingId,
    onTest,
    onEdit,
    onDelete
}: {
    connection: Connection;
    testingId: number | null;
    onTest: (id: number) => void;
    onEdit: (connection: Connection) => void;
    onDelete: (connection: Connection) => void;
}) => {
    const navigate = useNavigate();
    const isTesting = testingId === connection.id;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="group"
        >
            <div
                className={cn(
                    "relative grid grid-cols-12 gap-4 items-center px-6 py-3.5 transition-all duration-200 cursor-pointer",
                    "border-b border-border/30 last:border-0 hover:bg-muted/40",
                    "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                    "before:bg-primary before:scale-y-0 before:transition-transform before:duration-200",
                    "hover:before:scale-y-100"
                )}
                onClick={() => navigate(`/connections/${connection.id}`)}
            >
                {/* Identity */}
                <div className="col-span-12 md:col-span-6 flex items-center gap-4 min-w-0">
                    <div className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-xs shrink-0",
                        "bg-muted/40 border-border/40 text-muted-foreground group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5"
                    )}>
                        <Database className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground tracking-tight truncate mb-0.5">
                            {connection.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground truncate font-medium">
                            {connection.description || <span className="italic opacity-50">No description</span>}
                        </p>
                    </div>
                </div>

                {/* Type */}
                <div className="col-span-3 hidden md:block">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/20 w-fit">
                        <span className="uppercase tracking-wider">{connection.connector_type}</span>
                    </div>
                </div>

                {/* Status / Actions */}
                <div className="col-span-3 hidden md:flex items-center justify-end gap-4 pr-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border",
                            connection.health_status === 'healthy'
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : connection.health_status === 'unhealthy' 
                                    ? "bg-destructive/10 text-destructive border-destructive/20"
                                    : "bg-muted/50 text-muted-foreground border-border/50"
                        )}
                    >
                        {connection.health_status || 'Unknown'}
                    </Badge>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTest(connection.id);
                            }}
                            disabled={isTesting}
                            className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-all"
                            title="Test Connection"
                        >
                            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                        </Button>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-lg p-1">
                                <DropdownMenuItem onClick={() => navigate(`/connections/${connection.id}`)} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    <ArrowRight className="mr-2 h-3.5 w-3.5 opacity-70" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onTest(connection.id)} disabled={isTesting} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    {isTesting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5 opacity-70" />}
                                    Test Connection
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border/40 my-1" />
                                <DropdownMenuItem onClick={() => onEdit(connection)} className="rounded-lg font-medium text-xs py-2 cursor-pointer">
                                    <Pencil className="mr-2 h-3.5 w-3.5 opacity-70" /> Edit Configuration
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border/40 my-1" />
                                <DropdownMenuItem onClick={() => onDelete(connection)} className="rounded-lg font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                                    <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const ConnectionsList: React.FC<ConnectionsListProps> = ({
    connections,
    isLoading,
    viewMode,
    testingId,
    onTest,
    onEdit,
    onDelete
}) => {
    if (isLoading) {
        return (
            <div className="flex-1 overflow-hidden p-6">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-6 border-b border-border/30">
                                <Skeleton className="h-8 w-8 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (connections.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                        <div className="relative h-20 w-20 rounded-3xl glass-card flex items-center justify-center mx-auto shadow-lg">
                            <Database className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground">No Connections Found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            Try adjusting your search or create a new connection to get started.
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
            {viewMode === 'list' && (
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0 sticky top-0 z-20 shadow-sm">
                    <div className="col-span-12 md:col-span-6">Connection</div>
                    <div className="col-span-3 hidden md:block">Type</div>
                    <div className="col-span-3 hidden md:block text-right">Status / Actions</div>
                </div>
            )}
            
            <div className="">
                <AnimatePresence mode="popLayout">
                    {viewMode === 'grid' ? (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {connections.map((connection) => (
                                <ConnectionCard
                                    key={connection.id}
                                    connection={connection}
                                    testingId={testingId}
                                    onTest={onTest}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {connections.map((connection) => (
                                <ConnectionRow
                                    key={connection.id}
                                    connection={connection}
                                    testingId={testingId}
                                    onTest={onTest}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};