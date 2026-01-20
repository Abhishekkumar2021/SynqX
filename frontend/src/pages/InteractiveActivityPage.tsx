import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, PlayCircle, Cpu, ExternalLink, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { PageMeta } from '@/components/common/PageMeta'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getEphemeralActivity, clearEphemeralActivity } from '@/lib/api/ephemeral'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'
import { useZenMode } from '@/hooks/useZenMode'

// Registry Components
import { InteractiveHeader } from '@/components/features/interactive/InteractiveHeader'
import { InteractiveToolbar } from '@/components/features/interactive/InteractiveToolbar'
import { InteractiveList } from '@/components/features/interactive/InteractiveList'

export const InteractiveActivityPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { isZenMode } = useZenMode()

  // --- State ---
  const [filter, setFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filterType, setFilterType] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
   
  const [selectedJob, setSelectedJob] = useState<any | null>(null)

  // --- Data Fetching ---
  const { data: activity, isLoading } = useQuery({
    queryKey: ['ephemeral-activity', filterType],
    queryFn: () =>
      getEphemeralActivity({
        job_type: filterType === 'all' ? undefined : filterType,
      }),
    refetchInterval: 10000,
  })

  const clearMutation = useMutation({
    mutationFn: clearEphemeralActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ephemeral-activity'] })
      toast.success('Laboratory Purged', {
        description: 'All interactive activity history has been cleared.',
      })
    },
  })

  const filteredActivity = useMemo(() => {
    if (!activity) return []
    return activity.filter((a) => {
      const matchesSearch =
        a.job_type.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(a.payload).toLowerCase().includes(filter.toLowerCase()) ||
        a.agent_group?.toLowerCase().includes(filter.toLowerCase())

      const matchesAgent =
        agentFilter === 'all'
          ? true
          : agentFilter === 'internal'
            ? !a.agent_group
            : agentFilter === 'remote'
              ? !!a.agent_group
              : true

      return matchesSearch && matchesAgent
    })
  }, [activity, filter, agentFilter])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col h-full',
        isZenMode ? 'h-[calc(100vh-4rem)] gap-4' : 'gap-6 md:gap-8'
      )}
    >
      <PageMeta title="Interactive Lab" description="Registry of ephemeral ad-hoc tasks." />

      <InteractiveHeader onClear={() => clearMutation.mutate()} count={activity?.length} />

      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
        <InteractiveToolbar
          filter={filter}
          setFilter={setFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterType={filterType}
          setFilterType={setFilterType}
          agentFilter={agentFilter}
          setAgentFilter={setAgentFilter}
          count={filteredActivity.length}
        />

        <InteractiveList
          jobs={filteredActivity}
          isLoading={isLoading}
          viewMode={viewMode}
          onInspect={setSelectedJob}
        />
      </div>

      {/* Result Inspector */}
      <Dialog open={!!selectedJob} onOpenChange={(v) => !v && setSelectedJob(null)}>
        <DialogContent className="max-w-[95vw] xl:max-w-7xl rounded-3xl p-0 overflow-hidden border-border/40 bg-background/95 dark:bg-background/60 backdrop-blur-2xl shadow-2xl flex flex-col h-[90vh] outline-none">
          <VisuallyHidden.Root>
            <DialogTitle>Task Forensics: Job #{selectedJob?.id}</DialogTitle>
            <DialogDescription>
              Review detailed ad-hoc execution results and agent routing metrics.
            </DialogDescription>
          </VisuallyHidden.Root>

          {selectedJob && (
            <>
              <div className="px-10 py-6 border-b border-border/40 bg-muted/5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div
                      className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center ring-1 shadow-inner',
                        selectedJob.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20'
                          : 'bg-destructive/10 text-destructive ring-destructive/20'
                      )}
                    >
                      <PlayCircle size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                          Task Forensics
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase bg-muted/30 px-2 rounded-md border-border/40"
                        >
                          JOB #{selectedJob.id}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                          <Activity size={10} className="text-primary" /> {selectedJob.job_type}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                        <span className="flex items-center gap-1.5 text-foreground/80">
                          <Clock size={10} />{' '}
                          {format(new Date(selectedJob.created_at), 'MMMM d, yyyy • HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <ResultsGrid
                  data={
                    selectedJob.result_sample
                      ? {
                          results: selectedJob.result_sample.rows,
                          columns: selectedJob.result_summary?.columns || [],
                          count: selectedJob.result_sample.is_truncated
                            ? selectedJob.result_summary?.count
                            : selectedJob.result_sample.rows.length,
                          total_count: selectedJob.result_summary?.total_count,
                        }
                      : null
                  }
                  isLoading={false}
                  title="Materialized Data Fragment"
                  description={selectedJob.payload.query || selectedJob.payload.action}
                  variant="embedded"
                  noBorder
                  noBackground
                />
              </div>

              <div className="p-6 border-t border-border/20 bg-muted/10 shrink-0 flex items-center justify-between px-10 relative isolate">
                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
                <div className="flex items-center gap-8">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 leading-none">
                      Net Duration
                    </span>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {selectedJob.execution_time_ms || 0}ms
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 leading-none">
                      Payload Volume
                    </span>
                    <span className="text-sm font-bold uppercase tracking-tight text-foreground">
                      {selectedJob.result_summary?.count || 0} rows materialized
                    </span>
                  </div>
                  {selectedJob.agent_group && (
                    <div className="flex flex-col gap-0.5 border-l border-border/20 pl-8">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/40 leading-none">
                        Remote Executor
                      </span>
                      <span className="text-sm font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <Cpu size={14} /> {selectedJob.worker_id || selectedJob.agent_group}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  className="rounded-2xl h-12 px-8 font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-all hover:scale-[1.02] active:scale-95"
                  onClick={() => {
                    toast.info('Integration Logic Incoming', {
                      description:
                        'Ability to save this query as a reusable pipeline node is currently in development.',
                    })
                  }}
                >
                  <ExternalLink size={16} /> Deploy to Pipeline
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export default InteractiveActivityPage
