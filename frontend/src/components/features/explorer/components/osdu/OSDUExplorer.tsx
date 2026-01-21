import React, { useMemo, useState, useEffect } from 'react'
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
import { OSDUSidebar, type OSDUService } from '../../osdu/OSDUSidebar'
import { OSDUDashboard } from '../../osdu/OSDUDashboard'
import { OSDUMeshView } from '../../osdu/OSDUMeshView'
import { OSDURegistryView } from '../../osdu/OSDURegistryView'
import { OSDUFileBrowser } from '../../osdu/OSDUFileBrowser'
import { OSDUGovernanceView } from '../../osdu/OSDUGovernanceView'
import { OSDUWorkflowView } from '../../osdu/OSDUWorkflowView'
import { OSDUPolicyView } from '../../osdu/OSDUPolicyView'
import { OSDUSeismicView } from '../../osdu/OSDUSeismicView'
import { OSDUWellDeliveryView } from '../../osdu/OSDUWellDeliveryView'
import { OSDURecordInspector } from '../../osdu/OSDURecordInspector'
import { OSDUAICommandCenter } from '../../osdu/OSDUAICommandCenter'
import { DeleteConfirmationDialog } from '../../osdu/shared/DeleteConfirmationDialog'
import { Sparkles, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OSDUExplorerProps {
  connectionId: number
}

export const OSDUExplorer: React.FC<OSDUExplorerProps> = ({ connectionId }) => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // --- Local State ---
  const [isAICommandCenterOpen, setIsAICommandCenterOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentCursor, setCurrentCursor] = useState<string | null>(null)
  const [recordToDelete, setRecordIdToDelete] = useState<string | null>(null)

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
    // Sync: Clear search query when switching kinds to avoid stale filters
    updateParams({
      kind,
      service: kind ? 'mesh' : activeService,
      recordId: null,
      offset: '0',
      q: '*',
    })
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
          : {
              kind: selectedKind || '*:*:*:*',
              query: searchQuery,
              limit,
              offset: pageOffset,
              returnedFields: ['id', 'kind', 'legal', 'acl', 'data'],
            }

      const resp = await getConnectionMetadata(connectionId, method, params)
      if (resp.cursor) setCurrentCursor(resp.cursor)
      return resp
    },
    enabled: !!connectionId && activeService === 'mesh',
  })

  const results = useMemo(() => searchResponse?.results || [], [searchResponse])
  const totalCount = useMemo(() => searchResponse?.total_count || 0, [searchResponse])

  // Record Deep Dive (Optimized to 1 call)
  const {
    data: record,
    isLoading: isLoadingRecord,
    isError: isRecordError,
    error: recordError,
  } = useQuery({
    queryKey: ['osdu', 'record', connectionId, activeRecordId],
    queryFn: async () => {
      // OSDU IDs from Search often include a version suffix (e.g. :123456789)
      // Storage service GET records/{id} usually expects the UNVERSIONED ID.
      // We strip the version suffix only if it's a long numeric string at the end.
      const cleanId = activeRecordId!.replace(/:\d{10,}$/, '').replace(/:\d{4,9}$/, '')

      return getConnectionMetadata(connectionId, 'get_record_deep_dive', {
        record_id: cleanId,
      })
    },
    enabled: !!activeRecordId,
    retry: false,
  })

  // Handle Record Fetch Error
  useEffect(() => {
    if (isRecordError && recordError) {
      let msg = (recordError as any).message || 'Unknown error'
      try {
        // Attempt to parse standard backend error structure or JSON string
        if ((recordError as any).response?.data?.detail) {
          msg = (recordError as any).response.data.detail
        } else {
          const parsed = JSON.parse(msg)
          if (parsed.detail) msg = parsed.detail
        }
      } catch {
        // Fallback to raw message if parsing fails
      }

      toast.error('Unable to inspect record', {
        description: msg.length > 100 ? msg.substring(0, 100) + '...' : msg,
      })
      setRecordId(null)
    }
  }, [isRecordError, recordError])

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

  // --- New Services Queries ---
  const { data: workflows = [] } = useQuery({
    queryKey: ['osdu', 'workflows', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_workflows', {}),
    enabled: activeService === 'workflow',
  })

  const { data: policies = [] } = useQuery({
    queryKey: ['osdu', 'policies', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_policies', {}),
    enabled: activeService === 'policy',
  })

  const {
    data: wellboreData = { fields: [], wellbores: [], logs: [], trajectories: [] },
    isLoading: isWellboreLoading,
  } = useQuery({
    queryKey: ['osdu', 'wellbore', connectionId, pageOffset],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'get_well_domain_overview', {
        offset: pageOffset,
        limit: 50,
      }),
    enabled: activeService === 'well-delivery',
  })

  const {
    data: seismicData = { projects: [], traces: [], bingrids: [], interpretations: [] },
    isLoading: isSeismicLoading,
  } = useQuery({
    queryKey: ['osdu', 'seismic', connectionId, pageOffset],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'get_seismic_domain_overview', {
        offset: pageOffset,
        limit: 50,
      }),
    enabled: activeService === 'seismic',
  })

  const { data: health } = useQuery({
    queryKey: ['osdu', 'health', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'check_health', {}),
    refetchInterval: 30000,
  })

  const downloadMutation = useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const cleanId = id.replace(/:\d+$/, '')
      const data = await getConnectionMetadata(connectionId, 'download_file', { file_id: cleanId })
      return data
    },
    onSuccess: (data, variables) => {
      // Handle direct file download
      try {
        // If data is a base64 string (which it should be from backend), decode it
        let content = data
        if (typeof data === 'string') {
          try {
            // Check if it's base64-ish
            const binaryString = window.atob(data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            content = bytes
          } catch (e) {
            // Not base64 or failed to decode, assume raw string or leave as is
          }
        }

        const blob = new Blob([content], { type: 'application/octet-stream' })
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = variables.name || `download-${Date.now()}.bin`
        link.click()
        window.URL.revokeObjectURL(link.href)
        toast.success(`Download started: ${variables.name}`)
      } catch (e) {
        toast.error('Failed to process download')
      }
    },
    onError: (err: any) => {
      let msg = err.message || 'Unknown error'
      try {
        if (err.response?.data?.detail) {
          msg = err.response.data.detail
        } else {
          const parsed = JSON.parse(msg)
          if (parsed.detail) msg = parsed.detail
        }
      } catch {
        // Fallback to raw message if parsing fails
      }
      toast.error('Download failed', { description: msg })
    },
  })

  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const cleanId = recordId.replace(/:\d+$/, '')
      return getConnectionMetadata(connectionId, 'delete_record', { record_id: cleanId })
    },
    onSuccess: () => {
      toast.success('Record deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['osdu', 'search'] })
      setRecordId(null)
    },
    onError: (err: any) => {
      toast.error('Failed to delete record', {
        description: err.response?.data?.detail || err.message,
      })
    },
  })

  const updateRecordMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: any }) => {
      const cleanId = recordId.replace(/:\d+$/, '')
      return getConnectionMetadata(connectionId, 'update_record', {
        record_id: cleanId,
        data,
      })
    },
    onSuccess: () => {
      toast.success('Record updated successfully')
      queryClient.invalidateQueries({ queryKey: ['osdu', 'record', connectionId, activeRecordId] })
      queryClient.invalidateQueries({ queryKey: ['osdu', 'search'] })
    },
    onError: (err: any) => {
      toast.error('Failed to update record', {
        description: err.response?.data?.detail || err.message,
      })
    },
  })

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background relative overflow-hidden">
        <OSDUHubHeader
          connectionName={connection?.name}
          partitionId={partitionId}
          onBack={() => navigate('/explorer')}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground transition-all"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </Button>
            <div className="h-8 w-px bg-border/10 mx-2" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/20 border border-border/10 shadow-inner">
              <Activity
                size={12}
                className={cn(
                  health?.status === 'healthy'
                    ? 'text-emerald-500 animate-pulse'
                    : 'text-destructive'
                )}
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {health?.status === 'healthy' ? 'Partition Online' : 'Degraded Mesh'}
              </span>
            </div>
          </div>
        </OSDUHubHeader>

        <OSDUAICommandCenter
          isOpen={isAICommandCenterOpen}
          onClose={() => setIsAICommandCenterOpen(false)}
          onApplyQuery={handleApplyAIQuery}
        />

        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* SIDEBAR NAVIGATION */}
          <OSDUSidebar
            activeService={activeService}
            onServiceChange={setService}
            isCollapsed={isSidebarCollapsed}
            onToggleAI={() => setIsAICommandCenterOpen(true)}
          />

          {/* MAIN VIEWPORT */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              {activeService === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUDashboard
                    kinds={kinds}
                    groups={groups}
                    legalTags={legalTags}
                    health={health}
                  />
                </motion.div>
              )}

              {activeService === 'mesh' && (
                <motion.div
                  key="mesh"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full overflow-hidden"
                >
                  <OSDUMeshView
                    kinds={kinds}
                    onRefreshKinds={refetchKinds}
                    searchQuery={searchQuery}
                    onQueryChange={setQuery}
                    selectedKind={selectedKind}
                    onKindChange={setKind}
                    searchResults={{ results, total_count: totalCount }}
                    isLoading={isSearching}
                    onExecute={refetchSearch}
                    onSelectRecord={setRecordId}
                    onDeleteRecord={(recordId) => {
                      setRecordIdToDelete(recordId)
                    }}
                    pageOffset={pageOffset}
                    onOffsetChange={setOffset}
                    limit={limit}
                    onToggleAI={() => setIsAICommandCenterOpen(true)}
                  />
                </motion.div>
              )}

              {activeService === 'registry' && (
                <motion.div
                  key="registry"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDURegistryView
                    kinds={kinds}
                    onSelectKind={setKind}
                    isLoading={isLoadingKinds}
                    onRefresh={refetchKinds}
                  />
                </motion.div>
              )}

              {activeService === 'storage' && (
                <motion.div
                  key="storage"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUFileBrowser connectionId={connectionId} />
                </motion.div>
              )}

              {(activeService === 'identity' || activeService === 'compliance') && (
                <motion.div
                  key="gov"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUGovernanceView
                    connectionId={connectionId}
                    initialMode={activeService as any}
                  />
                </motion.div>
              )}

              {activeService === 'workflow' && (
                <motion.div
                  key="workflow"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUWorkflowView workflows={workflows} />
                </motion.div>
              )}

              {activeService === 'policy' && (
                <motion.div
                  key="policy"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUPolicyView policies={policies} />
                </motion.div>
              )}

              {activeService === 'well-delivery' && (
                <motion.div
                  key="well-delivery"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUWellDeliveryView
                    data={wellboreData}
                    onInspect={setRecordId}
                    pageOffset={pageOffset}
                    onOffsetChange={setOffset}
                    limit={50}
                    isLoading={isWellboreLoading}
                  />
                </motion.div>
              )}

              {activeService === 'seismic' && (
                <motion.div
                  key="seismic"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <OSDUSeismicView
                    data={seismicData}
                    onInspect={setRecordId}
                    pageOffset={pageOffset}
                    onOffsetChange={setOffset}
                    limit={50}
                    isLoading={isSeismicLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {activeRecordId && (
            <OSDURecordInspector
              record={record}
              isLoading={isLoadingRecord}
              onClose={() => setRecordId(null)}
              onNavigate={setRecordId}
              onDownload={() => {
                if (!record) return
                const name =
                  record.details?.data?.DatasetProperties?.FileSourceInfo?.Name ||
                  record.details?.id?.split(':').pop() ||
                  'dataset.bin'
                downloadMutation.mutate({ id: record.details.id, name })
              }}
              onDelete={() => {
                setRecordIdToDelete(activeRecordId)
              }}
              isDeleting={deleteRecordMutation.isPending}
              onUpdate={(data) => updateRecordMutation.mutate({ recordId: activeRecordId, data })}
              isUpdating={updateRecordMutation.isPending}
            />
          )}
        </AnimatePresence>

        <DeleteConfirmationDialog
          open={!!recordToDelete}
          onOpenChange={(open) => !open && setRecordIdToDelete(null)}
          onConfirm={() => {
            if (recordToDelete) {
              deleteRecordMutation.mutate(recordToDelete)
            }
          }}
          isDeleting={deleteRecordMutation.isPending}
        />
      </div>
    </TooltipProvider>
  )
}
