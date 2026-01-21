import React, { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

import { DashboardKPIs } from './dashboard/DashboardKPIs'
import { DashboardCharts } from './dashboard/DashboardCharts'
import { DashboardGovernance } from './dashboard/DashboardGovernance'
import { ShieldCheck, Activity, Server, Cpu, Search, Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface OSDUDashboardProps {
  kinds: any[]
  groups: any[]
  legalTags: any[]
  health?: any
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
}

export const OSDUDashboard: React.FC<OSDUDashboardProps> = ({
  kinds,
  groups,
  legalTags,
  health,
}) => {
  const analytics = useMemo(() => {
    const totalKinds = kinds.length
    const totalGroups = groups.length
    const totalTags = legalTags.length
    const totalRecords = kinds.reduce((acc, k) => acc + (k.rows || 0), 0)

    const authMap: Record<string, number> = {}
    kinds.forEach((k) => (authMap[k.authority] = (authMap[k.authority] || 0) + 1))
    const sovereigntyData = Object.entries(authMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const groupMap: Record<string, number> = {}
    kinds.forEach((k) => (groupMap[k.group] = (groupMap[k.group] || 0) + 1))
    const compositionData = Object.entries(groupMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const sourceMap: Record<string, number> = {}
    kinds.forEach((k) => (sourceMap[k.source] = (sourceMap[k.source] || 0) + 1))
    const provenanceData = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const cleanedGroups = Array.from(
      new Set(
        groups.map((g) => {
          return g.name.replace(/^data\.|^service\.|^users\./, '')
        })
      )
    ).map((name) => ({ displayName: name }))

    return {
      totalKinds,
      totalGroups,
      totalTags,
      totalRecords,
      sovereigntyData,
      compositionData,
      provenanceData,
      cleanedGroups,
      uniqueAuthorities: sovereigntyData.length,
    }
  }, [kinds, groups, legalTags])

  const isHealthy = health?.status === 'healthy'

  return (
    <div className="h-full flex flex-col bg-muted/2">
      <ScrollArea className="flex-1">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-6 space-y-6 max-w-[1600px] mx-auto pb-32"
        >
          {/* --- Global Health Monitoring --- */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 metric-card flex items-center justify-between group">
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div
                    className={cn(
                      'absolute inset-0 blur-2xl animate-pulse rounded-full',
                      isHealthy ? 'bg-emerald-500/20' : 'bg-destructive/20'
                    )}
                  />
                  <div
                    className={cn(
                      'h-16 w-16 rounded-[1.5rem] border flex items-center justify-center shadow-xl relative z-10',
                      isHealthy
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : 'bg-destructive/10 border-destructive/20 text-destructive'
                    )}
                  >
                    {isHealthy ? <ShieldCheck size={32} /> : <Activity size={32} />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase leading-none">
                    Partition Sovereignty:{' '}
                    <span className="text-primary">{kinds[0]?.authority || 'OSDU'}</span>
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] flex items-center gap-2">
                    <Activity
                      size={12}
                      className={cn(
                        isHealthy ? 'text-emerald-500 animate-pulse' : 'text-destructive'
                      )}
                    />
                    Platform status:{' '}
                    <span
                      className={cn(
                        'font-black',
                        isHealthy ? 'text-emerald-500' : 'text-destructive'
                      )}
                    >
                      {health
                        ? isHealthy
                          ? 'Optimal Operational Frame'
                          : 'Service Disruption Detected'
                        : 'Resolving Health Probes...'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {[
                  { label: 'Search_V2', icon: Search },
                  { label: 'Storage_V2', icon: Database },
                  { label: 'Schema_V1', icon: Server },
                ].map((svc, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-end gap-1.5 p-3 px-5 rounded-2xl bg-muted/20 border border-border/10 shadow-inner group-hover:border-primary/10 transition-colors"
                  >
                    <span className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">
                      {svc.label}
                    </span>
                    {health ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-4.5 px-1.5 text-[8px] font-black uppercase',
                          isHealthy
                            ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5'
                            : 'border-destructive/20 text-destructive bg-destructive/5'
                        )}
                      >
                        {isHealthy ? 'Healthy' : 'Degraded'}
                      </Badge>
                    ) : (
                      <Skeleton className="h-4 w-12 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="metric-card flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                  Mesh Latency
                </span>
                <Cpu size={16} className="text-primary/40" />
              </div>
              <div className="space-y-1">
                {health ? (
                  <>
                    <h3 className="text-4xl font-black tracking-tighter text-primary">
                      {health.latency_ms ? `${Math.round(health.latency_ms)}ms` : 'N/A'}
                    </h3>
                    <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">
                      Global P99 Sync
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24 bg-primary/10" />
                    <Skeleton className="h-3 w-16 bg-primary/10" />
                  </div>
                )}
              </div>
              <div className="mt-6 h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: health ? '65%' : 0 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                />
              </div>
            </div>
          </motion.div>

          <DashboardKPIs
            totalKinds={analytics.totalKinds}
            totalRecords={analytics.totalRecords}
            totalTags={analytics.totalTags}
            uniqueAuthorities={analytics.uniqueAuthorities}
            itemVariants={itemVariants}
          />

          <DashboardCharts
            sovereigntyData={analytics.sovereigntyData}
            compositionData={analytics.compositionData}
            provenanceData={analytics.provenanceData}
            totalKinds={analytics.totalKinds}
            itemVariants={itemVariants}
          />

          <DashboardGovernance
            totalGroups={analytics.totalGroups}
            totalTags={analytics.totalTags}
            cleanedGroups={analytics.cleanedGroups}
            legalTags={legalTags}
            itemVariants={itemVariants}
          />
        </motion.div>
      </ScrollArea>
    </div>
  )
}
