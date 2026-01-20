import React, { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getConnectionAssets, getConnection, getConnectionMetadata } from '@/lib/api/connections'
import { ProSourceMeshView } from './ProSourceMeshView'
import { ProSourceRecordInspector } from './ProSourceRecordInspector'
import { ProSourceHubHeader } from './ProSourceHubHeader'
import { ProSourceHubNav, type ProSourceService } from './ProSourceHubNav'
import { ProSourceDashboard } from './ProSourceDashboard'
import { ProSourceReferenceView } from './ProSourceReferenceView'
import { ProSourceRegistryView } from './ProSourceRegistryView'
import { ProSourceDocumentView } from './ProSourceDocumentView'
import { ProSourceSecurityView } from './ProSourceSecurityView'
import { Loader2, Sparkles, Shield, FileText, ListTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'

interface ProSourceExplorerProps {
  connectionId: number
}

export const ProSourceExplorer: React.FC<ProSourceExplorerProps> = ({ connectionId }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // --- URL Synced State ---
  const activeService = (searchParams.get('service') as ProSourceService) || 'dashboard'
  const selectedAssetName = searchParams.get('asset') || null
  const activeRecordId = searchParams.get('recordId') || null
  const sqlQuery = searchParams.get('sql') || null
  const pageOffset = parseInt(searchParams.get('offset') || '0')
  const limit = 50

  // --- State Mutation Helpers (Sync with URL) ---
  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null) next.delete(key)
        else next.set(key, val)
      })
      return next
    })
  }

  const setService = (service: ProSourceService) =>
    updateParams({ service, recordId: null, offset: '0' })

  const setAsset = (asset: any) =>
    updateParams({
      asset: asset?.name || null,
      offset: '0',
      sql: null,
      recordId: null,
      service: asset ? 'mesh' : activeService,
    })

  const setRecordId = (recordId: string | null) => updateParams({ recordId })
  const setSql = (sql: string | null) => updateParams({ sql, offset: '0' })
  const setOffset = (o: number) => updateParams({ offset: String(o) })

  // --- Queries ---
  const { data: connection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection(connectionId),
  })

  const { data: assets, isLoading } = useQuery({
    queryKey: ['prosource', 'assets', connectionId],
    queryFn: () => getConnectionAssets(connectionId),
  })

  const selectedAsset = useMemo(
    () => assets?.find((a) => a.name === selectedAssetName) || null,
    [assets, selectedAssetName]
  )

  const { data: projectMeta } = useQuery({
    queryKey: ['prosource', 'project-meta', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_project_metadata'),
  })

  // Fetch record details if recordId is present
  // Note: ProSource records need context (assetName) which we have from URL
  const { data: record, isLoading: isLoadingRecord } = useQuery({
    queryKey: ['prosource', 'record', connectionId, selectedAssetName, activeRecordId],
    queryFn: async () => {
      // In ProSource, we usually query the record by its PK from the table
      // For now, we assume the 'activeRecordId' is enough to identify it
      // if the backend 'get_record' is implemented, or we fetch it via SQL.
      const res = await getConnectionMetadata(connectionId, 'execute_query', {
        query: `SELECT * FROM ${selectedAssetName} WHERE ID = '${activeRecordId}' OR WELL_ID = '${activeRecordId}' OR UWI = '${activeRecordId}'`,
        limit: 1,
      })
      return res?.results?.[0] || null
    },
    enabled: !!activeRecordId && !!selectedAssetName,
  })

  // Specialized queries for global tabs
  const { data: docData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['prosource', 'global-docs', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_all_documents', { limit: 100 }),
    enabled: activeService === 'documents',
  })

  const { data: accountData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['prosource', 'accounts', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_accounts', { limit: 100 }),
    enabled: activeService === 'security',
  })

  const renderService = () => {
    switch (activeService) {
      case 'dashboard':
        return <ProSourceDashboard connectionId={connectionId} assets={assets || []} />
      case 'mesh':
        return (
          <ProSourceMeshView
            connectionId={connectionId}
            assets={assets || []}
            selectedAsset={selectedAsset}
            onSelectAsset={setAsset}
            onSelectEntity={(record) =>
              setRecordId(record.ID || record.WELL_ID || record.UWI || record.id)
            }
            customQuery={sqlQuery || undefined}
            onApplyQuery={setSql}
            pageOffset={pageOffset}
            onOffsetChange={setOffset}
          />
        )
      case 'registry':
        return <ProSourceRegistryView assets={assets || []} />
      case 'reference':
        return <ProSourceReferenceView connectionId={connectionId} />
      case 'documents':
        return <ProSourceDocumentView connectionId={connectionId} />
      case 'security':
        return <ProSourceSecurityView connectionId={connectionId} />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Scanning Seabed Metadata...
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      <ProSourceHubHeader
        connectionName={connection?.name}
        projectName={connection?.config?.project_name}
        schema={connection?.config?.db_schema}
        crs={projectMeta?.crs?.NAME || projectMeta?.crs?.name}
        unitSystem={projectMeta?.unit_system}
        onBack={() => navigate('/explorer')}
      >
        <div className="flex items-center gap-6">
          <ProSourceHubNav activeService={activeService} onServiceChange={setService} />
        </div>
      </ProSourceHubHeader>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeService}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-hidden"
          >
            {renderService()}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {activeRecordId && (
            <ProSourceRecordInspector
              connectionId={connectionId}
              assetName={selectedAssetName || undefined}
              record={record}
              isLoading={isLoadingRecord}
              onClose={() => setRecordId(null)}
              onNavigate={(id, asset) => {
                updateParams({ recordId: id, asset: asset || selectedAssetName, offset: '0' })
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
