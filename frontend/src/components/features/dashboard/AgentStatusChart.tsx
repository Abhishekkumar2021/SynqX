import React from 'react'
import { Users, Layers, Activity } from 'lucide-react'
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, XAxis } from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import type { AgentGroupStats } from '@/lib/api'

interface AgentStatusChartProps {
  totalAgents: number
  activeAgents: number
  groups: AgentGroupStats[]
}

export const AgentStatusChart: React.FC<AgentStatusChartProps> = ({
  totalAgents,
  activeAgents,
  groups,
}) => {
  const { theme } = useTheme()

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col gap-4 px-8 pt-8 pb-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-muted/20 rounded-xl p-3 border border-border/40 flex flex-col justify-between h-20 transition-colors hover:bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Total Agents
              </span>
            </div>
            <span className="text-2xl font-bold tracking-tighter tabular-nums">{totalAgents}</span>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 flex flex-col justify-between h-20 transition-colors hover:bg-emerald-500/15">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <span className="text-2xl font-bold tracking-tighter text-emerald-600 dark:text-emerald-400 tabular-nums">
              {activeAgents}
            </span>
          </div>
        </div>

        {/* Groups Chart */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Group Distribution
            </span>
          </div>

          <div className="flex-1 w-full min-h-[140px] relative">
            {groups.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groups} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', className: 'text-muted-foreground font-bold' }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="z-[1000] rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl p-3 shadow-xl animate-in fade-in-0 zoom-in-95 text-xs font-bold ring-1 ring-white/10 min-w-32">
                            <span className="text-primary/70 uppercase tracking-widest block mb-1.5 border-b border-border/10 pb-1 text-[9px]">
                              {payload[0].payload.name}
                            </span>
                            <div className="text-foreground text-lg font-bold tracking-tighter">
                              {payload[0].value}{' '}
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-1">
                                Nodes
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={32}>
                    {groups.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={theme === 'dark' ? '#6366f1' : '#4f46e5'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  No agent groups
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
