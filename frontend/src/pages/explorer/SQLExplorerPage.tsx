import React, { useMemo, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getConnection } from '@/lib/api/connections'
import { getHistory, clearHistory } from '@/lib/api/explorer'
import { SQLExplorer } from '@/components/features/explorer/components/SQLExplorer'
import { ExecutionHistory } from '@/components/features/explorer/ExecutionHistory'
import { type HistoryItem } from '@/components/features/explorer/types'
import { PageMeta } from '@/components/common/PageMeta'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Database, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useZenMode } from '@/hooks/useZenMode'
import { useWorkspace } from '@/hooks/useWorkspace'
import { toast } from 'sonner'

export const SQLExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const connectionId = parseInt(id!)
  const navigate = useNavigate()
  const { isZenMode } = useZenMode()
  const { isAdmin } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL Synced State
  const showHistory = searchParams.get('history') === 'true'
  const setShowHistory = (show: boolean) => {
    setSearchParams((prev) => {
      if (show) prev.set('history', 'true')
      else prev.delete('history')
      return prev
    })
  }

  // 1. Connection Details
  const { data: connection, isError: isConnectionError } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection(connectionId),
  })

  // Handle connection error
  useEffect(() => {
    if (isConnectionError) {
      toast.error('Failed to load connection details')
      navigate('/explorer')
    }
  }, [isConnectionError, navigate])

  // 2. History Data
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['execution-history', connectionId],
    queryFn: () => getHistory(100),
    refetchOnWindowFocus: false,
  })

  const history: HistoryItem[] = useMemo(() => {
    if (!historyData) return []
    return historyData.map((h) => ({
      id: h.id,
      query: h.query,
      timestamp: h.created_at,
      connectionName: h.connection_name,
      duration: h.execution_time_ms,
      rowCount: h.row_count || 0,
      status: h.status,
    }))
  }, [historyData])

  const clearHistoryMutation = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      toast.success('History Cleared')
      refetchHistory()
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex-1 flex flex-col gap-6 md:gap-8 px-1',
        isZenMode ? 'h-[calc(100vh-3rem)]' : 'h-[calc(100vh-8rem)]'
      )}
    >
      <PageMeta title={`SQL Explorer - ${connection?.name || 'Loading...'}`} />

      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
        <div className="space-y-1.5">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/explorer')}
              className="h-10 w-10 rounded-2xl hover:bg-muted active:scale-95"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-primary/20 backdrop-blur-md shadow-sm">
              <Database className="h-6 w-6 text-primary" />
            </div>
            {connection?.name || 'Query Studio'}
            <Badge
              variant="outline"
              className="h-7 px-3 rounded-xl bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] gap-1.5 uppercase"
            >
              {connection?.connector_type}
            </Badge>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-medium pl-1 leading-relaxed max-w-2xl">
            Full-screen IDE for high-performance SQL analysis and warehouse discovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'h-9 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-background/50 border-border/40 transition-all shadow-sm',
              showHistory && 'border-primary bg-primary/10 text-primary'
            )}
          >
            <History size={16} /> History
          </Button>
        </div>
      </div>

      {/* --- Content Pane (Glass Registry Style) --- */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
        <SQLExplorer
          connectionId={connectionId}
          onHistoryToggle={() => setShowHistory(!showHistory)}
          onRefetchHistory={() => refetchHistory()}
        />
      </div>

      {/* --- History Sidebar Overlay --- */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[100]"
            />
            <div className="fixed right-0 top-0 bottom-0 z-[101] w-96 shadow-2xl animate-in slide-in-from-right duration-300">
              <ExecutionHistory
                history={history}
                onClose={() => setShowHistory(false)}
                onRestore={() => {}}
                onClear={isAdmin ? () => clearHistoryMutation.mutate() : undefined}
              />
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
