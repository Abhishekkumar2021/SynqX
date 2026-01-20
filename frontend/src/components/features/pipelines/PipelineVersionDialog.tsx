 
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPipelineVersions, publishPipelineVersion, triggerPipeline } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  History as HistoryIcon,
  Play,
  Clock,
  ArrowUpCircle,
  Loader2,
  Eye,
  GitCompare,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface PipelineVersionDialogProps {
  pipelineId: number
  pipelineName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const PipelineVersionDialog: React.FC<PipelineVersionDialogProps> = ({
  pipelineId,
  pipelineName,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Diff Selection State
  const [compareBaseId, setCompareBaseId] = React.useState<number | null>(null)
  const [compareTargetId, setCompareTargetId] = React.useState<number | null>(null)

  const { data: versions, isLoading } = useQuery({
    queryKey: ['pipeline-versions', pipelineId],
    queryFn: () => getPipelineVersions(pipelineId),
    enabled: open,
  })

  const publishMutation = useMutation({
    mutationFn: (versionId: number) => publishPipelineVersion(pipelineId, versionId),
    onSuccess: () => {
      toast.success('Active version updated')
      queryClient.invalidateQueries({ queryKey: ['pipeline-versions', pipelineId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId.toString()] })
    },
    onError: (err: any) => {
      toast.error('Deployment failed', { description: err.response?.data?.detail?.message })
    },
  })

  const runMutation = useMutation({
    mutationFn: (versionId: number) => triggerPipeline(pipelineId, versionId),
    onSuccess: (data) => {
      toast.success('Execution started', { description: `Job ID: ${data.job_id}` })
      onOpenChange(false)
    },
  })

  const handleSelect = (vId: number) => {
    if (compareBaseId === vId) setCompareBaseId(null)
    else if (compareTargetId === vId) setCompareTargetId(null)
    else if (!compareBaseId) setCompareBaseId(vId)
    else if (!compareTargetId) setCompareTargetId(vId)
    else {
      // Shift logic: newest selection becomes target, old target becomes base
      setCompareBaseId(compareTargetId)
      setCompareTargetId(vId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] ring-1 ring-white/5">
        {/* Header */}
        <DialogHeader className="p-8 pr-16 pb-6 border-b border-border/40 bg-muted/10 shrink-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <HistoryIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="pr-4">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Snapshot Registry
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  {pipelineName} • Version Control System
                </DialogDescription>
              </div>
            </div>

            {compareBaseId && compareTargetId ? (
              <Button
                onClick={() => {
                  navigate(
                    `/pipelines/${pipelineId}?diff=true&base=${compareBaseId}&target=${compareTargetId}`
                  )
                  onOpenChange(false)
                }}
                className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 animate-in zoom-in duration-300 gap-2 shrink-0"
              >
                <GitCompare className="h-4 w-4" /> Compare Selected
              </Button>
            ) : (
              <div className="hidden md:flex flex-col items-end gap-1 px-4 py-2 rounded-xl bg-muted/20 border border-border/40 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Comparison Mode
                </span>
                <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                  Select two snapshots to visualize changes
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-background/50">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase">
                Synchronizing Snapshots
              </p>
            </div>
          ) : versions?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Clock className="h-16 w-16 mb-4 stroke-1" />
              <h3 className="text-lg font-bold">No versions recorded yet</h3>
              <p className="text-sm max-w-xs mx-auto mt-2">
                Deploy your first changes to initialize the version control history.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions?.map((version) => {
                const isSelected = compareBaseId === version.id || compareTargetId === version.id
                const selectionType = compareBaseId === version.id ? 'Base' : 'Target'

                return (
                  <div
                    key={version.id}
                    onClick={() => handleSelect(version.id)}
                    className={cn(
                      'group relative flex items-center gap-6 p-5 rounded-[1.5rem] border transition-all duration-300 cursor-pointer',
                      version.is_published
                        ? 'bg-primary/[0.03] border-primary/30 shadow-sm'
                        : 'bg-card border-border/40 hover:border-primary/20 hover:bg-muted/20',
                      isSelected && 'border-primary ring-1 ring-primary/40 bg-primary/[0.05]'
                    )}
                  >
                    {/* Checkmark indicator (Relocated) */}
                    <div
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center shrink-0',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground scale-110'
                          : 'bg-transparent border-border/40 group-hover:border-primary/40'
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <div className="h-1 w-1 rounded-full bg-border group-hover:bg-primary/40" />
                      )}
                    </div>

                    {/* Visual Timeline Marker */}
                    <div
                      className={cn(
                        'h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center border-2 transition-all duration-500',
                        version.is_published
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                          : 'bg-muted/30 text-muted-foreground border-border/40 group-hover:border-primary/40'
                      )}
                    >
                      <span className="text-base font-bold ">v{version.version}</span>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        {version.is_published && (
                          <Badge className="bg-primary text-[8px] font-bold uppercase tracking-widest h-4">
                            Live Now
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="border-primary text-primary text-[8px] font-bold uppercase tracking-widest h-4"
                          >
                            {selectionType}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.created_at), 'MMM d, yyyy • HH:mm')}
                        </div>
                      </div>

                      {/* Commit Note */}
                      <div className="flex items-start gap-2 max-w-[90%]">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
                        <p className="text-sm font-semibold tracking-tight text-foreground/80 truncate">
                          {version.version_notes || 'No release notes provided'}
                        </p>
                      </div>
                    </div>

                    {/* Stats Pill */}
                    <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-xl bg-muted/20 border border-border/40">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-primary">
                          {version.node_count}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">
                          Nodes
                        </span>
                      </div>
                      <div className="w-px h-4 bg-border/40" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-primary">
                          {version.edge_count}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">
                          Edges
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                              onClick={() => {
                                navigate(`/pipelines/${pipelineId}?version=${version.version}`)
                                onOpenChange(false)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Inspect Snapshot</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 transition-all active:scale-90"
                              onClick={() => runMutation.mutate(version.id)}
                              disabled={runMutation.isPending}
                            >
                              {runMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 fill-current" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Execute v{version.version}</TooltipContent>
                        </Tooltip>

                        {!version.is_published && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all active:scale-90"
                                onClick={() => publishMutation.mutate(version.id)}
                                disabled={publishMutation.isPending}
                              >
                                {publishMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowUpCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restore & Publish</TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
