import React from 'react'
import { FileWarning } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface QualityViolation {
  rule_type: string
  column_name: string
  count: number
}

interface TopQualityViolationsProps {
  violations: QualityViolation[]
}

export const TopQualityViolations: React.FC<TopQualityViolationsProps> = ({ violations }) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar border-t-0">
        {violations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40 ">
            <span className="text-xs font-bold uppercase tracking-widest">
              Perfect compliance. No violations.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {violations.map((v, i) => (
              <div
                key={`${v.rule_type}-${v.column_name}-${i}`}
                className="flex items-center justify-between p-5 hover:bg-amber-500/5 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-sm group-hover:scale-105 transition-transform">
                    <FileWarning className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-bold text-foreground/80 group-hover:text-amber-500 transition-colors">
                      {v.column_name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      RULE: {v.rule_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[10px] font-bold text-amber-500 shadow-xs">
                  {formatNumber(v.count)} ROWS
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
