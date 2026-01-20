import React from 'react'
import { motion } from 'framer-motion'
import { Globe, Plus, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExplorerZeroStateProps {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export const ExplorerZeroState: React.FC<ExplorerZeroStateProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
}) => (
  <motion.div
    key="none"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col items-center justify-center h-full text-center p-12 space-y-8"
  >
    <div className="p-10 rounded-[3rem] bg-primary/5 ring-1 ring-primary/10 shadow-2xl relative group">
      <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse group-hover:bg-primary/20 transition-all" />
      <Globe className="h-20 w-20 text-primary/40 relative z-10 group-hover:scale-110 transition-transform duration-500" />
    </div>
    <div className="space-y-3 max-w-sm">
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Select your source</h2>
      <p className="text-sm text-muted-foreground font-medium leading-relaxed opacity-80">
        Select a connection from the mesh directory on the left to begin deep-dive exploration.
      </p>
    </div>
    <div className="flex gap-3">
      <Button
        variant="outline"
        className="rounded-xl font-bold text-xs gap-2 border-border/40"
        onClick={onToggleSidebar}
      >
        {isSidebarCollapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Browse Sources
      </Button>
    </div>
  </motion.div>
)
