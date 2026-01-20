import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

// API & Types
import { getConnection, getConnectionAssets, getConnectionMetadata } from '@/lib/api'

// ProSource Hub Components
import { ProSourceHubHeader } from './ProSourceHubHeader'
import { ProSourceHubNav, type ProSourceService } from './ProSourceHubNav'
import { ProSourceDashboard } from './dashboard/ProSourceDashboard'
import { ProSourceInventoryView } from './inventory/ProSourceInventoryView'
import { ProSourceRegistryView } from './registry/ProSourceRegistryView'
import { ProSourceSpatialView } from './spatial/ProSourceSpatialView'
import { ProSourceRecordInspector } from './ProSourceRecordInspector'

interface ProSourceExplorerProps {
  connectionId: number
}

export const ProSourceExplorer: React.FC<ProSourceExplorerProps> = ({ connectionId }) => {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const activeService = (searchParams.get('service') as ProSourceService) || 'dashboard'
  const activeRecordId = searchParams.get('recordId') || null
  const selectedEntity = searchParams.get('entity') || null // e.g. "Wells", "Seismic"

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const setService = (service: ProSourceService) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('service', service)
    setSearchParams(newParams)
  }

  const setRecordId = (recordId: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (recordId) newParams.set('recordId', recordId)
    else newParams.delete('recordId')
    setSearchParams(newParams)
  }

  // Queries
  const { data: connection } = useQuery({
    queryKey: ['prosource', 'connection', connectionId],
    queryFn: () => getConnection(connectionId),
  })

  const { data: assets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['prosource', 'assets', connectionId],
    queryFn: () => getConnectionAssets(connectionId),
  })

  // Mock domain-specific metadata for ProSource (usually from Oracle system tables or Seabed metadata)
  const { data: domainStats } = useQuery({
    queryKey: ['prosource', 'metadata', connectionId, 'stats'],
    queryFn: () => getConnectionMetadata(connectionId, 'get_domain_stats'),
    enabled: !!connection,
  })

  const { data: projects } = useQuery({
    queryKey: ['prosource', 'metadata', connectionId, 'projects'],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'execute_query', { query: 'SELECT * FROM PS_PROJECT' }),
    enabled: !!connection,
  })

  return (
    <div className="h-full flex flex-col bg-[#020203] text-foreground selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header & Navigation */}
      <ProSourceHubHeader
        connectionName={connection?.name}
        healthStatus={connection?.health_status}
      >
        <ProSourceHubNav activeService={activeService} onServiceChange={setService} />
      </ProSourceHubHeader>

      {/* Main Workspace */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeService === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-auto"
            >
              <ProSourceDashboard
                stats={domainStats}
                assets={assets || []}
                projects={projects?.results || []}
              />
            </motion.div>
          )}

          {activeService === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <ProSourceInventoryView
                connectionId={connectionId}
                assets={assets || []}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onSelectRecord={setRecordId}
              />
            </motion.div>
          )}

          {activeService === 'registry' && (
            <motion.div
              key="registry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <ProSourceRegistryView
                connectionId={connectionId}
                selectedEntity={selectedEntity}
                onSelectRecord={setRecordId}
              />
            </motion.div>
          )}

          {activeService === 'spatial' && (
            <motion.div
              key="spatial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <ProSourceSpatialView connectionId={connectionId} onSelectRecord={setRecordId} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Inspector for Records */}
        <ProSourceRecordInspector
          connectionId={connectionId}
          recordId={activeRecordId}
          onClose={() => setRecordId(null)}
        />
      </main>
    </div>
  )
}
