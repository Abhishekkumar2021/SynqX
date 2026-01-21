import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Terminal, Download, RefreshCw, X, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api/connections'
import { useParams } from 'react-router-dom'

interface OSDUWorkflowLogViewerProps {
  run: any | null
  onClose: () => void
}

export const OSDUWorkflowLogViewer: React.FC<OSDUWorkflowLogViewerProps> = ({ run, onClose }) => {
  const { id: connectionId } = useParams<{ id: string }>()

  const {
    data: logs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['osdu', 'workflow-logs', connectionId, run?.runId],
    queryFn: () =>
      getConnectionMetadata(parseInt(connectionId!), 'get_workflow_run_logs', {
        workflow_name: run.workflowName,
        run_id: run.runId,
      }),
    enabled: !!run,
  })

  const downloadLogs = () => {
    if (!logs) return
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `osdu-log-${run.workflowName}-${run.runId}.txt`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={!!run} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 rounded-[2.5rem] overflow-hidden border-border/40 bg-background/95 backdrop-blur-3xl shadow-2xl">
        <DialogHeader className="p-8 pb-6 border-b border-border/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-muted/10 border border-border/20 flex items-center justify-center text-foreground">
                <Terminal size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                    Execution Log
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-black border-border/40 uppercase h-5 px-2"
                  >
                    {run?.status}
                  </Badge>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-md">
                  Run ID: {run?.runId} • {run?.workflowName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 border-border/40"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 border-border/40"
                onClick={downloadLogs}
                disabled={!logs || isLoading}
              >
                <Download size={14} /> Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative overflow-hidden bg-black p-1">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Streaming buffer...
                </span>
              </div>
            ) : (
              <pre className="p-8 text-[11px] font-mono text-emerald-500/90 leading-relaxed whitespace-pre-wrap break-all">
                {logs || 'Buffer empty. No log entries returned from OSDU Workflow service.'}
              </pre>
            )}
          </ScrollArea>
        </div>

        <div className="p-4 px-8 border-t border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">
            Internal Airflow Trace Hub v1.0.0
          </span>
          <Badge
            variant="outline"
            className="text-[9px] font-black uppercase border-border/40 opacity-40 px-3 h-6"
          >
            Log_Format: UTF-8
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
