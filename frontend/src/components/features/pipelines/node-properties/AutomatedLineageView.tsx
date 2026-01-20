import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Share2, ArrowRight, Sparkles, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getConnectionAssets, getColumnLineage } from '@/lib/api'
import { toast } from 'sonner'

interface AutomatedLineageViewProps {
  assetId: number
}

export const AutomatedLineageView: React.FC<AutomatedLineageViewProps> = ({ assetId }) => {
  const [lineageData, setLineageData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const { data: assets } = useQuery({
    queryKey: ['asset-detail', assetId],
    queryFn: () => getConnectionAssets(assetId),
    enabled: !!assetId,
  })

  const columns = useMemo(() => {
    const asset = assets?.find((a: any) => a.id === assetId)
    return asset?.schema_metadata?.columns?.map((c: any) => c.name) || []
  }, [assets, assetId])

  const fetchLineage = async (col: string) => {
    setLoading(true)
    try {
      const data = await getColumnLineage(assetId, col)
      setLineageData(data)
    } catch (err) {
      toast.error('Lineage Trace Failed', {
        description: 'Could not retrieve automated lineage for this column.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Trace Output Column
        </Label>
        <Select onValueChange={fetchLineage}>
          <SelectTrigger className="h-9 rounded-lg bg-muted/20 border-border/40">
            <SelectValue placeholder="Select column to trace ancestry..." />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c: string) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin opacity-40" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Analyzing Ancestry...
          </p>
        </div>
      ) : lineageData ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Share2 size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                  Origin Point
                </p>
                <p className="text-xs font-mono font-bold text-foreground truncate max-w-[200px]">
                  Asset #{lineageData.origin_asset_id} • {lineageData.origin_column_name}
                </p>
              </div>
            </div>

            <div className="space-y-3 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-linear-to-b from-primary/40 to-transparent" />

              {lineageData.path.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 relative pl-8">
                  <div className="absolute left-[11px] top-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background ring-4 ring-primary/10 shadow-sm" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[8px] h-4 uppercase tracking-tighter bg-background/50 border-primary/20 text-primary/80"
                      >
                        {step.transformation_type}
                      </Badge>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                        Node {step.node_id}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground">
                      <span className="text-muted-foreground/60">{step.source_column}</span>
                      <ArrowRight size={10} className="inline mx-1.5 text-muted-foreground/40" />
                      <span className="text-primary/90">{step.target_column}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Automated Insights
          </p>
          <p className="text-[9px] text-muted-foreground mt-2 max-w-[200px] mx-auto leading-relaxed">
            Select an output column above to visually trace its journey through the entire
            workspace.
          </p>
        </div>
      )}
    </div>
  )
}
