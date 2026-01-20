import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getWorkspaceMembers } from '@/lib/api'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useAuth } from '@/hooks/useAuth'
import { useZenMode } from '@/hooks/useZenMode'
import { cn } from '@/lib/utils'
import { PageMeta } from '@/components/common/PageMeta'
import { useSearchParams } from 'react-router-dom'

// Segregated Components
import { TeamHeader } from '@/components/features/workspace/TeamHeader'
import { MembersTab } from '@/components/features/workspace/MembersTab'

export const WorkspaceTeamPage: React.FC = () => {
  const { activeWorkspace, isAdmin } = useWorkspace()
  const { user: currentUser } = useAuth()
  const { isZenMode } = useZenMode()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL Synced State
  const viewMode = (searchParams.get('view') as 'list' | 'grid') || 'list'
  const searchQuery = searchParams.get('q') || ''

  const setViewMode = (val: 'list' | 'grid') => {
    setSearchParams((prev) => {
      prev.set('view', val)
      return prev
    })
  }

  const setSearchQuery = (val: string) => {
    setSearchParams((prev) => {
      if (val) prev.set('q', val)
      else prev.delete('q')
      return prev
    })
  }

  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace-members', activeWorkspace?.id],
    queryFn: () => getWorkspaceMembers(activeWorkspace!.id),
    enabled: !!activeWorkspace,
  })

  const filteredMembers = useMemo(() => {
    if (!members) return []
    return members.filter(
      (m) =>
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [members, searchQuery])

  return (
    <div
      className={cn(
        'flex flex-col h-full gap-6 md:gap-8 px-1',
        isZenMode ? 'min-h-[calc(100vh-4rem)]' : 'min-h-[80vh]'
      )}
    >
      <PageMeta title="Team Management" description="Manage your workspace team and permissions." />

      <TeamHeader />

      {/* --- Unified Registry Container --- */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
        <div className="flex-1 min-h-0 flex flex-col relative">
          <MembersTab
            key="members-tab"
            members={filteredMembers}
            isLoading={isLoading}
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isAdmin={isAdmin}
            currentUser={currentUser}
            workspaceId={activeWorkspace?.id}
            queryClient={queryClient}
          />
        </div>
      </div>
    </div>
  )
}
