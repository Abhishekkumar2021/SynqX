 
import React, { useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// API & Utils
import { getConnection, getConnectionMetadata } from '@/lib/api/connections'

// Shared Components
import { TooltipProvider } from '@/components/ui/tooltip'

// OSDU Hub Components
import { OSDUHubHeader } from '../../osdu/OSDUHubHeader'
import { OSDUHubNav, type OSDUService } from '../../osdu/OSDUHubNav'
import { OSDUDashboard } from '../../osdu/OSDUDashboard'
import { OSDUMeshView } from '../../osdu/OSDUMeshView'
import { OSDURegistryView } from '../../osdu/OSDURegistryView'
import { OSDUFileBrowser } from '../../osdu/OSDUFileBrowser'
import { OSDUGovernanceView } from '../../osdu/OSDUGovernanceView'
import { OSDURecordInspector } from '../../osdu/OSDURecordInspector'
import { OSDUAICommandCenter } from '../../osdu/OSDUAICommandCenter'

interface OSDUExplorerProps {
  connectionId: number
}

export const OSDUExplorer: React.FC<OSDUExplorerProps> = ({ connectionId }) => {
  // const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // --- Local State ---
  const [isAICommandCenterOpen, setIsAICommandCenterOpen] = useState(false)
  const [currentCursor, setCurrentCursor] = useState<string | null>(null)

  // --- URL Synced State ---
  const activeService = (searchParams.get('service') as OSDUService) || 'dashboard'
  const activeRecordId = searchParams.get('recordId') || null
  const selectedKind = searchParams.get('kind') || null
  const searchQuery = searchParams.get('q') || '*'
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

  const setService = (service: OSDUService) =>
    updateParams({ service, recordId: null, offset: '0' })
  const setKind = (kind: string | null) => {
    setCurrentCursor(null)
    updateParams({ kind, service: kind ? 'mesh' : activeService, recordId: null, offset: '0' })
  }
  const setRecordId = (recordId: string | null) => updateParams({ recordId })
  const setQuery = (q: string) => {
    setCurrentCursor(null)
    updateParams({ q, offset: '0' })
  }
  const setOffset = (o: number) => updateParams({ offset: String(o) })

  const handleApplyAIQuery = (lucene: string) => {
    // --- End-to-End Fix: Robust Extraction & Atomic Sync ---
    // 1. Extract 'kind' from Lucene if present (handles both quoted and unquoted)
    let extractedKind = selectedKind
    const kindMatch = lucene.match(/kind:\s*["']?([^"'\s]+)["']?/i)
    if (kindMatch && kindMatch[1]) {
      extractedKind = kindMatch[1]
    }

    // 2. Perform Atomic Update to avoid race conditions and double-fetching
    updateParams({
      q: lucene,
      kind: extractedKind,
      offset: '0',
      service: 'mesh',
      recordId: null,
    })

    setCurrentCursor(null)
    setIsAICommandCenterOpen(false)
  }

  // --- Data Queries ---

  const { data: connection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection(connectionId),
  })

  const partitionId =
    connection?.config?.data_partition_id || connection?.config?.partition || 'OSDU'

  // Kind Discovery
  const {
    data: kinds = [],
    isLoading: isLoadingKinds,
    refetch: refetchKinds,
  } = useQuery({
    queryKey: ['osdu', 'kinds', connectionId],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'discover_assets', { include_metadata: true }),
    select: (data) => data.map((a: any) => a.metadata),
  })

  // Mesh Discovery (Optimized with Cursor support)
  const {
    data: searchResponse,
    isLoading: isSearching,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['osdu', 'search', connectionId, selectedKind, searchQuery, pageOffset],
    queryFn: async () => {
      const method = currentCursor && pageOffset > 0 ? 'execute_cursor_query' : 'execute_query'
      const params =
        currentCursor && pageOffset > 0
          ? { cursor: currentCursor }
          : { kind: selectedKind || '*:*:*:*', query: searchQuery, limit, offset: pageOffset }

      const resp = await getConnectionMetadata(connectionId, method, params)
      if (resp.cursor) setCurrentCursor(resp.cursor)
      return resp
    },
    enabled: !!connectionId && activeService === 'mesh',
  })

  const results = useMemo(() => searchResponse?.results || [], [searchResponse])
  const totalCount = useMemo(() => searchResponse?.total_count || 0, [searchResponse])

  // Record Deep Dive
  const { data: record, isLoading: isLoadingRecord } = useQuery({
    queryKey: ['osdu', 'record', connectionId, activeRecordId],
    queryFn: async () => {
      const [details, relationships, ancestry, spatial] = await Promise.all([
        getConnectionMetadata(connectionId, 'get_record', { record_id: activeRecordId }),
        getConnectionMetadata(connectionId, 'get_record_relationships', {
          record_id: activeRecordId,
        }),
        getConnectionMetadata(connectionId, 'get_ancestry', { record_id: activeRecordId }),
        getConnectionMetadata(connectionId, 'get_spatial_data', { record_id: activeRecordId }),
      ])
      return { details, relationships, ancestry, spatial }
    },
    enabled: !!activeRecordId,
  })

  // Identity & Governance
  const { data: groups = [] } = useQuery({
    queryKey: ['osdu', 'groups', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_groups', {}),
    enabled: activeService === 'dashboard' || activeService === 'identity',
  })

  const { data: legalTags = [] } = useQuery({
    queryKey: ['osdu', 'legal', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_legal_tags', {}),
    enabled: activeService === 'dashboard' || activeService === 'compliance',
  })

  const downloadMutation = useMutation({
    mutationFn: (datasetId: string) =>
      getConnectionMetadata(connectionId, 'get_dataset_url', { dataset_registry_id: datasetId }),
    onSuccess: (url) => {
      if (url) window.open(url, '_blank')
    },
    onError: (err: any) => toast.error('File resolution failed', { description: err.message }),
  })

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background relative overflow-hidden">
        <OSDUHubHeader
          connectionName={connection?.name}
          partitionId={partitionId}
          onBack={() => navigate('/explorer')}
        >
          <OSDUHubNav activeService={activeService} onServiceChange={setService} />
        </OSDUHubHeader>

        <OSDUAICommandCenter
          isOpen={isAICommandCenterOpen}
          onClose={() => setIsAICommandCenterOpen(false)}
          onApplyQuery={handleApplyAIQuery}
        />

        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            {activeService === 'dashboard' && (
              <motion.div key="dashboard" className="h-full">
                <OSDUDashboard kinds={kinds} groups={groups} legalTags={legalTags} />
              </motion.div>
            )}

            {activeService === 'mesh' && (
              <motion.div key="mesh" className="h-full overflow-hidden">
                <OSDUMeshView
                  searchQuery={searchQuery}
                  onQueryChange={setQuery}
                  selectedKind={selectedKind}
                  onKindChange={setKind}
                  searchResults={{ results, total_count: totalCount }}
                  isLoading={isSearching}
                  onExecute={refetchSearch}
                  onSelectRecord={setRecordId}
                  pageOffset={pageOffset}
                  onOffsetChange={setOffset}
                  limit={limit}
                  onToggleAI={() => setIsAICommandCenterOpen(true)}
                />
              </motion.div>
            )}

            {activeService === 'registry' && (
              <motion.div key="registry" className="h-full">
                <OSDURegistryView
                  kinds={kinds}
                  onSelectKind={setKind}
                  isLoading={isLoadingKinds}
                  onRefresh={refetchKinds}
                />
              </motion.div>
            )}

            {activeService === 'storage' && (
              <motion.div key="storage" className="h-full">
                <OSDUFileBrowser connectionId={connectionId} />
              </motion.div>
            )}

            {(activeService === 'identity' || activeService === 'compliance') && (
              <motion.div key="gov" className="h-full">
                <OSDUGovernanceView
                  connectionId={connectionId}
                  initialMode={activeService as any}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {activeRecordId && (
            <OSDURecordInspector
              record={record}
              isLoading={isLoadingRecord}
              onClose={() => setRecordId(null)}
              onNavigate={setRecordId}
              onDownload={() => record && downloadMutation.mutate(record.details.id)}
            />
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
