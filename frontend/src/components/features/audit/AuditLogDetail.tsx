 
import React from 'react'
import { format } from 'date-fns'
import { User, Clock, Terminal, Box, Globe, Fingerprint } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { type AuditLog, type User as UserType } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { formatEventName } from '@/lib/utils/audit'

interface EventTypeInfo {
  icon: React.ReactNode
  color: string
  bgColor: string
  label: string
}

interface AuditLogDetailProps {
  log: AuditLog
  user?: UserType
  open: boolean
  onOpenChange: (open: boolean) => void
  eventTypeInfo: EventTypeInfo
}

export const AuditLogDetail: React.FC<AuditLogDetailProps> = ({
  log,
  user,
  open,
  onOpenChange,
  eventTypeInfo,
}) => {
  const { icon, color, bgColor } = eventTypeInfo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[2rem] glass-panel border-border/60 shadow-2xl p-0 overflow-hidden outline-none">
        <DialogHeader className="p-6 border-b border-border/20 bg-muted/10 relative overflow-hidden shrink-0">
          {/* Background Glow */}
          <div
            className={cn(
              'absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 rounded-full',
              bgColor
            )}
          />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/10 transition-transform group-hover:scale-110',
                  bgColor,
                  color
                )}
              >
                {React.cloneElement(icon as any, { className: 'h-6 w-6' })}
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-0.5">
                  <DialogTitle className="text-lg font-bold tracking-tight uppercase ">
                    {formatEventName(log.event_type)}
                  </DialogTitle>
                  <Badge
                    className={cn(
                      'font-bold uppercase text-[8px] tracking-[0.15em] px-2 py-0.5 rounded-md shadow-sm',
                      log.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {log.status}
                  </Badge>
                </div>
                <DialogDescription className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <Clock className="h-2.5 w-2.5" />
                  Captured {format(new Date(log.created_at), 'PPP p')}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {/* Metrics / Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl border border-border/40 bg-muted/5 flex flex-col gap-0.5">
              <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Actor ID
              </span>
              <span className="text-[10px] font-mono font-bold text-foreground">
                USR-{log.user_id}
              </span>
            </div>
            <div className="p-3 rounded-2xl border border-border/40 bg-muted/5 flex flex-col gap-0.5">
              <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Trace ID
              </span>
              <span className="text-[10px] font-mono font-bold text-primary/60">
                AUD-{log.id.toString().padStart(6, '0')}
              </span>
            </div>
            <div className="p-3 rounded-2xl border border-border/40 bg-muted/5 flex flex-col gap-0.5">
              <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Context
              </span>
              <span className="text-[10px] font-bold text-foreground uppercase tracking-tighter">
                {log.target_type || 'Global'}
              </span>
            </div>
          </div>

          {/* Security Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl border border-border/40 bg-muted/5 flex items-center gap-3">
              <div className="p-2 bg-background rounded-lg border border-border/40">
                <Globe className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  IP Address
                </span>
                <span className="text-[10px] font-mono font-bold text-foreground">
                  {log.ip_address || '0.0.0.0 (internal)'}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-2xl border border-border/40 bg-muted/5 flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-background rounded-lg border border-border/40 shrink-0">
                <Fingerprint className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Client Signature
                </span>
                <span
                  className="text-[10px] font-medium text-foreground truncate"
                  title={log.user_agent}
                >
                  {log.user_agent || 'Direct API / Agent'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actor Section */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1 flex items-center gap-1.5">
                <User className="h-3 w-3" /> Identity Profile
              </h4>
              <div className="p-4 rounded-3xl border border-border/40 bg-muted/20 backdrop-blur-sm flex items-center gap-3 group/actor hover:border-primary/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-1 ring-primary/20 shadow-inner group-hover/actor:rotate-6 transition-transform">
                  {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">
                    {user?.full_name || 'System Principal'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 font-medium truncate ">
                    {user?.email || 'synqx-automated-service'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resource Section */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1 flex items-center gap-1.5">
                <Box className="h-3 w-3" /> Target Resource
              </h4>
              <div className="p-4 rounded-3xl border border-border/40 bg-muted/20 backdrop-blur-sm space-y-2 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                    Resource Type
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-bold bg-background/50 h-4 px-1.5"
                  >
                    {log.target_type || 'Platform'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                    Resource Pointer
                  </span>
                  <span className="text-[10px] font-mono font-bold text-foreground">
                    {log.target_id ? `#${log.target_id}` : 'ROOT'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Explorer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-1.5">
                <Terminal className="h-3 w-3" /> Forensic Payload
              </h4>
              <Badge
                variant="outline"
                className="text-[7px] font-bold opacity-40 uppercase tracking-widest bg-muted/20 border-border/40 px-1.5 py-0"
              >
                JSON Payload
              </Badge>
            </div>
            <CodeBlock
              code={JSON.stringify(log.details, null, 2)}
              language="json"
              maxHeight="240px"
              className="rounded-3xl border-border/40 shadow-inner"
              rounded
            />
          </div>
        </div>

        <div className="p-5 bg-muted/5 border-t border-border/20 flex justify-between items-center px-8 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Immutable Audit Record
            </span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-tighter">
            Workspace ID: {log.workspace_id}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
