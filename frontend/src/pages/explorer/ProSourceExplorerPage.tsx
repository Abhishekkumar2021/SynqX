import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getConnection } from '@/lib/api/connections'
import { PageMeta } from '@/components/common/PageMeta'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useZenMode } from '@/hooks/useZenMode'
import { ProSourceExplorer } from '@/components/features/explorer/components/prosource/ProSourceExplorer'

export const ProSourceExplorerPage: React.FC = () => {
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
      className={cn(
        'flex-1 flex flex-col gap-6 md:gap-8 px-1',
        isZenMode ? 'h-[calc(100vh-3rem)]' : 'h-[calc(100vh-8rem)]'
      )}
    >
      <PageMeta title={`Seabed Explorer - ${connection?.name || 'Loading...'}`} />

      {/* --- Content Area --- */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
        <ProSourceExplorer connectionId={connectionId} />
      </div>
    </motion.div>
  )
}
