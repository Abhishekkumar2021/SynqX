import React from 'react'
import { ArrowUpRight, Link2, Copy, Navigation, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { OSDUDiscoveryEmptyState } from '../shared/OSDUDiscoveryEmptyState'

interface InspectorRelationshipsProps {
  record: any
  onNavigate: (id: string) => void
}

export const InspectorRelationships: React.FC<InspectorRelationshipsProps> = ({
  record,
  onNavigate,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const outbound = record.relationships?.outbound || []
  const inbound = record.relationships?.inbound || []

  return (
    <div className="h-full bg-muted/5 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-10 space-y-12 pb-32">
          {/* Outbound */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/20 pb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-sm">
                  <ArrowUpRight size={18} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                  Outbound References
                </h3>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-indigo-500/20 text-indigo-600 uppercase h-5"
              >
                {outbound.length} Nodes
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {outbound.map((rel: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 group hover:border-primary/40 transition-all shadow-sm"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1 tracking-widest leading-none">
                      {rel.field}
                    </span>
                    <code className="text-xs font-bold truncate text-foreground/80 font-mono tracking-tighter">
                      {rel.target_id}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100"
                      onClick={() => copyToClipboard(rel.target_id, 'Target ID')}
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2 bg-muted/30 border-border/40 hover:bg-primary hover:text-white transition-all shadow-sm"
                      onClick={() => onNavigate(rel.target_id)}
                    >
                      Navigate <Navigation size={12} className="rotate-45" />
                    </Button>
                  </div>
                </div>
              ))}
              {outbound.length === 0 && (
                <div className="relative min-h-[200px]">
                  <OSDUDiscoveryEmptyState
                    icon={ArrowUpRight}
                    title="No Outbound Links"
                    description="This record does not reference any other entities in the current metadata frame."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Inbound */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/20 pb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-sm">
                  <Link2 size={18} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                  Inbound Dependencies
                </h3>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-emerald-500/20 text-emerald-600 uppercase h-5"
              >
                {inbound.length} Nodes
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {inbound.map((rel: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 group hover:border-blue-500/40 transition-all shadow-sm"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[8px] font-black uppercase text-muted-foreground/40 mb-1 tracking-widest leading-none">
                      {rel.kind.split(':').pop()?.split('--').pop()}
                    </span>
                    <code className="text-xs font-bold truncate text-foreground/80 font-mono tracking-tighter">
                      {rel.source_id}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100"
                      onClick={() => copyToClipboard(rel.source_id, 'Source ID')}
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg font-black uppercase text-[9px] tracking-widest gap-2 bg-muted/30 border-border/40 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      onClick={() => onNavigate(rel.source_id)}
                    >
                      Inspect <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {inbound.length === 0 && (
                <div className="relative min-h-[200px]">
                  <OSDUDiscoveryEmptyState
                    icon={Link2}
                    title="No Inbound Links"
                    description="No other entities reference this record in the technical OSDU mesh."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
