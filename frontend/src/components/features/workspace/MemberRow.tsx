 
import React from 'react'
import { Trash2, Shield, MoreVertical } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMutation } from '@tanstack/react-query'
import { updateWorkspaceMemberRole, removeWorkspaceMember } from '@/lib/api'
import { WorkspaceRole } from '@/lib/enums'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface MemberRowProps {
  member: any
  isAdmin: boolean
  currentUser: any
  workspaceId?: number
  queryClient: any
}

export const MemberRow: React.FC<MemberRowProps> = ({
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
        'group grid grid-cols-12 gap-4 items-center px-6 py-3 transition-all duration-200 cursor-pointer relative',
        'border-b border-border/30 last:border-0',
        isSelf ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1',
        'before:bg-primary before:scale-y-0 before:transition-transform before:duration-200',
        !isSelf && 'hover:before:scale-y-100'
      )}
    >
      {/* Identity */}
      <div className="col-span-12 md:col-span-5 flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-border/40 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500">
          <AvatarFallback
            className={cn(
              'text-xs font-bold',
              isSelf ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}
          >
            {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
            {member.full_name || 'Anonymous User'}
            {isSelf && (
              <Badge
                variant="outline"
                className="text-[7px] font-bold uppercase h-3.5 px-1.5 border-primary/20 text-primary"
              >
                You
              </Badge>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium truncate opacity-60">
            {member.email}
          </span>
        </div>
      </div>

      {/* Permission */}
      <div className="col-span-6 md:col-span-3 flex items-center">
        {isAdmin && !isSelf ? (
          <Select
            defaultValue={member.role}
            onValueChange={(v) => updateRoleMutation.mutate({ role: v })}
            disabled={updateRoleMutation.isPending}
          >
            <SelectTrigger className="h-8 w-28 rounded-lg bg-background/50 border-border/40 text-[9px] uppercase tracking-widest focus:ring-primary/20 transition-all hover:bg-background shadow-none text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60 shadow-2xl">
              <SelectItem value={WorkspaceRole.ADMIN} className="text-xs font-bold py-2.5">
                Admin
              </SelectItem>
              <SelectItem value={WorkspaceRole.EDITOR} className="text-xs font-bold py-2.5">
                Editor
              </SelectItem>
              <SelectItem value={WorkspaceRole.VIEWER} className="text-xs font-bold py-2.5">
                Viewer
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          getRoleBadge(member.role)
        )}
      </div>

      {/* Date */}
      <div className="col-span-6 md:col-span-2 flex items-center">
        <span className="text-[11px] font-bold text-muted-foreground/40 tabular-nums uppercase">
          {new Date(member.joined_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-12 md:col-span-2 flex items-center justify-end pr-2">
        {isAdmin ? (
          !isSelf ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-muted"
                >
                  <MoreVertical size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-2xl glass-card border-border/60 shadow-2xl p-1.5 min-w-48"
              >
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-xl font-bold text-xs py-2.5"
                  onClick={() => removeMemberMutation.mutate()}
                >
                  <Trash2 size={14} className="mr-2" /> Revoke Access
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Shield className="h-4 w-4 text-primary/20" />
          )
        ) : null}
      </div>
    </div>
  )
}
