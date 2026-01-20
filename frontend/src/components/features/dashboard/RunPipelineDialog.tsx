 
import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPipelines, triggerPipeline } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  Play,
  Sparkles,
  Workflow,
  CalendarClock,
  Search,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface RunPipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ViewMode = 'grid' | 'list'
type FilterStatus = 'All' | 'Active' | 'Paused' | 'Failed'

export const RunPipelineDialog: React.FC<RunPipelineDialogProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient()
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All')

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
    enabled: open,
  })

  const filteredPipelines = useMemo(() => {
    if (!pipelines) return []
    return pipelines.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesFilter = true
      if (activeFilter === 'Active') matchesFilter = p.status === 'active'
      if (activeFilter === 'Paused') matchesFilter = p.status === 'paused'
      if (activeFilter === 'Failed') matchesFilter = p.status === 'broken'

      return matchesSearch && matchesFilter
    })
  }, [pipelines, searchQuery, activeFilter])

  const runMutation = useMutation({
    mutationFn: (id: number) => triggerPipeline(id),
    onSuccess: (data) => {
      const pipelineName =
        pipelines?.find((p) => p.id.toString() === selectedPipelineId)?.name || 'Pipeline'
      toast.success('Pipeline Triggered', {
        description: `Successfully started execution for "${pipelineName}". Job ID: ${data.job_id}`,
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onOpenChange(false)
      setSelectedPipelineId('')
      setSearchQuery('')
    },
    onError: (err: any) => {
      toast.error('Trigger Failed', {
        description:
          err.response?.data?.detail?.message ||
          'There was an error starting the pipeline. Please try again.',
      })
    },
  })

  const handleRun = () => {
    if (!selectedPipelineId) return
    runMutation.mutate(parseInt(selectedPipelineId))
  }

  const selectedPipeline = pipelines?.find((p) => p.id.toString() === selectedPipelineId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 text-emerald-500'
      case 'paused':
        return 'bg-amber-500 text-amber-500'
      case 'failed':
      case 'broken':
        return 'bg-red-500 text-red-500'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-187.5 flex flex-col p-0 gap-0 overflow-hidden rounded-[2.5rem] border-border/60 glass-panel shadow-2xl backdrop-blur-3xl">
        {/* --- Header Section --- */}
        <div className="flex flex-col border-b border-border/40 shrink-0 bg-muted/5 relative overflow-hidden">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none select-none">
            <Workflow className="h-32 w-32 rotate-12" />
          </div>

          <div className="px-8 pt-8 pb-4 relative z-20">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  Trigger Pipeline
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground ml-1">
                  Select a pipeline to initiate a manual execution run.
                </DialogDescription>
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1 w-full group">
                <Search className="z-20 absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search pipelines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 rounded-xl bg-background/50 border-border/60 focus:bg-background focus:ring-primary/20 transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* Filters */}
                <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/40">
                  {(['All', 'Active', 'Paused', 'Failed'] as FilterStatus[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                        activeFilter === filter
                          ? 'bg-background text-primary shadow-sm ring-1 ring-border/10'
                          : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/40 shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      viewMode === 'grid'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      viewMode === 'list'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <ListIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Main Content --- */}
        <div className="flex-1 bg-background/30 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                  <span className="text-sm font-medium">Loading pipelines...</span>
                </div>
              ) : filteredPipelines.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredPipelines.map((p) => {
                      const isSelected = selectedPipelineId === p.id.toString()
                      const statusColor = getStatusColor(p.status)

                      return (
                        <motion.button
                          key={p.id}
                          onClick={() => setSelectedPipelineId(p.id.toString())}
                          layoutId={`card-${p.id}`}
                          className={cn(
                            'group relative flex flex-col items-start gap-4 p-5 rounded-3xl text-left transition-all duration-300 border',
                            isSelected
                              ? 'bg-primary/5 border-primary/50 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)] ring-1 ring-primary/20'
                              : 'bg-card/40 border-border/40 hover:bg-muted/40 hover:border-border hover:shadow-lg'
                          )}
                        >
                          <div className="flex items-start justify-between w-full">
                            <div
                              className={cn(
                                'h-12 w-12 rounded-2xl flex items-center justify-center border shadow-sm transition-all group-hover:scale-105 bg-background',
                                isSelected ? 'border-primary/20' : 'border-border/40'
                              )}
                            >
                              <Workflow
                                className={cn(
                                  'h-6 w-6',
                                  isSelected ? 'text-primary' : 'text-muted-foreground'
                                )}
                              />
                            </div>
                            {p.schedule_enabled && (
                              <Badge
                                variant="outline"
                                className="bg-background/50 border-border/50 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                              >
                                <CalendarClock className="h-3 w-3 mr-1" /> Scheduled
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1.5 w-full">
                            <h4
                              className={cn(
                                'font-bold text-sm tracking-tight transition-colors',
                                isSelected ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-medium opacity-80 h-8">
                              {p.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className="mt-auto pt-2 flex items-center justify-between w-full border-t border-border/30">
                            <div className="flex items-center gap-2 mt-2">
                              <div
                                className={cn('h-2 w-2 rounded-full', statusColor.split(' ')[0])}
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {p.status}
                              </span>
                            </div>
                            <div
                              className={cn(
                                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                                isSelected
                                  ? 'bg-primary text-primary-foreground opacity-100'
                                  : 'bg-transparent text-transparent opacity-0 group-hover:opacity-100 group-hover:text-primary group-hover:bg-primary/10'
                              )}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Play className="h-4 w-4 ml-0.5" />
                              )}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredPipelines.map((p) => {
                      const isSelected = selectedPipelineId === p.id.toString()
                      const statusColor = getStatusColor(p.status)

                      return (
                        <motion.button
                          key={p.id}
                          onClick={() => setSelectedPipelineId(p.id.toString())}
                          className={cn(
                            'group flex items-center gap-5 p-4 rounded-2xl text-left transition-all duration-200 border',
                            isSelected
                              ? 'bg-primary/5 border-primary/50 shadow-md ring-1 ring-primary/20'
                              : 'bg-card/40 border-border/40 hover:bg-muted/40 hover:border-border hover:shadow-md'
                          )}
                        >
                          <div
                            className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-all bg-background shrink-0',
                              isSelected ? 'border-primary/20' : 'border-border/40'
                            )}
                          >
                            <Workflow
                              className={cn(
                                'h-5 w-5',
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5">
                              <h4
                                className={cn(
                                  'font-bold text-sm tracking-tight truncate',
                                  isSelected ? 'text-primary' : 'text-foreground'
                                )}
                              >
                                {p.name}
                              </h4>
                            </div>
                            <div className="col-span-5">
                              <p className="text-[11px] text-muted-foreground truncate font-medium opacity-80">
                                {p.description || 'No description'}
                              </p>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/50 border border-border/50">
                                <div
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    statusColor.split(' ')[0]
                                  )}
                                />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'h-8 w-8 rounded-full flex items-center justify-center transition-all shrink-0 ml-2',
                              isSelected
                                ? 'bg-primary text-primary-foreground opacity-100'
                                : 'bg-transparent text-muted-foreground/30 opacity-0 group-hover:opacity-100'
                            )}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Play className="h-4 w-4 ml-0.5" />
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-100 text-center opacity-80">
                  <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-6 border border-border/50">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No pipelines found</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                    We couldn't find any pipelines matching your criteria. Try adjusting your search
                    or filters.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 rounded-xl"
                    onClick={() => {
                      setSearchQuery('')
                      setActiveFilter('All')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* --- Footer --- */}
        <DialogFooter className="p-6 border-t border-border/40 bg-muted/10 shrink-0 flex items-center justify-between z-20 gap-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-6 text-muted-foreground hover:text-foreground h-12"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {selectedPipeline && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="hidden md:flex items-center gap-3 mr-2 bg-background/50 px-4 py-2 rounded-xl border border-border/50"
                >
                  <span className="text-xs text-muted-foreground">Selected:</span>
                  <span className="text-sm font-bold text-primary">{selectedPipeline.name}</span>
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-mono">
                    #{selectedPipeline.id}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleRun}
              disabled={!selectedPipelineId || runMutation.isPending}
              className={cn(
                'rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20 transition-all gap-2.5 min-w-40',
                !selectedPipelineId
                  ? 'opacity-50 grayscale'
                  : 'hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              {runMutation.isPending ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Play className="h-4.5 w-4.5 fill-current" />
              )}
              {runMutation.isPending ? 'Starting...' : 'Run Pipeline'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
