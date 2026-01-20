import React from 'react'
import { Zap } from 'lucide-react'
import { GuardrailBuilder } from './GuardrailBuilder'

interface NodeSafetyTabProps {
  watch: any
  setValue: any
}

export const NodeSafetyTab: React.FC<NodeSafetyTabProps> = ({ watch, setValue }) => {
  return (
    <div className="p-6 space-y-8 pb-32 focus-visible:outline-none">
      <div className="space-y-6">
        <div className="relative group overflow-hidden p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 transition-all duration-500 hover:bg-amber-500/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 bg-amber-500/10 blur-3xl rounded-full" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner border border-amber-500/20">
              <Zap size={24} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                Fail-Safe Infrastructure
              </h4>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed font-medium">
                Establish automated circuit breakers. These rules monitor statistical telemetry in
                real-time and will terminate the job instantly if reliability thresholds are
                breached.
              </p>
            </div>
          </div>
        </div>

        <GuardrailBuilder watch={watch} setValue={setValue} />
      </div>
    </div>
  )
}
