import { createContext } from 'react'
import { type WorkspaceRead } from '@/lib/api'
import { WorkspaceRole } from '@/lib/enums'

export interface WorkspaceContextType {
  workspaces: WorkspaceRead[]
  activeWorkspace: WorkspaceRead | null
  userRole: WorkspaceRole | null
  isSwitching: boolean
  switchActiveWorkspace: (id: number) => void
  downloadWorkspaceContext: () => Promise<void>
  refreshWorkspaces: () => void
  isLoading: boolean
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)
