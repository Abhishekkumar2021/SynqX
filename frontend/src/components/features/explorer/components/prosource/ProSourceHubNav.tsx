import React from 'react'
import {
  LayoutDashboard,
  Search,
  Database,
  HardDrive,
  ShieldCheck,
  ListTree,
  Globe,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type ProSourceService =
  | 'dashboard'
  | 'mesh'
  | 'registry'
  | 'reference'
  | 'documents'
  | 'security'

interface ProSourceHubNavProps {
  activeService: ProSourceService
  onServiceChange: (service: ProSourceService) => void
}

const SERVICES: { id: ProSourceService; label: string; icon: any; color: string }[] = [
  { id: 'dashboard', label: 'Intelligence', icon: LayoutDashboard, color: 'text-blue-500' },
  { id: 'mesh', label: 'Entity Mesh', icon: Search, color: 'text-indigo-500' },
  { id: 'registry', label: 'Schema Catalog', icon: ListTree, color: 'text-emerald-500' },
  { id: 'reference', label: 'Standards', icon: Globe, color: 'text-amber-500' },
  { id: 'documents', label: 'Unstructured', icon: HardDrive, color: 'text-rose-500' },
  { id: 'security', label: 'Access Control', icon: ShieldCheck, color: 'text-cyan-500' },
]

export const ProSourceHubNav: React.FC<ProSourceHubNavProps> = ({
  activeService,
  onServiceChange,
}) => {
  return (
    <div className="flex items-center gap-0.5 bg-muted/10 p-0.5 rounded-xl border border-border/20 shadow-inner max-w-full overflow-x-auto no-scrollbar">
      {SERVICES.map((s) => {
        const Icon = s.icon
        const isActive = activeService === s.id
        return (
          <Button
            key={s.id}
            variant="ghost"
            size="sm"
            onClick={() => onServiceChange(s.id)}
            className={cn(
              'h-7 px-2.5 sm:px-3 rounded-lg gap-2 transition-all duration-200 font-bold uppercase text-[9px] tracking-widest shrink-0',
              isActive
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/40'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Icon size={12} className={cn(isActive ? s.color : 'opacity-40')} />
            <span className={cn('hidden lg:inline', isActive ? 'opacity-100' : 'opacity-60')}>
              {s.label}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
