import React from 'react'
import { Save, Copy, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface NodePropertiesFooterProps {
  isEditor: boolean
  isAdmin: boolean
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}

export const NodePropertiesFooter: React.FC<NodePropertiesFooterProps> = ({
  isEditor,
  isAdmin,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  return (
    <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center gap-3 backdrop-blur-md shrink-0">
      {isEditor && (
        <Button
          type="submit"
          className="flex-1 rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
        >
          <Save size={14} className="mr-2" /> Save Config
        </Button>
      )}
      {isEditor && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onDuplicate}
          className="h-10 w-10 rounded-xl"
        >
          <Copy size={16} />
        </Button>
      )}
      {isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-muted-foreground/40 hover:text-destructive"
            >
              <Trash2 size={18} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl border-border/40 backdrop-blur-2xl bg-background/95 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold uppercase tracking-tighter">
                De-provision Node?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-sm">
                This will permanently remove the operator.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-6">
              <AlertDialogCancel className="rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest border-border/40">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete()
                  onClose()
                }}
                className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest"
              >
                Delete Operator
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
