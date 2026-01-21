import React from 'react'
import { ChevronRight, ChevronDown, Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'

interface RegistryGridProps {
  groupedKinds: [string, any[]][]
  onSelectKind: (kind: string) => void
  collapsedGroups: string[]
  toggleGroup: (group: string) => void
}

export const RegistryGrid: React.FC<RegistryGridProps> = ({
  groupedKinds,
  onSelectKind,
  collapsedGroups,
  toggleGroup,
}) => {
  return (
    <div className="p-10 max-w-7xl mx-auto w-full space-y-12 pb-32">
      {groupedKinds.map(([group, items], idx) => (
        <div key={group || `group-${idx}`} className="space-y-6">
          <div
            className="flex items-center gap-4 px-1 cursor-pointer group select-none"
            onClick={() => toggleGroup(group)}
          >
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-foreground border border-border/40 group-hover:border-primary/40 group-hover:text-primary transition-all shadow-md">
                {collapsedGroups.includes(group) ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
              <h4 className="text-base font-black uppercase tracking-[0.2em] text-foreground/80 group-hover:text-primary transition-colors">
                {group}
              </h4>
              <Badge
                variant="secondary"
                className="bg-muted text-foreground text-[11px] font-black h-6 px-3 shadow-sm"
              >
                {items.length}
              </Badge>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
          </div>

          <AnimatePresence initial={false}>
            {!collapsedGroups.includes(group) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                  {items.map((k) => (
                    <motion.div
                      key={k.full_kind}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => onSelectKind(k.full_kind)}
                      className="group p-6 rounded-[2.5rem] bg-card border border-border/40 hover:border-primary/40 hover:shadow-2xl transition-all cursor-pointer flex flex-col gap-5 relative overflow-hidden shadow-md ring-1 ring-white/5"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-muted/20 border border-border/10 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                          <Database
                            size={28}
                            className="text-muted-foreground group-hover:text-primary transition-colors"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-black text-lg break-words text-foreground tracking-tight leading-snug mb-2">
                            {k.entity_name}
                          </h5>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[11px] font-mono text-muted-foreground/60 break-all tracking-tight leading-tight"
                              title={k.full_kind}
                            >
                              {k.full_kind}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-black border-border/60 bg-muted/30 h-6 px-3 uppercase tracking-widest text-foreground"
                          >
                            {k.source}
                          </Badge>
                          <span className="text-[11px] font-black text-muted-foreground/80 uppercase tracking-widest">
                            v{k.version}
                          </span>
                        </div>
                        <div className="text-[11px] font-black text-primary uppercase tracking-[0.2em] group-hover:translate-x-1 transition-all flex items-center gap-2">
                          Discovery <ChevronRight size={14} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
