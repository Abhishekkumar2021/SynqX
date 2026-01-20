import React from 'react'
import {
  Shield,
  User,
  Globe,
  Scale,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

interface InspectorPolicyProps {
  record: any
}

export const InspectorPolicy: React.FC<InspectorPolicyProps> = ({ record }) => {
  return (
    <div className="h-full bg-muted/5 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-10 space-y-10 max-w-4xl mx-auto pb-32">
          <div className="grid grid-cols-1 gap-6">
            <div className="p-8 rounded-[2.5rem] bg-card border border-border/40 space-y-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                <Shield size={20} className="text-primary" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">
                  Access Control Domain
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-blue-500" /> Owners
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(record.details.acl?.owners || []).map((o: string) => (
                      <Badge
                        key={o}
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-600 border-none text-[10px] font-bold h-7 px-3 lowercase"
                      >
                        {o}
                      </Badge>
                    ))}
                    {(!record.details.acl?.owners?.length) && (
                        <span className="text-[10px] text-muted-foreground/50 italic">None</span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Globe size={12} className="text-amber-500" /> Viewers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(record.details.acl?.viewers || []).map((v: string) => (
                      <Badge
                        key={v}
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold h-7 px-3 lowercase"
                      >
                        {v}
                      </Badge>
                    ))}
                    {(!record.details.acl?.viewers?.length) && (
                        <span className="text-[10px] text-muted-foreground/50 italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-card border border-border/40 space-y-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                <Scale size={20} className="text-emerald-600" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">
                  Legal Compliance Registry
                </span>
              </div>
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                    Authenticated Legal Tags
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(record.details.legal?.legaltags || []).map(
                      (tag: string, idx: number) => (
                        <Badge
                          key={tag || `tag-${idx}`}
                          variant="outline"
                          className="text-[11px] font-bold border-border/40 bg-muted/20 px-4 h-8 rounded-xl uppercase tracking-tight shadow-sm"
                        >
                          {tag}
                        </Badge>
                      )
                    )}
                     {(!record.details.legal?.legaltags?.length) && (
                        <span className="text-[10px] text-muted-foreground/50 italic">None</span>
                    )}
                  </div>
                </div>
                <Separator className="opacity-10" />
                <div className="flex items-center justify-between bg-muted/10 p-4 rounded-2xl border border-border/40 shadow-inner">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-muted-foreground/40" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Data Residency
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 h-6 px-3 text-[10px] font-black uppercase tracking-widest">
                    {record.details.legal?.otherRelevantDataCountries?.[0] ||
                      'Global Juris'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
