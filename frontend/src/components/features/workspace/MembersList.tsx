/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { motion } from 'framer-motion';
import { MemberRow } from './MemberRow';

interface MembersListProps {
    members: any[];
    isAdmin: boolean;
    currentUser: any;
    workspaceId?: number;
    queryClient: any;
}

export const MembersList: React.FC<MembersListProps> = ({
    members,
    isAdmin,
    currentUser,
    workspaceId,
    queryClient
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-w-full"
        >
            <table className="w-full border-collapse border-spacing-0">
                <thead>
                    <tr className="bg-muted/20 border-b border-border/40 sticky top-0 z-20 backdrop-blur-md">
                        <th className="text-left px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-border/5">
                            Teammate Identity
                        </th>
                        <th className="text-left px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-border/5">
                            Permission Level
                        </th>
                        <th className="text-left px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-border/5">
                            Auth Date
                        </th>
                        {isAdmin && (
                            <th className="text-right px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 pr-10">
                                Control
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
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
                </tbody>
            </table>
        </motion.div>
    );
};