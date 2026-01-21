import React from 'react'
import { ArrowLeft, X, Download, Fingerprint, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface InspectorHeaderProps {
  record: any
  isLoading: boolean
  onClose: () => void
  onDownload?: () => void
  onDelete?: () => void
  isDeleting?: boolean
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  record,
  isLoading,
  onClose,
  onDownload,
  onDelete,
  isDeleting,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <header className="h-16 px-6 border-b border-border/40 bg-muted/5 backdrop-blur-xl flex items-center justify-between shrink-0 relative z-20 transition-all duration-300">
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl hover:bg-muted active:scale-90 border border-border/40 shrink-0"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge
              variant="outline"
              className="text-[7px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary h-4"
            >
              Entity_ID
            </Badge>
            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider truncate">
              {record?.details?.kind}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground uppercase truncate leading-none mt-0.5">
            {isLoading ? 'Resolving Manifest...' : record?.details?.id?.split(':').pop()}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!isLoading && record && (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] font-bold uppercase p-2">
                  Delete Record
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {(record.details?.kind?.toLowerCase().includes('dataset--') ||
              record.details?.data?.DatasetProperties) && (
              <Button
                onClick={onDownload}
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-lg font-black uppercase tracking-widest text-[8px] gap-1.5"
              >
                <Download size={12} /> Download
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/40 shadow-sm"
                    onClick={() => copyToClipboard(record.details.id, 'Registry ID')}
                  >
                    <Fingerprint size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] font-bold uppercase p-2">
                  Copy Registry ID
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        <Separator orientation="vertical" className="h-5 mx-1.5 opacity-10" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
        >
          <X size={18} />
        </Button>
      </div>
    </header>
  )
}
