import React from 'react'
import { MaximizablePanel } from '@/components/ui/maximizable-panel'

interface DashboardWidgetProps {
  title: string
  description?: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  description,
  icon,
  children,
  className,
  headerActions,
}) => {
  return (
    <MaximizablePanel
      title={
        <div>
          <h3 className="font-bold tracking-tighter uppercase text-foreground text-lg lg:text-xl">
            {title}
          </h3>
          {description && (
            <p className="font-bold text-muted-foreground/60 uppercase tracking-widest text-[10px] mt-0.5">
              {description}
            </p>
          )}
        </div>
      }
      icon={icon}
      className={className}
      headerActions={headerActions}
    >
      {children}
    </MaximizablePanel>
  )
}
