 
import React from 'react'
import { motion } from 'framer-motion'
import { MemberCard } from './MemberCard'

interface MembersGridProps {
  members: any[]
  isAdmin: boolean
  currentUser: any
  workspaceId?: number
  queryClient: any
}

export const MembersGrid: React.FC<MembersGridProps> = ({
  members,
  isAdmin,
  currentUser,
  workspaceId,
  queryClient,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
      {members.map((member) => (
        <motion.div
          key={member.user_id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <MemberCard
            member={member}
            isAdmin={isAdmin}
            currentUser={currentUser}
            workspaceId={workspaceId}
            queryClient={queryClient}
          />
        </motion.div>
      ))}
    </div>
  )
}
