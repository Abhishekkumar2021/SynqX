/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getDashboardStats, getQuarantineList, getStepData } from '@/lib/api';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  AlertTriangle,
  Database,
  RefreshCw,
  Workflow,
  ArrowUpRight,
  History,
  Activity,
  ChevronRight,
  DatabaseZap,
  FileSearch,
  Eye,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { useZenMode } from '@/hooks/useZenMode';
import { PageMeta } from '@/components/common/PageMeta';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';
import { ViewToggle } from '@/components/common/ViewToggle';

// --- Sub-components ---

const QuarantineGridItem = ({ item, onInspect }: { item: any, onInspect: (item: any) => void }) => {
    const navigate = useNavigate();
    
    // Calculate a more realistic progress based on samples if available
    // or just use a default high-end aesthetic if ingress is unknown
    const rejectedCount = item.row_count || 0;
    const ingressCount = (item.sample_data?.in?.total_rows) || (rejectedCount * 1.2); 
    const percentage = Math.min(Math.round((rejectedCount / (ingressCount || 1)) * 100), 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="group relative"
        >
            <div className="relative flex flex-col rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 h-full">
                {/* Status Glow */}
                <div className="absolute -right-10 -top-10 h-32 w-32 bg-destructive/5 blur-3xl rounded-full transition-opacity group-hover:opacity-40" />
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center border bg-destructive/10 border-destructive/20 text-destructive group-hover:scale-105 transition-transform shadow-inner">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <h3 
                                className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                                onClick={() => onInspect(item)}
                            >
                                STEP-{item.step_id}
                            </h3>
                            <div 
                                className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); navigate(`/pipelines/${item.pipeline_id}`); }}
                            >
                                <Workflow className="h-3 w-3" /> {item.pipeline_name}
                            </div>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onInspect(item)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 flex flex-col gap-4 relative z-10">
                    <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-muted/30 border border-border/20 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Rejection Rate</span>
                                <span className="text-xl font-bold tabular-nums text-destructive tracking-tighter">{percentage}%</span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Total Rejected</span>
                                <span className="text-sm font-bold tabular-nums text-foreground">{formatNumber(item.row_count)}</span>
                            </div>
                        </div>
                        <div className="w-full bg-destructive/10 h-1.5 rounded-full mt-2 overflow-hidden ring-1 ring-destructive/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-destructive h-full rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                            />
                        </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                            <Database className="h-3 w-3 text-primary/60" /> {item.node_name}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground/60 flex items-center gap-1">
                            <History className="h-3 w-3" /> {formatRelativeTime(item.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const QuarantineListItem = ({ item, onInspect }: { item: any, onInspect: (item: any) => void }) => {
    const navigate = useNavigate();
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
                "group relative grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-muted/40 transition-all border-b border-border/30 last:border-0 cursor-pointer",
                "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                "before:bg-primary before:scale-y-0 before:transition-transform before:duration-200",
                "hover:before:scale-y-100"
            )}
            onClick={() => onInspect(item)}
        >
            <div className="col-span-12 md:col-span-4 flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 rounded-xl border flex items-center justify-center bg-destructive/10 border-destructive/20 text-destructive group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                    <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground tracking-tight truncate mb-0.5">STEP-{item.step_id}</h3>
                    <div className="flex items-center gap-2">
                        <span 
                            className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            onClick={(e) => { e.stopPropagation(); navigate(`/pipelines/${item.pipeline_id}`); }}
                        >
                            <Workflow className="h-2.5 w-2.5" /> {item.pipeline_name}
                        </span>
                    </div>
                </div>
            </div>

            <div className="col-span-3 hidden md:flex flex-col border-l border-border/20 pl-4">
                <span className="text-xs font-bold text-foreground/80 truncate">{item.node_name}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Database className="h-2.5 w-2.5 opacity-60" /> Source Node
                </span>
            </div>

            <div className="col-span-2 hidden md:flex flex-col items-center border-l border-border/20 pl-4">
                <span className="text-sm font-bold tabular-nums text-destructive tracking-tight">{formatNumber(item.row_count)}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Records</span>
            </div>

            <div className="col-span-2 hidden md:flex flex-col items-end border-l border-border/20 pl-4">
                <span className="text-[10px] font-bold text-foreground/70 whitespace-nowrap">{formatRelativeTime(item.created_at)}</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono">{format(new Date(item.created_at), 'MMM d, HH:mm')}</span>
            </div>

            <div className="col-span-1 flex justify-end pr-2">
                <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export const QuarantinePage = () => {
  const { isZenMode } = useZenMode();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inspectingItem, setInspectingItem] = useState<any | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // URL Synced State
  const searchQuery = searchParams.get('q') || '';
  const timeRange = searchParams.get('range') || 'all';
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'list';

  const setSearchQuery = (val: string) => {
    setSearchParams(prev => {
        if (val) prev.set('q', val);
        else prev.delete('q');
        return prev;
    });
  };

  const setViewMode = (val: 'grid' | 'list') => {
    setSearchParams(prev => {
        prev.set('view', val);
        return prev;
    });
  };

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: () => getDashboardStats(timeRange),
  });

  const { data: quarantineItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['quarantine-items'],
    queryFn: () => getQuarantineList(),
  });

  const { data: stepData, isLoading: isLoadingStepData } = useQuery({
    queryKey: ['step-quarantine-data', inspectingItem?.run_id, inspectingItem?.step_id],
    queryFn: () => getStepData(inspectingItem.run_id, inspectingItem.step_id, 'quarantine', 1000, 0),
    enabled: !!inspectingItem,
  });

  const isLoading = isLoadingStats || isLoadingItems;

  const filteredItems = (quarantineItems || []).filter((item: any) => 
    item.pipeline_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.node_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.step_id.toString().includes(searchQuery)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-6 md:gap-8 px-1",
        isZenMode ? "h-[calc(100vh-3rem)]" : "h-[calc(100vh-8rem)]"
      )}
    >
      <PageMeta title="Quarantine" description="Manage and resolve data quality issues and rejected records." />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between shrink-0 gap-6 px-1">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-2xl ring-1 ring-destructive/20 backdrop-blur-md shadow-sm">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              Quarantine
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
              Resolve data quality issues and monitor rejected records.
            </p>
          </div>

          {/* Compact Stats Bar */}
          <div className="flex items-center gap-8 flex-wrap pl-1">
            <div className="flex items-center gap-3 transition-all group">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive group-hover:scale-110 transition-transform shadow-sm shadow-destructive/5">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex flex-col -space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Rejected</span>
                    <span className="text-base font-bold tabular-nums text-destructive tracking-tighter">{formatNumber(stats?.total_rejected_rows || 0)}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3 transition-all group">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform shadow-sm shadow-amber-500/5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex flex-col -space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Issues</span>
                    <span className="text-base font-bold tabular-nums text-amber-500 tracking-tighter">{stats?.active_issues || 0}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 transition-all group">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/5">
                    <Activity className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex flex-col -space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Resolution</span>
                    <span className="text-base font-bold tabular-nums text-emerald-500 tracking-tighter">{stats?.resolution_rate || 0}%</span>
                </div>
            </div>

            <div className="flex items-center gap-3 transition-all group">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform shadow-sm shadow-primary/5">
                    <Workflow className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col -space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Active Flows</span>
                    <span className="text-base font-bold tabular-nums text-primary tracking-tighter">{stats?.active_pipelines || 0}</span>
                </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 shadow-sm h-10 border-border/40 hover:bg-muted/50" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" /> 
            <span className="font-bold text-xs">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
            <Input
              placeholder="Search by ID, Pipeline or Node..."
              className="pl-11 h-11 rounded-2xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between">
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
            {viewMode === 'list' && filteredItems.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                    <div className="col-span-12 md:col-span-4">Step & Pipeline</div>
                    <div className="col-span-3 hidden md:block">Node Source</div>
                    <div className="col-span-2 hidden md:block text-center">Rejected Records</div>
                    <div className="col-span-2 hidden md:block text-right">Captured At</div>
                    <div className="col-span-1"></div>
                </div>
            )}

            <div className="p-0">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className={cn("p-6", viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4")}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className={cn("rounded-2xl", viewMode === 'grid' ? "h-48 w-full" : "h-16 w-full")} />
                            ))}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="h-100 flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-3xl">
                                <FileSearch className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold">No quarantined data found</p>
                                <p className="text-sm text-muted-foreground max-w-xs">Try adjusting your filters or check back later after a pipeline run.</p>
                            </div>
                        </div>
                    ) : (
                        <div className={cn(
                            viewMode === 'grid' 
                                ? "p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8 pb-20 md:pb-6" 
                                : "divide-y divide-border/30 pb-20 md:pb-0"
                        )}>
                            {filteredItems.map((item: any) => (
                                viewMode === 'grid' 
                                    ? <QuarantineGridItem key={`${item.run_id}-${item.step_id}`} item={item} onInspect={setInspectingItem} />
                                    : <QuarantineListItem key={`${item.run_id}-${item.step_id}`} item={item} onInspect={setInspectingItem} />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      </div>

      {/* Inspection Dialog */}
      <Dialog open={!!inspectingItem} onOpenChange={(open) => { if(!open) { setInspectingItem(null); setIsMaximized(false); } }}>
        <DialogContent className={cn(
            "flex flex-col p-0 gap-0 overflow-hidden border-border/40 transition-all duration-300",
            isMaximized ? "max-w-[100vw] h-screen sm:rounded-none" : "max-w-7xl h-[90vh] sm:rounded-2xl"
        )}>
          <DialogHeader className="p-6 border-b border-border/40 bg-muted/30 shrink-0 relative pr-20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-lg shadow-destructive/5">
                <DatabaseZap className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <DialogTitle className="text-2xl font-bold tracking-tighter">
                        Inspect Quarantined Data
                    </DialogTitle>
                    <div 
                        className="p-1 rounded-md hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => navigate(`/jobs/${inspectingItem?.run_id}`)}
                        title="View Job Details"
                    >
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                <DialogDescription asChild className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors" onClick={() => navigate(`/pipelines/${inspectingItem?.pipeline_id}`)}>
                      <Workflow className="h-3.5 w-3.5" /> {inspectingItem?.pipeline_name}
                    </span>
                    <span className="h-3 w-px bg-border/60" />
                    <span className="flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" /> {inspectingItem?.node_name}
                    </span>
                    <span className="h-3 w-px bg-border/60" />
                    <span className="text-destructive font-bold">
                      {formatNumber(inspectingItem?.row_count || 0)} Rejected Records
                    </span>
                  </div>
                </DialogDescription>
              </div>
            </div>

            <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-muted"
                    onClick={() => setIsMaximized(!isMaximized)}
                >
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative">
            <ResultsGrid 
              data={stepData?.data ? {
                results: stepData.data.rows,
                columns: stepData.data.columns,
                count: stepData.data.total_cached
              } : null} 
              isLoading={isLoadingStepData} 
              hideHeader={false}
              isMaximized={isMaximized}
              title="Forensic Records"
              description="Sample of rejected data captured during execution"
              variant="embedded"
              noBorder
              noBackground
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};