 
import React from 'react'
import { motion } from 'framer-motion'
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm'
import { WorkspaceStatsSidebar } from './WorkspaceStatsSidebar'

interface SettingsTabProps {
  activeWorkspace: any
  isAdmin: boolean
  members?: any[]
  queryClient: any
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  activeWorkspace,
  isAdmin,
  members,
  queryClient,
}) => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex-1 min-h-0 flex flex-col"
    >
      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <WorkspaceSettingsForm
              activeWorkspace={activeWorkspace}
              isAdmin={isAdmin}
              queryClient={queryClient}
            />
            <WorkspaceStatsSidebar
              activeWorkspace={activeWorkspace}
              isAdmin={isAdmin}
              members={members}
              queryClient={queryClient}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
