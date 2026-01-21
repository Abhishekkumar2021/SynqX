import React from 'react'
import { Shield, User, Globe, Scale, Lock, Flag, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OSDUDiscoveryEmptyState } from '../shared/OSDUDiscoveryEmptyState'
import { cn } from '@/lib/utils'

interface InspectorPolicyProps {
  record: any
}

const PolicySection = ({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: any
  title: string
  children: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'rounded-2xl border border-border/40 bg-card/50 overflow-hidden flex flex-col shadow-sm',
      className
    )}
  >
    <div className="px-5 py-3 border-b border-border/10 bg-muted/20 flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-lg bg-background border border-border/20 flex items-center justify-center text-muted-foreground shadow-sm shrink-0">
        <Icon size={14} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">
        {title}
      </span>
    </div>
    <div className="p-4 flex-1 flex flex-col gap-5">{children}</div>
  </div>
)

const PolicyList = ({
  items,
  emptyLabel,
  colorClass = 'bg-primary/10 text-primary border-primary/20',
  icon: Icon,
}: {
  items: string[]
  emptyLabel: string
  colorClass?: string
  icon?: any
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border/20 rounded-xl bg-muted/5 gap-1.5">
        <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">
          {emptyLabel}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, idx) => (
        <Badge
          key={`${item}-${idx}`}
          variant="outline"
          className={cn('text-[9px] font-bold px-2.5 py-1.5 border leading-none', colorClass)}
        >
          {Icon && <Icon size={9} className="mr-1 opacity-60" />}
          {item}
        </Badge>
      ))}
    </div>
  )
}

export const InspectorPolicy: React.FC<InspectorPolicyProps> = ({ record }) => {
  const acl = record.details?.acl || {}
  const legal = record.details?.legal || {}

  const hasAcl = acl.owners?.length > 0 || acl.viewers?.length > 0
  const hasLegal = legal.legaltags?.length > 0 || legal.otherRelevantDataCountries?.length > 0

  if (!hasAcl && !hasLegal) {
    return (
      <div className="h-full bg-muted/2 flex items-center justify-center relative">
        <OSDUDiscoveryEmptyState
          icon={Shield}
          title="No Policy Data"
          description="This record has no access control or legal tags defined in the OSDU technical manifest."
        />
      </div>
    )
  }

  return (
    <div className="h-full bg-muted/2 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6 pb-24 max-w-none w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Access Control List */}
          <PolicySection icon={Lock} title="Access Domains" className="h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                  <User size={11} className="text-blue-500" /> Data Owners
                </span>
                <Badge
                  variant="secondary"
                  className="text-[8px] font-mono h-4 bg-blue-500/10 text-blue-600 border-none px-1.5"
                >
                  {acl.owners?.length || 0}
                </Badge>
              </div>
              <PolicyList
                items={acl.owners}
                emptyLabel="No owners assigned"
                colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20"
              />
            </div>

            <Separator className="bg-border/20" />

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={11} className="text-amber-500" /> Data Viewers
                </span>
                <Badge
                  variant="secondary"
                  className="text-[8px] font-mono h-4 bg-amber-500/10 text-amber-600 border-none px-1.5"
                >
                  {acl.viewers?.length || 0}
                </Badge>
              </div>
              <PolicyList
                items={acl.viewers}
                emptyLabel="No viewers assigned"
                colorClass="bg-amber-500/10 text-amber-600 border-amber-500/20"
              />
            </div>
          </PolicySection>

          {/* Legal & Compliance */}
          <PolicySection icon={Scale} title="Compliance Hub" className="h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                  <Flag size={11} className="text-rose-500" /> Legal Tags
                </span>
                <Badge
                  variant="secondary"
                  className="text-[8px] font-mono h-4 bg-rose-500/10 text-rose-600 border-none px-1.5"
                >
                  {legal.legaltags?.length || 0}
                </Badge>
              </div>
              <PolicyList
                items={legal.legaltags}
                emptyLabel="No legal tags associated"
                colorClass="bg-card border-border/40 text-foreground/70 hover:bg-muted"
                icon={CheckCircle2}
              />
            </div>

            <Separator className="bg-border/20" />

            <div className="bg-muted/30 rounded-xl p-4 border border-border/20 flex flex-col gap-2.5">
              <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2 px-0.5">
                <Globe size={11} /> Data Residency
              </span>
              <div className="flex flex-wrap gap-1.5">
                {legal.otherRelevantDataCountries?.length > 0 ? (
                  legal.otherRelevantDataCountries.map((c: string) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="bg-background font-bold text-[9px] px-2 h-6 border-emerald-500/30 text-emerald-600"
                    >
                      {c}
                    </Badge>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground/40 text-[9px] italic font-bold uppercase tracking-widest py-1 px-1">
                    <Globe size={11} /> Global Jurisdiction
                  </div>
                )}
              </div>
            </div>

            {legal.status && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/20">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Integrity State
                </span>
                <Badge
                  variant="outline"
                  className="bg-background text-foreground/70 border-border/40 font-mono text-[9px] h-5 px-2"
                >
                  {legal.status.toUpperCase()}
                </Badge>
              </div>
            )}
          </PolicySection>
        </div>
      </ScrollArea>
    </div>
  )
}
