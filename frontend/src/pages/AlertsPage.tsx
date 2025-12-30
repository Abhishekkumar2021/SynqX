/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlertHistory, acknowledgeAlert } from '@/lib/api';
import { PageMeta } from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    Bell,
    CheckCheck,
    Search,
    Filter,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useZenMode } from '@/context/ZenContext';
import { AlertListItem } from '@/components/features/alerts/AlertListItem';

export const AlertsPage: React.FC = () => {
    const { isZenMode } = useZenMode();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(20);

    const { data, isLoading } = useQuery({
        queryKey: ['alerts-history', page, limit],
        queryFn: () => getAlertHistory(page * limit, limit),
        refetchInterval: 10000,
    });

    const alerts = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const acknowledgeAllMutation = useMutation({
        mutationFn: async () => {
            const pending = alerts?.filter(a => a.status === 'pending') || [];
            await Promise.all(pending.map(a => acknowledgeAlert(a.id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts-history'] });
            toast.success('All alerts acknowledged');
        }
    });

    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            const matchesSearch = alert.message.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [alerts, searchQuery, statusFilter]);

    const pendingCount = alerts?.filter(a => a.status === 'pending').length || 0;

    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-6 md:gap-8 p-4 md:p-0",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Alerts History" description="View and manage system alerts." />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between px-1 shrink-0">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <Bell className="h-6 w-6 text-primary" />
                        </div>
                        Alerts
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                        Monitoring system events across your infrastructure.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-300 shadow-sm font-bold"
                            onClick={() => acknowledgeAllMutation.mutate()}
                            disabled={acknowledgeAllMutation.isPending}
                        >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Acknowledge All ({pendingCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                
                {/* Toolbar */}
                <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                        <Input 
                            placeholder="Search alerts..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-background/50 border border-border/40 rounded-2xl px-3 py-1.5 h-11 shadow-sm">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 text-xs font-bold w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* List Header (Sticky Grid) */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                    <div className="col-span-12 md:col-span-5">Alert Details</div>
                    <div className="col-span-2 hidden md:block">Pipeline</div>
                    <div className="col-span-2 hidden md:block">Job Trace</div>
                    <div className="col-span-2 hidden md:block">Timestamp</div>
                    <div className="col-span-1 hidden md:block text-right pr-4">Actions</div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="space-y-0 divide-y divide-border/30">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-20 w-full animate-pulse bg-muted/10" />
                            ))}
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground/50">
                            <Bell className="h-12 w-12 mb-4 opacity-20" />
                            <p className="font-bold text-sm">No alerts found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {filteredAlerts.map((alert) => (
                                <AlertListItem key={alert.id} alert={alert} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Pagination */}
                <div className="p-4 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-muted-foreground font-medium pl-2">
                            Showing <span className="text-foreground">{Math.min((page + 1) * limit, total)}</span> of <span className="text-foreground">{total}</span>
                        </p>
                        <Select 
                            value={limit.toString()}
                            onValueChange={(val) => { setLimit(Number(val)); setPage(0); }}
                        >
                            <SelectTrigger className="h-8 w-[140px] rounded-lg border-border/40 bg-background text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 per page</SelectItem>
                                <SelectItem value="20">20 per page</SelectItem>
                                <SelectItem value="50">50 per page</SelectItem>
                                <SelectItem value="100">100 per page</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="rounded-xl h-8 px-3 text-xs font-bold hover:bg-background shadow-none"
                        >
                            Previous
                        </Button>
                        <div className="h-4 w-px bg-border/40 mx-2" />
                        <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="rounded-xl h-8 px-3 text-xs font-bold hover:bg-background shadow-none"
                        >
                            Next <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
