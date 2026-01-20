import React from 'react'
import { Layers, Database, ShieldCheck, Globe } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DashboardKPIsProps {
  totalKinds: number
  totalRecords: number
  totalTags: number
  uniqueAuthorities: number
  itemVariants: any
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  totalKinds,
  totalRecords,
  totalTags,
  uniqueAuthorities,
  itemVariants,
}) => {
  const kpis = [
    {
      label: 'Schema Manifests',
      value: totalKinds,
      icon: Layers,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/15 dark:bg-blue-500/20',
      borderColor: 'border-blue-500/40',
    },
    {
      label: 'Partition Records',
      value: totalRecords,
      icon: Database,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
      borderColor: 'border-indigo-500/40',
    },
    {
      label: 'Policy Coverage',
      value: totalTags,
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
    },
    {
      label: 'Active Authorities',
      value: uniqueAuthorities,
      icon: Globe,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/15 dark:bg-amber-500/20',
      borderColor: 'border-amber-500/40',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, i) => (
        <motion.div key={i} variants={itemVariants}>
          <div className="metric-card group relative overflow-hidden">
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1',
                kpi.bg.replace('/15', '').replace('/20', '')
              )}
            />
            <div className="flex items-center gap-6">
              <div
                className={cn(
                  'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110',
                  kpi.bg,
                  kpi.color
                )}
              >
                <kpi.icon size={28} />
              </div>
              <div className="min-w-0">
                <p className="subtitle mb-2.5">{kpi.label}</p>
                <h4 className="text-3xl font-black tracking-tighter leading-none text-foreground">
                  {formatNumber(kpi.value)}
                </h4>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
