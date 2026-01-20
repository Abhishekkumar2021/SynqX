import React from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Timer,
  Calendar,
  MoreVertical,
  Ban,
  ArrowRight,
  History,
  Activity,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { type Job, type Pipeline, cancelJob } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface JobsListProps {
  jobs: Job[]
  pipelines: Pipeline[]
  isLoading: boolean
  selectedJobId: number | null
  onSelect: (id: number) => void
  filter: string
  onFilterChange: (value: string) => void
}

export const JobsList: React.FC<JobsListProps> = ({
  jobs,
  pipelines,
  isLoading,
  selectedJobId,
  onSelect,
  filter,
  onFilterChange,
}) => {
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const queryClient = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      toast.success('Cancellation Requested')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: () => toast.error('Failed to cancel job'),
  })

  const filteredJobs = React.useMemo(() => {
    let result = jobs

    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter((j) => ['running', 'pending', 'queued'].includes(j.status))
      } else {
        result = result.filter((j) => j.status === statusFilter)
      }
    }

    // Search Filter
    if (filter) {
      const q = filter.toLowerCase()
      result = result.filter(
        (j) =>
          j.id.toString().includes(q) ||
          pipelines
            .find((p) => p.id === j.pipeline_id)
            ?.name.toLowerCase()
            .includes(q)
      )
    }

    return result
  }, [jobs, statusFilter, filter, pipelines])

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* --- Sidebar Header --- */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/20 shrink-0">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                <History className="h-4 w-4" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                Audit Registry
              </h3>
            </div>
            <Badge
              variant="outline"
              className="h-6 px-3 rounded-xl border-border/40 text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60 bg-muted/10 shadow-sm"
            >
              {filteredJobs.length} RUNS
            </Badge>
          </div>

          <div className="relative group">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-all duration-300" />
            <Input
              placeholder="Find execution or pipeline..."
              className="pl-10 h-10 rounded-xl bg-background/40 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="active" className="flex-1">
                Active
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex-1">
                Failed
              </TabsTrigger>
              <TabsTrigger value="success" className="flex-1">
                Success
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* --- Scrollable Card Stack --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border/20 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40 ">
            <Activity className="h-8 w-8 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Empty Registry</p>
          </div>
        ) : (
          filteredJobs.map((job: Job) => {
            const pipelineName =
              pipelines.find((p) => p.id === job.pipeline_id)?.name ||
              `Pipeline #${job.pipeline_id}`
            const isSelected = selectedJobId === job.id
            const isCancellable = ['running', 'pending', 'queued'].includes(job.status)

            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                className={cn(
                  'group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col gap-3',
                  isSelected
                    ? 'bg-primary/[0.03] border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10 backdrop-blur-xs'
                    : 'bg-card/40 border-border/40 hover:border-border/80 hover:bg-muted/20'
                )}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'text-[9px] font-bold font-mono tracking-tighter transition-colors px-2 py-0.5 rounded-md',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                      )}
                    >
                      RUN-{job.id}
                    </div>
                    <StatusBadge status={job.status} className="scale-75 origin-left shadow-none" />
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-all"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-xl border-border/60 shadow-lg p-1 backdrop-blur-xl"
                      >
                        <DropdownMenuItem
                          onClick={() => onSelect(job.id)}
                          className="rounded-lg font-medium text-xs py-2 cursor-pointer"
                        >
                          <ArrowRight className="mr-2 h-3.5 w-3.5 opacity-70" /> Inspect Run
                        </DropdownMenuItem>

                        {isCancellable && (
                          <>
                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelMutation.mutate(job.id)
                              }}
                              disabled={cancelMutation.isPending}
                              className="rounded-lg font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              <Ban className="mr-2 h-3.5 w-3.5 opacity-70" /> Abort Execution
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col gap-1 min-w-0">
                  <h4
                    className={cn(
                      'text-[13px] font-bold tracking-tight line-clamp-1 transition-colors',
                      isSelected ? 'text-primary' : 'text-foreground/90'
                    )}
                  >
                    {pipelineName}
                  </h4>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground/60">
                      <Calendar className="h-3 w-3 opacity-50" />
                      <span className="text-[10px] font-medium">
                        {job.started_at
                          ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                          : 'Pending'}
                      </span>
                    </div>
                    {job.execution_time_ms && (
                      <div className="flex items-center gap-1.5 text-muted-foreground/60 border-l border-border/20 pl-3">
                        <Timer className="h-3 w-3 opacity-50" />
                        <span className="text-[10px] font-mono font-bold">
                          {(job.execution_time_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    )}
                  </div>

                  {job.status === 'failed' && (
                    <ShieldAlert className="h-3 w-3 text-destructive animate-pulse" />
                  )}
                  {job.status === 'success' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 opacity-40" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
