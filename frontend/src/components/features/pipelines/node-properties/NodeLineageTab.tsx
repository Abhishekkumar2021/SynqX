import React from 'react'
import { Sliders } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { AutomatedLineageView } from './AutomatedLineageView'
import { LineageMapper } from './LineageMapper'

interface NodeLineageTabProps {
  nodeType: string
  assetId: string
  watch: any
  setValue: any
}

export const NodeLineageTab: React.FC<NodeLineageTabProps> = ({
  nodeType,
  assetId,
  watch,
  setValue,
}) => {
  return (
    <div className="p-6 focus-visible:outline-none">
      {(nodeType === 'source' || nodeType === 'sink') && assetId ? (
        <div className="space-y-8">
          <AutomatedLineageView assetId={parseInt(assetId)} />
          <Separator className="opacity-50" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Manual Override
              </span>
            </div>
            <LineageMapper watch={watch} setValue={setValue} />
          </div>
        </div>
      ) : (
        <LineageMapper watch={watch} setValue={setValue} />
      )}
    </div>
  )
}
