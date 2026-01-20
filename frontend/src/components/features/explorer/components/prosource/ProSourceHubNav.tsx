import React from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Layers, FileSearch, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProSourceService = 'dashboard' | 'inventory' | 'registry' | 'spatial'

interface ProSourceHubNavProps {
  activeService: ProSourceService
  onServiceChange: (service: ProSourceService) => void
}

const SERVICES: { id: ProSourceService; label: string; icon: any; color: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-400' },
  { id: 'inventory', label: 'Inventory', icon: Layers, color: 'text-blue-400' },
  { id: 'registry', label: 'Registry', icon: FileSearch, color: 'text-violet-400' },
  { id: 'spatial', label: 'Spatial', icon: MapIcon, color: 'text-emerald-400' },
]

export const ProSourceHubNav: React.FC<ProSourceHubNavProps> = ({
  activeService,
  onServiceChange,
}) => {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
      {SERVICES.map((service) => {
        const Icon = service.icon
        const isActive = activeService === service.id

        return (
          <button
            key={service.id}
            onClick={() => onServiceChange(service.id)}
            className={cn(
              'relative flex items-center gap-2.5 px-6 py-4 transition-all duration-300 group',
              isActive ? 'text-white' : 'text-muted-foreground/60 hover:text-muted-foreground'
            )}
          >
            <Icon
              size={16}
              className={cn(
                'transition-transform duration-300 group-hover:scale-110',
                isActive ? service.color : 'text-current'
              )}
            />
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">
              {service.label}
            </span>

            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-600 shadow-[0_-4px_12px_rgba(99,102,241,0.4)]"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
