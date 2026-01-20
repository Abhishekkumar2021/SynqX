import React from 'react'
import {
  ShieldCheck,
  Users,
  Copy,
  Info,
  ArrowUpRight,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface GovernanceGridProps {
  items: any[]
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  initialMode: 'identity' | 'compliance'
}

export const GovernanceGrid: React.FC<GovernanceGridProps> = ({
  items,
  selectedIds,
  toggleSelection,
  initialMode,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-24">
      {items.map((i) => {
        const id = i.id || i.name || i.email
        const isSelected = selectedIds.has(id)
        const displayName = i.displayName || i.name || i.email.split('@')[0]

        return (
          <motion.div
            key={id}
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'group relative flex flex-col gap-4 p-5 rounded-3xl bg-card border transition-all duration-300 overflow-hidden cursor-default',
              isSelected
                ? 'border-primary/40 shadow-[0_0_0_1px_rgba(var(--primary),0.1)]'
                : 'border-border/40 hover:border-primary/20 hover:shadow-lg'
            )}
          >
            <div
              className={cn(
                "absolute top-4 left-4 z-30 transition-all duration-200",
                isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(id)}
                className={cn(
                  "h-5 w-5 rounded-md border-border/40 bg-background/50 backdrop-blur-sm transition-opacity",
                   isSelected ? "opacity-100 bg-primary border-primary text-primary-foreground" : "opacity-100 bg-background/80"
                )}
              />
            </div>

            <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[2px]">
                <ArrowUpRight size={18} className="text-primary" />
            </div>

            <div className="flex items-start gap-4 pt-1 pl-8 min-w-0">
               <div className="flex flex-col gap-1.5 min-w-0 w-full">
                   <div className="flex items-center gap-2">
                      <Badge
                          variant="secondary"
                          className={cn(
                              "text-[9px] font-black uppercase border px-1.5 py-0 rounded-md tracking-wider h-5 shrink-0",
                              initialMode === 'identity' 
                                ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          )}
                      >
                          {initialMode === 'identity' ? 'Domain' : 'Legal_Tag'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/50 truncate font-mono" title={id}>
                          {id}
                      </span>
                   </div>
                   <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                             initialMode === 'identity' 
                                ? "bg-indigo-500/5 text-indigo-600 border-indigo-500/10"
                                : "bg-rose-500/5 text-rose-600 border-rose-500/10"
                        )}>
                            {initialMode === 'identity' ? <Users size={16} /> : <ShieldCheck size={16} />}
                        </div>
                        <h4
                            className="font-bold text-sm text-foreground/90 truncate tracking-tight leading-snug pr-2"
                            title={displayName}
                        >
                            {displayName}
                        </h4>
                   </div>
               </div>
            </div>

            <div className="bg-muted/30 rounded-2xl p-3 border border-border/20 flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between gap-4 min-w-0">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/50 truncate tracking-wider shrink-0">
                  Global Status
                </span>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black h-5 uppercase">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4 min-w-0">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/50 truncate tracking-wider shrink-0">
                  Last Sync
                </span>
                <span className="text-[10px] font-medium truncate text-foreground/70 text-right font-mono">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-auto pt-2 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                    onClick={() => copyToClipboard(id, 'ID')}
                  >
                    <Copy size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-muted"
                  >
                    <Info size={12} />
                  </Button>
               </div>
               
               <div className="text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex items-center gap-1">
                  Configure <ArrowUpRight size={10} />
               </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
