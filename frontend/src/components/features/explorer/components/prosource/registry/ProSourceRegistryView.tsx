import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileSearch,
  Search,
  Filter,
  Download,
  History,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ResultsGrid } from '../../ResultsGrid'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'

interface ProSourceRegistryViewProps {
  connectionId: number
  selectedEntity: string | null
  onSelectRecord: (id: string) => void
}

export const ProSourceRegistryView: React.FC<ProSourceRegistryViewProps> = ({
  connectionId,
  selectedEntity,
  onSelectRecord,
}) => {
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: registryData, isLoading } = useQuery({
    queryKey: ['prosource', 'registry', connectionId, activeTab, selectedEntity],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'execute_query', {
        query: `SELECT * FROM ${selectedEntity || 'WELL'} FETCH FIRST 50 ROWS ONLY`,
      }),
  })

  const stats = [
    { label: 'Active', count: 1240, color: 'text-indigo-400', id: 'active' },
    { label: 'Archived', count: 45, color: 'text-muted-foreground', id: 'archived' },
    { label: 'Quarantine', count: 12, color: 'text-amber-400', id: 'quarantine' },
  ]

  return (
    <div className="h-full flex flex-col bg-[#020203]">
      {/* Header Toolbar */}
      <div className="px-8 py-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <FileSearch size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest italic">
                Registry Hub
              </h2>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                Master Record Management
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
            {stats.map((stat) => (
              <button
                key={stat.id}
                onClick={() => setActiveTab(stat.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all',
                  activeTab === stat.id
                    ? 'bg-white/[0.05] text-white shadow-lg'
                    : 'text-muted-foreground/40 hover:text-white'
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {stat.label}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[9px] font-mono h-4 px-1.5 border-0 bg-white/5 text-current opacity-60"
                >
                  {stat.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <Input
              placeholder="Search registry ID..."
              className="pl-9 h-9 bg-white/[0.03] border-white/5 rounded-xl text-xs font-medium focus:ring-violet-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-all">
            <Filter size={14} />
          </button>
          <button className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-all">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Quick Actions & History */}
        <aside className="w-72 border-r border-white/5 bg-black/10 p-6 space-y-8 overflow-auto no-scrollbar shrink-0">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[8px] uppercase px-1 h-4">
                      Validated
                    </Badge>
                    <span className="text-[8px] font-mono text-white/20">2m ago</span>
                  </div>
                  <p className="text-[10px] font-bold text-white/80 group-hover:text-violet-400 transition-colors">
                    WELL_MASTER_X904
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1 truncate">
                    Seabed schema version update applied.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Technical Health
            </h3>
            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 space-y-4">
              <HealthStat label="Consistency" value={99.2} />
              <HealthStat label="Lineage Depth" value={84.5} />
              <HealthStat label="Orphan Records" value={2.4} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 group cursor-pointer hover:bg-amber-500/10 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle size={14} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase text-amber-500">
                Unresolved Issues
              </span>
            </div>
            <p className="text-[9px] text-amber-500/60 leading-relaxed font-medium">
              12 records found with inconsistent coordinate systems in project 'OFFSHORE_UK'.
            </p>
            <button className="mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-500 group-hover:gap-2 transition-all">
              Launch Fixer <ArrowUpRight size={10} />
            </button>
          </div>
        </aside>

        {/* Right: Data Grid */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="h-8 w-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <ResultsGrid
                  results={registryData?.results || []}
                  onSelectRow={(row) => onSelectRecord(row.ID || row.UWI)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function HealthStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
        <span className="text-white/40">{label}</span>
        <span className="text-violet-400">{value}%</span>
      </div>
      <div className="h-1 w-full bg-white/[0.03] rounded-full overflow-hidden">
        <div className="h-full bg-violet-500/40 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
