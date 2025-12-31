/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, searchUsers } from '@/lib/api'; // Renamed for clarity
import { PageMeta } from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Logs, Search, ArrowRight, ShieldAlert, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useZenMode } from '@/hooks/useZenMode';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLogListItem } from '@/components/features/audit/AuditLogListItem';

export const AuditLogsPage: React.FC = () => {
    const { isZenMode } = useZenMode();
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ eventType: 'all', userId: 'all' });
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>();
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(20);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['auditLogs', page, limit, filters, dateRange],
        queryFn: () => getAuditLogs(
            page * limit, 
            limit, 
            filters.userId === 'all' ? undefined : parseInt(filters.userId),
            filters.eventType === 'all' ? undefined : filters.eventType
            // Date range filtering would be added to getAuditLogs if supported by backend
        ),
        refetchInterval: 30000,
    });

    const { data: usersData } = useQuery({
        queryKey: ['users-search', ''],
        queryFn: () => searchUsers(''),
    });
    const users = usersData || [];

    const total = data?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const filteredLogs = useMemo(() => {
        const logs = data?.items || [];
        if (!logs) return [];
        return logs.filter(log =>
            log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [data?.items, searchQuery]);

    if (isError) {
        const status = (error as any)?.response?.status;
        const message = (error as any)?.response?.data?.detail || error.message;

        if (status === 403) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4" />
                    <h2 className="text-2xl font-bold">Permission Denied</h2>
                    <p className="text-muted-foreground mt-2 max-w-md">
                        You do not have the required permissions to view this page. Audit logs are restricted to administrators.
                    </p>
                </div>
            );
        }
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <XCircle className="w-16 h-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">Failed to Load Logs</h2>
                <p className="text-muted-foreground mt-2 max-w-md">{message}</p>
            </div>
        );
    }
    
    return (
        <motion.div 
            className={cn(
                "flex flex-col gap-6 md:gap-8 p-4 md:p-0",
                isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
            )}
        >
            <PageMeta title="Audit Trail" description="Review all administrative and system events." />

            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between px-1 shrink-0">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                            <Logs className="h-6 w-6 text-primary" />
                        </div>
                        Audit Trail
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
                        Track significant events across your workspace.
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                        <Input 
                            placeholder="Search events or details..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "h-11 w-[240px] justify-start text-left font-normal rounded-2xl bg-background/50",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} />
                            </PopoverContent>
                        </Popover>
                        
                        <Select value={filters.userId} onValueChange={(v) => setFilters(f => ({...f, userId: v}))}>
                            <SelectTrigger className="h-11 border-border/50 rounded-2xl bg-background/50 w-[180px] text-xs font-bold">
                                <SelectValue placeholder="Filter by User" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users?.map(user => (
                                    <SelectItem key={user.id} value={user.id.toString()}>{user.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                    <div className="col-span-12 md:col-span-5">Event</div>
                    <div className="col-span-2 hidden md:block">User</div>
                    <div className="col-span-4 hidden md:block">Target</div>
                    <div className="col-span-1 hidden md:block text-right">Status</div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                    {isLoading ? (
                        <div className="space-y-0 divide-y divide-border/30">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="p-4 space-y-2">
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground/50">
                            <Logs className="h-12 w-12 mb-4 opacity-20" />
                            <p className="font-bold text-sm">No matching audit logs</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {filteredLogs.map((log) => (
                                <AuditLogListItem key={log.id} log={log} users={users || []} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-muted-foreground font-medium pl-2">
                            Showing <span className="text-foreground">{Math.min((page + 1) * limit, total)}</span> of <span className="text-foreground">{total}</span>
                        </p>
                        <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(0); }}>
                            <SelectTrigger className="h-8 w-[140px] rounded-lg bg-background text-xs font-bold">
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
                        <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="rounded-xl h-8 px-3 text-xs font-bold">
                            Previous
                        </Button>
                        <div className="h-4 w-px bg-border/40 mx-2" />
                        <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-xl h-8 px-3 text-xs font-bold">
                            Next <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
