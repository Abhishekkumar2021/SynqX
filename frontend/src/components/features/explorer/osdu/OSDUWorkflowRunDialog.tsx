import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Play, Loader2, AlertCircle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'

interface OSDUWorkflowRunDialogProps {
  workflow: any | null
  onClose: () => void
  onRun: (workflowName: string, payload: any) => void
  isRunning: boolean
}

export const OSDUWorkflowRunDialog: React.FC<OSDUWorkflowRunDialogProps> = ({
  workflow,
  onClose,
  onRun,
  isRunning,
}) => {
  const { theme } = useTheme()
  const [payload, setPayload] = useState<string>('')

  React.useEffect(() => {
    if (workflow && !payload) {
      setPayload(
        JSON.stringify(
          {
            runId: `synqx-manual-${Date.now()}`,
            executionContext: {
              Payload: {
                AppKey: 'test-app',
                data: {},
              },
              acl: {
                owners: [],
                viewers: [],
              },
              legal: {
                legaltags: [],
                otherRelevantDataCountries: ['US'],
                status: 'compliant',
              },
            },
          },
          null,
          2
        )
      )
    }
  }, [workflow])

  const handleRun = () => {
    try {
      const parsed = JSON.parse(payload)
      onRun(workflow.workflowName, parsed)
    } catch (e) {
      toast.error('Invalid Execution Context', {
        description: 'Please ensure your payload is valid JSON.',
      })
    }
  }

  return (
    <Dialog open={!!workflow} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 rounded-[2.5rem] overflow-hidden border-border/40 bg-background/95 backdrop-blur-3xl shadow-2xl">
        <DialogHeader className="p-8 pb-6 border-b border-border/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-600">
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  Trigger Ingestion
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-black border-yellow-500/20 text-yellow-600 uppercase h-5 px-2"
                >
                  {workflow?.workflowName}
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Configure Execution Context Payload
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/5 p-8">
          <div className="h-full flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <AlertCircle size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                The payload below will be passed to Airflow as the <code>dag_run.conf</code>
              </span>
            </div>
            <div className="flex-1 rounded-2xl border border-border/40 overflow-hidden bg-background shadow-inner">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={payload}
                onChange={(val) => setPayload(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 20 },
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-6 border-t border-border/10 bg-muted/5 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest"
            disabled={isRunning}
          >
            Abort
          </Button>
          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="h-12 px-10 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-white font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl shadow-yellow-500/20 active:scale-95 transition-all"
          >
            {isRunning ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Initializing DAG...
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" /> Commit & Trigger
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
