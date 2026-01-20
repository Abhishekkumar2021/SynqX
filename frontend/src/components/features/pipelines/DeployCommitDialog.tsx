import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Rocket, Info, CheckCircle2 } from 'lucide-react'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'

interface DeployCommitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (notes: string) => void
  isSaving: boolean
}

export const DeployCommitDialog: React.FC<DeployCommitDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isSaving,
}) => {
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    if (!notes.trim()) {
      toast.error('Release notes required', {
        description: 'Please provide a brief description of your changes.',
      })
      return
    }
    onConfirm(notes)
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 rounded-[2rem] bg-background/95 backdrop-blur-2xl border-border/40 shadow-2xl overflow-hidden p-0 ring-1 ring-white/5">
        <div className="h-2 bg-primary w-full animate-pulse" />

        <div className="p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Deploy to Production
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                  Creating Immutable Version Snapshot
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="notes"
                  className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Release Notes
                </Label>
                <span className="text-[10px] text-muted-foreground/60 font-medium ">
                  Highly Recommended
                </span>
              </div>
              <div className="relative group min-h-[120px]">
                <CodeBlock
                  code={notes}
                  onChange={setNotes}
                  language="text"
                  editable
                  rounded
                  maxHeight="200px"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-primary leading-tight">System Notice</p>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    This deployment will create an immutable snapshot. You can rollback to this
                    exact state at any time via the History tab.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl h-12 font-bold uppercase tracking-widest text-[10px]"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex-1 rounded-xl h-12 font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:shadow-primary/40 transition-all gap-2"
            >
              {isSaving ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Publish & Live
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
