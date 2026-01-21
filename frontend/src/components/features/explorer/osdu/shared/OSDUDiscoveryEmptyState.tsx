import React from 'react'
import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OSDUDiscoveryEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
}

export const OSDUDiscoveryEmptyState: React.FC<OSDUDiscoveryEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8 z-10"
    >
      <motion.div variants={itemVariants} className="relative">
        <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full scale-150" />
        <div className="relative h-32 w-32 rounded-[3.5rem] border border-border/40 flex items-center justify-center shadow-2xl bg-background/40 backdrop-blur-md">
          <Icon size={56} strokeWidth={1} className="text-primary/40" />
        </div>
      </motion.div>

      <div className="space-y-3">
        <motion.p
          variants={itemVariants}
          className="font-black text-4xl tracking-tighter uppercase text-foreground leading-none"
        >
          {title}
        </motion.p>
        <motion.p
          variants={itemVariants}
          className="text-[11px] font-bold uppercase tracking-[0.3em] max-w-sm mx-auto text-muted-foreground leading-relaxed opacity-60"
        >
          {description}
        </motion.p>
      </div>

      {action && (
        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            className="rounded-[1.5rem] border-primary/20 hover:bg-primary/5 text-primary font-black uppercase text-[10px] tracking-[0.2em] h-12 px-10 shadow-xl active:scale-95 transition-all"
            onClick={action.onClick}
          >
            {action.icon && <action.icon size={14} className="mr-3" />}
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
