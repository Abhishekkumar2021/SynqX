import React from 'react'
import { Table, Layers, FileText, FileCode, Activity, Sparkles, Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DiscoveredAssetCardProps {
  asset: any
  selected: boolean
  onSelect: (checked: boolean) => void
}

const getAssetIcon = (type: string) => {
  const t = type.toLowerCase()
  if (t.includes('table') || t.includes('view')) return <Table className="h-5 w-5" />
  if (t.includes('osdu_kind') || t.includes('kind')) return <Layers className="h-5 w-5" />
  if (t.includes('domain_entity') || t.includes('entity')) return <Database className="h-5 w-5" />
  if (t.includes('collection')) return <Layers className="h-5 w-5" />
  if (t.includes('file')) return <FileText className="h-5 w-5" />
  if (t.includes('script') || t.includes('python') || t.includes('javascript'))
    return <FileCode className="h-5 w-5" />
  return <Activity className="h-5 w-5" />
}
export const DiscoveredAssetCard: React.FC<DiscoveredAssetCardProps> = ({
  asset,
  selected,
  onSelect,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'group relative rounded-[2rem] border transition-all duration-300 flex flex-col cursor-pointer overflow-hidden',
        selected
          ? 'border-amber-500/50 bg-amber-500/5 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/20'
          : 'border-border/40 bg-background/40 backdrop-blur-xl hover:border-amber-500/30 hover:bg-background/60 hover:shadow-xl hover:shadow-black/5'
      )}
      onClick={() => onSelect(!selected)}
    >
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-6',
                selected
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-muted/50 text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-600'
              )}
            >
              {getAssetIcon(asset.type || asset.asset_type)}
            </div>
            <div className="flex flex-col min-w-0 space-y-1">
              <h4 className="text-base font-bold text-foreground truncate group-hover:text-amber-600 transition-colors tracking-tight">
                {asset.name}
              </h4>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0 bg-muted/40 text-muted-foreground border-none h-5"
                >
                  {asset.type || asset.asset_type || 'table'}
                </Badge>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-600"
                  >
                    <Sparkles className="h-3 w-3" />
                    SELECTED
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(Boolean(checked))}
            className="h-5 w-5 rounded-full border-muted-foreground/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 shadow-sm transition-all"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {asset.fully_qualified_name && asset.fully_qualified_name !== asset.name && (
          <div className="px-4 py-2.5 rounded-xl bg-muted/20 border border-border/10 group-hover:border-amber-500/10 transition-colors">
            <span
              className="text-[11px] text-muted-foreground/70 font-mono truncate block leading-relaxed"
              title={asset.fully_qualified_name}
            >
              {asset.fully_qualified_name}
            </span>
          </div>
        )}
      </div>

      <div
        className={cn(
          'mt-auto px-6 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] transition-colors',
          selected ? 'bg-amber-500/10 text-amber-700' : 'bg-muted/20 text-muted-foreground/60'
        )}
      >
        <span className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 opacity-50" />
          Discovered
        </span>
        <span
          className={cn(
            'transition-colors',
            selected ? 'text-amber-600' : 'opacity-0 group-hover:opacity-100 text-amber-500/70'
          )}
        >
          Ready to Register
        </span>
      </div>
    </motion.div>
  )
}
