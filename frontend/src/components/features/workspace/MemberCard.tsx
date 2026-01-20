 
import React from 'react'
import { Trash2, Shield } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMutation } from '@tanstack/react-query'
import { updateWorkspaceMemberRole, removeWorkspaceMember } from '@/lib/api'
import { WorkspaceRole } from '@/lib/enums'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MemberCardProps {
  member: any
  isAdmin: boolean
  currentUser: any
  workspaceId?: number
  queryClient: any
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  isAdmin,
  currentUser,
  workspaceId,
  queryClient,
}) => {
  const isSelf = member.user_id === currentUser?.id

  const updateRoleMutation = useMutation({
    mutationFn: ({ role }: { role: string }) =>
      updateWorkspaceMemberRole(workspaceId!, member.user_id, role),
    onSuccess: () => {
      toast.success('Role Permissions Updated')
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
    },
    onError: (err: any) => {
      toast.error('Update Failed', { description: err.response?.data?.detail })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: () => removeWorkspaceMember(workspaceId!, member.user_id),
    onSuccess: () => {
      toast.success('Member access revoked')
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
    },
    onError: (err: any) => {
      toast.error('Revocation Failed', { description: err.response?.data?.detail })
    },
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case WorkspaceRole.ADMIN:
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            Admin
          </Badge>
        )
      case WorkspaceRole.EDITOR:
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
            Editor
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="hover:bg-muted">
            Viewer
          </Badge>
        )
    }
  }

  return (
    <div
      className={cn(
        'p-5 rounded-[2rem] border border-border/40 bg-muted/5 flex flex-col items-center text-center gap-4 transition-all duration-500 hover:shadow-2xl hover:border-primary/20 group relative',
        isSelf
          ? 'bg-primary/2 border-primary/20 ring-1 ring-primary/10'
          : 'bg-card/40 hover:bg-background'
      )}
    >
      <div className="absolute top-3 right-3">
        {isSelf ? <Shield className="h-3.5 w-3.5 text-primary opacity-40" /> : null}
      </div>
      <Avatar className="h-16 w-16 border-4 border-background shadow-xl group-hover:scale-110 transition-transform duration-500">
        <AvatarFallback
          className={cn(
            'text-lg font-bold',
            isSelf ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          )}
        >
          {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0 w-full mb-2">
        <span className="text-sm font-bold text-foreground truncate">
          {member.full_name || 'Active Member'}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium truncate opacity-60">
          {member.email}
        </span>
      </div>
      <div className="flex items-center justify-center w-full mt-auto gap-2">
        {isAdmin && !isSelf ? (
          <div className="flex items-center gap-1 w-full">
            <Select
              defaultValue={member.role}
              onValueChange={(v) => updateRoleMutation.mutate({ role: v })}
            >
              <SelectTrigger className="h-8 flex-1 rounded-xl bg-background/50 border-border/40 text-[9px] uppercase tracking-widest shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 shadow-2xl">
                <SelectItem value={WorkspaceRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={WorkspaceRole.EDITOR}>Editor</SelectItem>
                <SelectItem value={WorkspaceRole.VIEWER}>Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeMemberMutation.mutate()}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ) : (
          getRoleBadge(member.role)
        )}
      </div>
    </div>
  )
}
