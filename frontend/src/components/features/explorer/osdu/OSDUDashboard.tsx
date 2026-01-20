import React, { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

import { DashboardKPIs } from './dashboard/DashboardKPIs'
import { DashboardCharts } from './dashboard/DashboardCharts'
import { DashboardGovernance } from './dashboard/DashboardGovernance'

interface OSDUDashboardProps {
  kinds: any[]
  groups: any[]
  legalTags: any[]
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
}

export const OSDUDashboard: React.FC<OSDUDashboardProps> = ({ kinds, groups, legalTags }) => {
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

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <ScrollArea className="flex-1">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-8 space-y-8 max-w-[1800px] mx-auto pb-32"
        >
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
