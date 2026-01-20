import React from 'react'
import { Shield, History, Plus, Edit, Trash2, Settings, UserPlus, LogIn } from 'lucide-react'
import type { AuditLog } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface DashboardAuditFeedProps {
  logs: AuditLog[]
}

export const DashboardAuditFeed: React.FC<DashboardAuditFeedProps> = ({ logs }) => {
  const getIcon = (eventType: string) => {
    if (eventType.includes('create') || eventType.includes('add'))
      return <Plus className="h-4 w-4 text-emerald-500" />
    if (eventType.includes('update') || eventType.includes('edit'))
      return <Edit className="h-4 w-4 text-amber-500" />
    if (eventType.includes('delete') || eventType.includes('remove'))
      return <Trash2 className="h-4 w-4 text-rose-500" />
    if (eventType.includes('login') || eventType.includes('auth'))
      return <LogIn className="h-4 w-4 text-blue-500" />
    if (eventType.includes('member')) return <UserPlus className="h-4 w-4 text-purple-500" />
    if (eventType.includes('workspace')) return <Settings className="h-4 w-4 text-indigo-500" />
    return <History className="h-4 w-4 text-muted-foreground" />
  }

  const formatEventName = (name: string) => {
    return name.replace(/\./g, ' ').replace(/_/g, ' ').toUpperCase()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
            <div className="p-6 bg-muted/20 rounded-[2rem] border border-border/50 mb-4">
              <Shield className="h-10 w-10 opacity-20" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest ">
              No recent system activity
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-muted/20 transition-colors flex gap-4 items-start group"
              >
                <div className="mt-1 shrink-0 p-2 bg-muted/30 rounded-xl group-hover:scale-110 transition-transform">
                  {getIcon(log.event_type)}
                </div>
                <div className="space-y-1 overflow-hidden flex-1">
                  <p className="text-sm font-bold leading-tight text-foreground/90 group-hover:text-foreground transition-colors truncate">
                    {formatEventName(log.event_type)}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                    {log.target_type && (
                      <>
                        <div className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60">
                          {log.target_type}
                        </span>
                      </>
                    )}
                    <div className="h-1 w-1 rounded-full bg-border" />
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-[0.2em]',
                        log.status === 'success' ? 'text-emerald-500' : 'text-rose-500'
                      )}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
