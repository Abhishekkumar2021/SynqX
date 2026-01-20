import React from 'react'
import { Shield, Users, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DashboardGovernanceProps {
  totalGroups: number
  totalTags: number
  cleanedGroups: any[]
  legalTags: any[]
  itemVariants: any
}

export const DashboardGovernance: React.FC<DashboardGovernanceProps> = ({
  totalGroups,
  totalTags,
  cleanedGroups,
  legalTags,
  itemVariants,
}) => {
  return (
    <motion.div variants={itemVariants} className="lg:col-span-12 mt-8">
      <div className="glass-card p-8 md:p-10 rounded-[2rem]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm shrink-0">
              <Shield size={32} />
            </div>
            <div>
              <h4 className="text-xl md:text-2xl font-black uppercase tracking-widest leading-none text-foreground">
                Security & Sovereignty Registry
              </h4>
              <p className="subtitle mt-2 opacity-80">
                Entitlement domains and compliance verification
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6 w-full md:w-auto">
            <div className="flex flex-col items-end mr-2">
              <span className="subtitle">
                Pulse Status
              </span>
              <div className="flex items-center gap-2.5 mt-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                  Registry Sync: Active
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-12 rounded-xl font-black uppercase text-[11px] border-border/60 px-8 hover:bg-muted shadow-sm transition-all tracking-widest"
            >
              Audit Security
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Entitlement Domains */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 px-1">
              <span className="subtitle flex items-center gap-3 text-foreground/80">
                <Users size={18} className="text-primary" /> Entitlement Domains
              </span>
              <Badge
                variant="secondary"
                className="bg-primary text-primary-foreground border-none text-[11px] font-black h-6 px-3"
              >
                {totalGroups}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar content-start">
              {cleanedGroups.slice(0, 48).map((g: any, idx: number) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-muted/30 text-[10px] font-bold border-border/40 text-foreground px-3 py-1.5 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default max-w-[240px] truncate uppercase tracking-tight"
                  title={g.displayName}
                >
                  {g.displayName}
                </Badge>
              ))}
              {totalGroups > 48 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-black bg-muted border-none px-3 h-6 text-muted-foreground"
                >
                  +{totalGroups - 48} MORE
                </Badge>
              )}
            </div>
          </div>

          {/* Compliance Suite */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 px-1">
              <span className="subtitle flex items-center gap-3 text-foreground/80">
                <ShieldCheck size={18} className="text-emerald-500" /> Compliance Suite
              </span>
              <Badge
                variant="secondary"
                className="bg-emerald-600 text-white border-none text-[11px] font-black h-6 px-3"
              >
                {totalTags}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {legalTags.slice(0, 8).map((t: any, idx: number) => (
                <div
                  key={t.name || `tag-${idx}`}
                  className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-emerald-500/30 hover:bg-muted/40 transition-all cursor-default group"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-bold text-foreground truncate uppercase tracking-tight">
                      {t.name}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">
                      Verified Context
                    </span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
