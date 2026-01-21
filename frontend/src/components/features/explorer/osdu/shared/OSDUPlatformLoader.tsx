import React from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OSDUPlatformLoaderProps {
  message?: string
  className?: string
  iconColor?: string
}

export const OSDUPlatformLoader: React.FC<OSDUPlatformLoaderProps> = ({
  message = 'Materializing partition frame...',
  className,
  iconColor = 'text-primary',
}) => {
  return (
    <div
      className={cn('flex-1 flex flex-col items-center justify-center gap-8 opacity-40', className)}
    >
      <div className="relative">
        <div
          className={cn(
            'absolute inset-0 blur-3xl animate-pulse rounded-full',
            iconColor.replace('text-', 'bg-').replace('500', '500/20')
          )}
        />
        <RefreshCw className={cn('h-16 w-16 animate-spin', iconColor)} strokeWidth={1} />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">
        {message}
      </span>
    </div>
  )
}
