import { useContext } from 'react'
import { WorkspaceContext } from '@/context/WorkspaceContext'
import { WorkspaceRole } from '@/lib/enums'

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }

  const { userRole } = context

  return {
    ...context,
    isAdmin: userRole === WorkspaceRole.ADMIN,
    isEditor: userRole === WorkspaceRole.ADMIN || userRole === WorkspaceRole.EDITOR,
    isViewer: true, // Everyone is at least a viewer
    role: userRole,
  }
}
