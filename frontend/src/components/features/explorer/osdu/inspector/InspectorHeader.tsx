import React from 'react'
import {
  ArrowLeft,
  X,
  Download,
  Fingerprint,
} from 'lucide-react'
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
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  record,
  isLoading,
  onClose,
  onDownload,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <header className="h-20 px-8 border-b border-border/40 bg-muted/5 backdrop-blur-xl flex items-center justify-between shrink-0 relative z-20">
      <div className="flex items-center gap-6 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-xl hover:bg-muted active:scale-90 border border-border/40 shrink-0"
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="text-[8px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary h-4.5"
            >
              Entity_ID
            </Badge>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
              {record?.details?.kind}
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tighter text-foreground uppercase truncate leading-none">
            {isLoading ? 'Resolving Manifest...' : record?.details?.id?.split(':').pop()}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!isLoading && record && (
          <div className="flex items-center gap-2">
            {record.details.kind?.includes('dataset--File') && (
              <Button
                onClick={onDownload}
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2"
              >
                <Download size={14} /> Download
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-border/40"
                    onClick={() => copyToClipboard(record.details.id, 'Registry ID')}
                  >
                    <Fingerprint size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] font-bold uppercase p-2">
                  Copy Registry ID
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        <Separator orientation="vertical" className="h-6 mx-2 opacity-10" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
        >
          <X size={20} />
        </Button>
      </div>
    </header>
  )
}
