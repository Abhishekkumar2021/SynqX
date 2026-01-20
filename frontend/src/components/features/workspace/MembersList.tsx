import React from 'react'
import { motion } from 'framer-motion'
import { MemberRow } from './MemberRow'

interface MembersListProps {
  members: any[]
  isAdmin: boolean
  currentUser: any
  workspaceId?: number
  queryClient: any
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  isAdmin,
  currentUser,
  workspaceId,
  queryClient,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent"
    >
      <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="col-span-12 md:col-span-5">Teammate Identity</div>
        <div className="col-span-6 md:col-span-3">Permission Level</div>
        <div className="col-span-6 md:col-span-2">Auth Date</div>
        {isAdmin && <div className="col-span-12 md:col-span-2 text-right pr-4">Control</div>}
      </div>

      <div className="divide-y divide-border/30">
        {members.map((member) => (
          <MemberRow
            key={member.user_id}
            member={member}
            isAdmin={isAdmin}
            currentUser={currentUser}
            workspaceId={workspaceId}
            queryClient={queryClient}
          />
        ))}
      </div>
    </motion.div>
  )
}
