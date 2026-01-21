import React, { useState } from 'react'
import {
  Zap,
  Play,
  Clock,
  Search,
  RefreshCw,
  MoreVertical,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api/connections'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { OSDUWorkflowRunDialog } from './OSDUWorkflowRunDialog'
import { OSDUWorkflowLogViewer } from './OSDUWorkflowLogViewer'
import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { cn } from '@/lib/utils'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

interface OSDUWorkflowViewProps {
  workflows: any[]
}

export const OSDUWorkflowView: React.FC<OSDUWorkflowViewProps> = ({ workflows }) => {
  const { id: connectionId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null)
  const [selectedRunForLogs, setSelectedRunForLogs] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'workflows' | 'history'>('workflows')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredWorkflows = useFuzzySearch(workflows, searchQuery, {
    keys: ['workflowName'],
    threshold: 0.3,
  })

  // --- Mutations ---
  const triggerMutation = useMutation({
    mutationFn: async ({ workflowName, payload }: { workflowName: string; payload: any }) => {
      return getConnectionMetadata(parseInt(connectionId!), 'trigger_workflow', {
        workflow_name: workflowName,
        payload,
      })
    },
    onSuccess: (data) => {
      toast.success('Workflow Triggered', {
        description: `Run ID: ${data.runId}`,
      })
      setSelectedWorkflow(null)
      queryClient.invalidateQueries({ queryKey: ['osdu', 'workflow-runs'] })
    },
    onError: (err: any) => {
      toast.error('Trigger Failed', { description: err.message })
    },
  })

  // --- Run History Query ---
  const { data: allRuns = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['osdu', 'workflow-runs', connectionId],
    queryFn: async () => {
      // Fetch runs for the first few workflows to populate a global history view
      const runPromises = workflows.slice(0, 5).map((wf) =>
        getConnectionMetadata(parseInt(connectionId!), 'list_workflow_runs', {
          workflow_name: wf.workflowName,
        })
      )
      const results = await Promise.all(runPromises)
      // Flatten and sort by date
      return results
        .flat()
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    },
    enabled: !!connectionId && activeTab === 'history',
  })

  return (
    <div className="h-full flex flex-col bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader
        icon={Zap}
        title="Orchestration Hub"
        subtitle="OSDU Airflow Workflows"
        iconColor="text-yellow-500"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Find workflows or runs..."
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['osdu', 'workflow'] })}
        totalCount={activeTab === 'workflows' ? filteredWorkflows.length : allRuns.length}
        countLabel={activeTab === 'workflows' ? 'Workflows' : 'Runs'}
      >
        <div className="flex bg-muted/20 rounded-xl p-1 border border-border/20">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 px-4 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all',
              activeTab === 'workflows'
                ? 'bg-background shadow-sm text-primary'
                : 'text-muted-foreground opacity-60'
            )}
            onClick={() => setActiveTab('workflows')}
          >
            Definitions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 px-4 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all',
              activeTab === 'history'
                ? 'bg-background shadow-sm text-primary'
                : 'text-muted-foreground opacity-60'
            )}
            onClick={() => setActiveTab('history')}
          >
            Global History
          </Button>
        </div>
      </OSDUPageHeader>

      <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2">
        <ScrollArea className="h-full">
          {activeTab === 'workflows' ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1600px] mx-auto pb-32">
              {filteredWorkflows.map((wf) => (
                <Card
                  key={wf.workflowName}
                  className="bg-background/40 backdrop-blur-md border-border/40 hover:border-yellow-500/30 transition-all duration-500 group overflow-hidden rounded-[2rem]"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform">
                        <Zap size={20} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl opacity-40 hover:opacity-100"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </div>

                    <div className="space-y-1 mb-6">
                      <h3 className="font-black text-xl tracking-tight uppercase truncate">
                        {wf.workflowName}
                      </h3>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                        {wf.description || 'System-registered Airflow DAG'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/10 shadow-inner">
                        <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1.5 mb-1">
                          <Clock size={10} /> Registered
                        </span>
                        <p className="text-[11px] font-black truncate">
                          {wf.creationInvocationTimestamp
                            ? new Date(wf.creationInvocationTimestamp).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/10 shadow-inner">
                        <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1.5 mb-1">
                          <Zap size={10} /> Mode
                        </span>
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[9px] font-black uppercase border-yellow-500/20 text-yellow-600"
                        >
                          INTERNAL
                        </Badge>
                      </div>
                    </div>

                    <Button
                      className="w-full rounded-2xl h-11 gap-2 font-black uppercase text-[11px] tracking-widest bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20"
                      onClick={() => setSelectedWorkflow(wf)}
                    >
                      <Play size={14} fill="currentColor" /> Trigger DAG
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="w-full transition-all duration-500">
              <div className="bg-card overflow-hidden">
                <div className="p-6 px-8 border-b border-border/10 bg-muted/5 flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2">
                    <History size={16} /> Recent Execution Runs
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-black border-border/40">
                    Total Runs: {allRuns.length}
                  </Badge>
                </div>

                <div className="divide-y divide-border/5">
                  {isLoadingHistory ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                        Aggregating DAG status...
                      </span>
                    </div>
                  ) : allRuns.length === 0 ? (
                    <div className="py-20 text-center opacity-40">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]">
                        No execution history found.
                      </p>
                    </div>
                  ) : (
                    allRuns.map((run: any) => (
                      <div
                        key={run.runId}
                        className="p-6 px-8 flex items-center justify-between hover:bg-muted/10 transition-colors group"
                      >
                        <div className="flex items-center gap-6 min-w-0">
                          <div
                            className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm shrink-0',
                              run.status === 'finished'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : run.status === 'failed'
                                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                                  : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            )}
                          >
                            {run.status === 'finished' ? (
                              <CheckCircle2 size={18} />
                            ) : run.status === 'failed' ? (
                              <XCircle size={18} />
                            ) : (
                              <RefreshCw size={18} className="animate-spin" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-black text-base uppercase tracking-tight truncate">
                                {run.workflowName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-black h-4 px-1.5 opacity-40"
                              >
                                {run.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-[11px] font-bold text-muted-foreground truncate uppercase tracking-widest">
                              Run ID: {run.runId} • Initiated:{' '}
                              {new Date(run.startTime).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            onClick={() => setSelectedRunForLogs(run)}
                          >
                            View Logs
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreVertical size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      <OSDUWorkflowRunDialog
        workflow={selectedWorkflow}
        onClose={() => setSelectedWorkflow(null)}
        isRunning={triggerMutation.isPending}
        onRun={(name, payload) => triggerMutation.mutate({ workflowName: name, payload })}
      />

      <OSDUWorkflowLogViewer run={selectedRunForLogs} onClose={() => setSelectedRunForLogs(null)} />
    </div>
  )
}
