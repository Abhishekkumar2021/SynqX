import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Key, RefreshCw, Trash2, Plus, Users, ShieldCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatNumber } from '@/lib/utils'
import { getConnectionMetadata } from '@/lib/api/connections'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

// Shared components
import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { OSDUDiscoveryEmptyState } from './shared/OSDUDiscoveryEmptyState'
import { OSDUPlatformLoader } from './shared/OSDUPlatformLoader'
import { OSDUToolbar } from './shared/OSDUToolbar'
import { DeleteConfirmationDialog } from './shared/DeleteConfirmationDialog'

// New Sub-Components
import { GovernanceGrid } from './governance/GovernanceGrid'
import { GovernanceList } from './governance/GovernanceList'
import { Button } from '@/components/ui/button'

interface OSDUGovernanceViewProps {
  connectionId: number
  initialMode: 'identity' | 'compliance'
}

export const OSDUGovernanceView: React.FC<OSDUGovernanceViewProps> = ({
  connectionId,
  initialMode,
}) => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const method = initialMode === 'identity' ? 'delete_group' : 'delete_legal_tag'
      const paramKey = initialMode === 'identity' ? 'group_email' : 'name'
      return getConnectionMetadata(connectionId, method, { [paramKey]: id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['osdu', initialMode === 'identity' ? 'groups' : 'legal'],
      })
      toast.success(`${initialMode === 'identity' ? 'Group' : 'Legal Tag'} deleted`)
    },
    onError: (err: any) => {
      toast.error('Deletion failed', { description: err.message })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const method = initialMode === 'identity' ? 'delete_group' : 'delete_legal_tag'
      const paramKey = initialMode === 'identity' ? 'group_email' : 'name'

      const promises = ids.map((id) =>
        getConnectionMetadata(connectionId, method, { [paramKey]: id })
      )
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['osdu', initialMode === 'identity' ? 'groups' : 'legal'],
      })
      toast.success(`Successfully deleted ${selectedIds.size} items`)
      setSelectedIds(new Set())
      setIsDeleteAlertOpen(false)
    },
    onError: (err: any) => {
      toast.error('Bulk deletion failed', { description: err.message })
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = initialMode === 'identity' ? 'create_group' : 'create_legal_tag'
      return getConnectionMetadata(connectionId, method, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['osdu', initialMode === 'identity' ? 'groups' : 'legal'],
      })
      toast.success(`Successfully created ${initialMode === 'identity' ? 'group' : 'legal tag'}`)
    },
    onError: (err: any) => {
      toast.error('Creation failed', { description: err.message })
    },
  })

  // --- Data Queries ---
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['osdu', 'groups', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_groups', {}),
    enabled: initialMode === 'identity',
  })

  const { data: legalTags = [], isLoading: isLoadingLegal } = useQuery({
    queryKey: ['osdu', 'legal', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'get_legal_tags', {}),
    enabled: initialMode === 'compliance',
  })

  const allItems = initialMode === 'identity' ? groups : legalTags
  const items = useFuzzySearch(allItems, search, {
    keys: ['name', 'email', 'description'],
    threshold: 0.3,
  })

  // --- Actions ---
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    const allIds = items.map((i: any) => i.id || i.name || i.email)
    if (selectedIds.size === items.length && items.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(allIds))
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['osdu', initialMode === 'identity' ? 'groups' : 'legal'],
    })
    toast.success('Refreshing governance data...')
  }

  const isLoading = isLoadingGroups || isLoadingLegal

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/2 animate-in fade-in duration-500">
      <OSDUPageHeader
        icon={initialMode === 'identity' ? Users : ShieldCheck}
        title={initialMode === 'identity' ? 'Identity Hub' : 'Compliance Suite'}
        subtitle={initialMode === 'identity' ? 'Entitlement Management' : 'Legal Framework'}
        iconColor={initialMode === 'identity' ? 'text-purple-500' : 'text-rose-500'}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          initialMode === 'identity' ? 'Find security domains...' : 'Find legal tags...'
        }
        onRefresh={handleRefresh}
        isLoading={isLoading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={items.length}
        countLabel={initialMode === 'identity' ? 'Groups' : 'Tags'}
        actions={
          <Button
            size="sm"
            onClick={() => {
              /* Trigger Create Modal */
            }}
            className={cn(
              'h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-opacity-20',
              initialMode === 'identity'
                ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'
                : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
            )}
          >
            <Plus size={14} strokeWidth={3} />
            {initialMode === 'identity' ? 'Create Group' : 'Create Tag'}
          </Button>
        }
      />

      {/* MAIN LIST DISCOVERY */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <OSDUToolbar
          totalAvailable={items.length}
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          isAllSelected={items.length > 0 && selectedIds.size === items.length}
          onToggleSelectAll={toggleSelectAll}
          isLoading={isLoading}
          onBulkDelete={() => setIsDeleteAlertOpen(true)}
        />

        <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2">
          {isLoading ? (
            <OSDUPlatformLoader
              message="Materializing security context..."
              iconColor={initialMode === 'identity' ? 'text-purple-500' : 'text-rose-500'}
            />
          ) : items.length === 0 ? (
            <OSDUDiscoveryEmptyState
              icon={Key}
              title="Registry Dormant"
              description="No governance records resolved. Update your technical scope or refresh the hub."
            />
          ) : (
            <ScrollArea className="h-full">
              <div
                className={cn(
                  'w-full mx-auto transition-all duration-500',
                  viewMode === 'grid' ? 'p-6 max-w-[1600px]' : 'p-0'
                )}
              >
                {viewMode === 'grid' ? (
                  <GovernanceGrid
                    items={items}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    initialMode={initialMode}
                  />
                ) : (
                  <GovernanceList
                    items={items}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    initialMode={initialMode}
                  />
                )}
                {viewMode === 'grid' && <div className="h-24" />}
              </div>
            </ScrollArea>
          )}
        </div>

        <DeleteConfirmationDialog
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
          onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
          isDeleting={bulkDeleteMutation.isPending}
          title={`Delete ${selectedIds.size} ${initialMode === 'identity' ? 'Groups' : 'Legal Tags'}?`}
          description={`Are you sure you want to permanently delete these ${selectedIds.size} items from OSDU? This action is irreversible.`}
        />
      </div>
    </div>
  )
}
