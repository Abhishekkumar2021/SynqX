import React from 'react'
import { Clock, Download, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { OSDUDiscoveryEmptyState } from '../shared/OSDUDiscoveryEmptyState'

interface InspectorHistoryProps {
  record: any
  onNavigate: (id: string) => void
}

export const InspectorHistory: React.FC<InspectorHistoryProps> = ({ record, onNavigate }) => {
  const versions = record?.versions || []
  const currentId = record?.details?.id

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="px-8 py-4 bg-muted/5 border-b border-border/40 shrink-0">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2">
          <Clock size={16} /> Version History
        </h3>
      </div>

      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full">
          <div className="p-8">
            {versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((v: number, idx: number) => {
                  const isLatest = idx === 0
                  const versionId = `${currentId.split(':')[0]}:${currentId.split(':')[1]}:${currentId.split(':')[2]}:${v}`

                  return (
                    <div
                      key={v}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card hover:bg-muted/5 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {versions.length - idx}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">Version {v}</span>
                            {isLatest && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] font-black uppercase h-4 px-1.5">
                                Current
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            ID: {v}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1.5"
                          onClick={() => onNavigate(versionId)}
                        >
                          <Eye size={12} /> View
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/2 relative min-h-[400px]">
                <OSDUDiscoveryEmptyState
                  icon={Clock}
                  title="No Version History"
                  description="We couldn't resolve the historical versions for this record in the current partition scope."
                  action={{
                    label: 'Refresh Buffer',
                    onClick: () => {},
                    icon: RefreshCw,
                  }}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
