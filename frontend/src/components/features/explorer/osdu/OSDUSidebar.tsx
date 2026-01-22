import React from 'react'
import {
  LayoutDashboard,
  Search,
  HardDrive,
  ShieldCheck,
  Users,
  Grid3X3,
  Zap,
  Scale,
  Activity,
  Sparkles,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type OSDUService =
  | 'dashboard'
  | 'mesh'
  | 'registry'
  | 'storage'
  | 'identity'
  | 'compliance'
  | 'workflow'
  | 'policy'
  | 'seismic'
  | 'well-delivery'

import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface OSDUSidebarProps {
  activeService: OSDUService
  onServiceChange: (service: OSDUService) => void
  isCollapsed?: boolean
  onToggleAI?: () => void
}

interface NavGroup {
  label: string
  items: { id: OSDUService; label: string; icon: any; color: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' }],
  },
  {
    label: 'Discovery',
    items: [
      { id: 'mesh', label: 'Data Mesh', icon: Search, color: 'text-indigo-500' },
      { id: 'well-delivery', label: 'Well Delivery', icon: Database, color: 'text-cyan-500' },
      { id: 'seismic', label: 'Seismic', icon: Activity, color: 'text-orange-500' },
    ],
  },
  {
    label: 'Technical',
    items: [
      { id: 'registry', label: 'Registry', icon: Grid3X3, color: 'text-emerald-500' },
      { id: 'storage', label: 'Storage', icon: HardDrive, color: 'text-amber-500' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { id: 'identity', label: 'Identity', icon: Users, color: 'text-purple-500' },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck, color: 'text-rose-500' },
      { id: 'policy', label: 'Policies', icon: Scale, color: 'text-cyan-500' },
    ],
  },
  {
    label: 'Orchestration',
    items: [{ id: 'workflow', label: 'Workflows', icon: Zap, color: 'text-yellow-500' }],
  },
]

export const OSDUSidebar: React.FC<OSDUSidebarProps> = ({
  activeService,
  onServiceChange,
  isCollapsed = false,
  onToggleAI,
}) => {
  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="border-r border-border/10 bg-muted/2 flex flex-col shrink-0 relative overflow-hidden"
    >
      <div className="flex-1 flex flex-col gap-6 p-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <TooltipProvider delayDuration={0}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              {!isCollapsed && (
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 whitespace-nowrap"
                >
                  {group.label}
                </motion.h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeService === item.id

                  const button = (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onServiceChange(item.id)}
                      className={cn(
                        'w-full rounded-xl gap-2.5 transition-all duration-200 font-bold text-[11px] group relative',
                        isCollapsed ? 'justify-center px-0 h-11' : 'justify-start h-9 px-2.5',
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center shrink-0',
                          isActive
                            ? 'bg-primary/20 scale-105 shadow-sm'
                            : 'bg-muted/20 group-hover:bg-muted/40',
                        )}
                      >
                        <Icon size={13} className={cn(isActive ? item.color : 'opacity-40')} />
                      </div>

                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="tracking-tight whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </Button>
                  )

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="font-bold uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg"
                        >
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <React.Fragment key={item.id}>{button}</React.Fragment>
                })}
              </div>
            </div>
          ))}

          {/* AI ASSISTANT TRIGGER */}
          <div className="pt-4 border-t border-border/10 mt-2">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleAI}
                    className="w-full h-12 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-all border border-primary/10"
                  >
                    <Sparkles size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="font-bold uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg"
                >
                  Neural Assistant
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                onClick={onToggleAI}
                className="w-full h-11 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-all border-primary/20 flex items-center justify-start gap-3 px-3 shadow-sm font-black uppercase text-[10px] tracking-widest"
              >
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Sparkles size={14} />
                </div>
                <span>Neural Assistant</span>
              </Button>
            )}
          </div>
        </TooltipProvider>
      </div>

      <div className="p-3 border-t border-border/10 bg-muted/5 overflow-hidden">
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-2xl bg-background/40 border border-border/40 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                Node v2.5 Online
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground/50 leading-tight font-bold uppercase tracking-tighter">
              Data Mesh Orchestrator
            </p>
          </motion.div>
        )}
      </div>
    </motion.aside>
  )
}
