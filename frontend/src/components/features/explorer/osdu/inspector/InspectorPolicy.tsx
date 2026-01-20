import React from 'react'
import {
  Shield,
  User,
  Globe,
  Scale,
  Lock,
  Flag,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { InspectorEmptyState } from './InspectorEmptyState'
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
  <div className={cn("rounded-3xl border border-border/40 bg-card/50 overflow-hidden flex flex-col shadow-sm", className)}>
    <div className="px-6 py-4 border-b border-border/10 bg-muted/20 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-background border border-border/20 flex items-center justify-center text-muted-foreground shadow-sm">
        <Icon size={16} />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">
        {title}
      </span>
    </div>
    <div className="p-6 flex-1 flex flex-col gap-6">
      {children}
    </div>
  </div>
)

const PolicyList = ({
  items,
  emptyLabel,
  colorClass = "bg-primary/10 text-primary border-primary/20",
  icon: Icon
}: {
  items: string[]
  emptyLabel: string
  colorClass?: string
  icon?: any
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/20 rounded-2xl bg-muted/5 gap-2">
         <span className="text-[10px] font-medium text-muted-foreground/40 italic">{emptyLabel}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <Badge
          key={`${item}-${idx}`}
          variant="outline"
          className={cn("text-[10px] font-bold px-3 py-2 border", colorClass)}
        >
          {Icon && <Icon size={10} className="mr-1.5 opacity-60" />}
          {item}
        </Badge>
      ))}
    </div>
  )
}

export const InspectorPolicy: React.FC<InspectorPolicyProps> = ({ record }) => {
  const acl = record.details?.acl || {}
  const legal = record.details?.legal || {}

  const hasAcl = (acl.owners?.length > 0) || (acl.viewers?.length > 0)
  const hasLegal = (legal.legaltags?.length > 0) || (legal.otherRelevantDataCountries?.length > 0)

  if (!hasAcl && !hasLegal) {
     return (
        <div className="h-full bg-muted/5 flex items-center justify-center">
            <InspectorEmptyState 
                icon={Shield} 
                title="No Policy Data" 
                description="This record has no access control or legal tags defined."
            />
        </div>
     )
  }

  return (
    <div className="h-full bg-muted/5 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-8 pb-32 max-w-none w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Access Control List */}
          <PolicySection icon={Lock} title="Access Control Domain" className="h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <User size={12} className="text-blue-500" /> Data Owners
                </span>
                <Badge variant="secondary" className="text-[9px] font-mono h-5 bg-blue-500/10 text-blue-600 border-none p-2">
                   {acl.owners?.length || 0}
                </Badge>
              </div>
              <PolicyList 
                items={acl.owners} 
                emptyLabel="No owners assigned" 
                colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20"
              />
            </div>

            <Separator className="bg-border/30" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Globe size={12} className="text-amber-500" /> Data Viewers
                </span>
                <Badge variant="secondary" className="text-[9px] font-mono h-5 bg-amber-500/10 text-amber-600 border-none px-2">
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
          <PolicySection icon={Scale} title="Legal Compliance" className="h-full">
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Flag size={12} className="text-rose-500" /> Legal Tags
                </span>
                 <Badge variant="secondary" className="text-[9px] font-mono h-5 bg-rose-500/10 text-rose-600 border-none px-2">
                   {legal.legaltags?.length || 0}
                </Badge>
               </div>
               <PolicyList 
                  items={legal.legaltags} 
                  emptyLabel="No legal tags associated" 
                  colorClass="bg-card border-border/40 text-foreground/80 hover:bg-muted"
                  icon={CheckCircle2}
                />
             </div>

             <Separator className="bg-border/30" />

             <div className="bg-muted/30 rounded-2xl p-5 border border-border/20 flex flex-col gap-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Globe size={12} /> Data Residency Jurisdiction
                </span>
                <div className="flex flex-wrap gap-2">
                     {legal.otherRelevantDataCountries?.length > 0 ? (
                        legal.otherRelevantDataCountries.map((c: string) => (
                             <Badge key={c} variant="outline" className="bg-background font-bold text-[10px] px-3 h-7 border-emerald-500/30 text-emerald-600">
                                {c}
                             </Badge>
                        ))
                     ) : (
                         <div className="flex items-center gap-2 text-muted-foreground/50 text-[10px] italic">
                            <Globe size={12} /> Global Jurisdiction (Default)
                         </div>
                     )}
                </div>
             </div>

             {legal.status && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/20">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Compliance Status</span>
                     <Badge variant="outline" className="bg-background text-foreground/80 border-border/40 font-mono text-[10px]">
                        {legal.status}
                     </Badge>
                </div>
             )}
          </PolicySection>

        </div>
      </ScrollArea>
    </div>
  )
}