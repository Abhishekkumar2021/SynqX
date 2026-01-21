import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getConnection } from '@/lib/api/connections'
import { PageMeta } from '@/components/common/PageMeta'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useZenMode } from '@/hooks/useZenMode'
import { OSDUExplorer } from '@/components/features/explorer/components/osdu/OSDUExplorer'

export const OSDUExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const connectionId = parseInt(id!)
  const { isZenMode } = useZenMode()

  // Connection Details for Header
  const { data: connection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection(connectionId),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      <PageMeta title={`OSDU Explorer - ${connection?.name || 'Loading...'}`} />

      {/* --- Content Area --- */}
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-sm relative overflow-hidden">
        <OSDUExplorer connectionId={connectionId} />
      </div>
    </motion.div>
  )
}
