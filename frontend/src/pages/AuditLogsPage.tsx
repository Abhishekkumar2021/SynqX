import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, searchUsers, exportAuditLogs } from '@/lib/api'
import { PageMeta } from '@/components/common/PageMeta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Logs,
  Search,
  ArrowRight,
  ShieldAlert,
  XCircle,
  Calendar as CalendarIcon,
  FilterX,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  RotateCcw,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AnimatePresence } from 'framer-motion'
import { useZenMode } from '@/hooks/useZenMode'
import { Skeleton } from '@/components/ui/skeleton'
import { AuditLogListItem } from '@/components/features/audit/AuditLogListItem'
import { AuditLogGridItem } from '@/components/features/audit/AuditLogGridItem'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ViewToggle } from '@/components/common/ViewToggle'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'

export const AuditLogsPage: React.FC = () => {
  const { isZenMode } = useZenMode()
  const [searchParams, setSearchParams] = useSearchParams()

  // Derived State from URL
  const searchQuery = searchParams.get('q') || ''
  const viewMode = (searchParams.get('view') as 'list' | 'grid') || 'list'
  const filters = {
    eventType: searchParams.get('eventType') || 'all',
    userId: searchParams.get('userId') || 'all',
    status: searchParams.get('status') || 'all',
  }
  const dateRange = useMemo(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from) return undefined
    return { from: new Date(from), to: to ? new Date(to) : undefined }
  }, [searchParams])

  const sortBy = searchParams.get('sort') || 'created_at'
  const sortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  const page = parseInt(searchParams.get('page') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')

  // Helper to update params
  const updateParams = (updates: Record<string, string | null | undefined>) => {
    setSearchParams((prev) => {
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          prev.delete(key)
        } else {
          prev.set(key, value)
        }
      })
      // Reset page on filter changes (if not explicitly setting page)
      if (!('page' in updates)) {
        prev.set('page', '0')
      }
      return prev
    })
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['auditLogs', page, limit, filters, dateRange, sortBy, sortOrder],
    queryFn: () =>
      getAuditLogs(
        page * limit,
        limit,
        filters.userId === 'all' ? undefined : parseInt(filters.userId),
        filters.eventType === 'all' ? undefined : filters.eventType,
        undefined, // targetType
        undefined, // targetId
        filters.status === 'all' ? undefined : filters.status,
        dateRange?.from?.toISOString(),
        dateRange?.to?.toISOString(),
        sortBy,
        sortOrder
      ),
    refetchInterval: 60000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-search', ''],
    queryFn: () => searchUsers(''),
  })
  const users = usersData || []

  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const finalLogs = useMemo(() => {
    const logs = data?.items || []
    if (!searchQuery) return logs

    const q = searchQuery.toLowerCase()
    return logs.filter(
      (log) =>
        log.event_type.toLowerCase().includes(q) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(q)) ||
        (log.target_type && log.target_type.toLowerCase().includes(q))
    )
  }, [data?.items, searchQuery])

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      updateParams({ order: sortOrder === 'asc' ? 'desc' : 'asc', page: page.toString() }) // keep page
    } else {
      updateParams({ sort: field, order: 'desc', page: page.toString() })
    }
  }

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
    return sortOrder === 'desc' ? (
      <ArrowDown className="ml-2 h-3 w-3 text-primary" />
    ) : (
      <ArrowUp className="ml-2 h-3 w-3 text-primary" />
    )
  }

  const resetFilters = () => {
    setSearchParams({}) // Clear all
  }

  const handleDateRangeSelect = (range: any) => {
    updateParams({
      from: range?.from?.toISOString(),
      to: range?.to?.toISOString(),
    })
  }

  const handleExport = async () => {
    try {
      const blob = await exportAuditLogs(
        filters.userId === 'all' ? undefined : parseInt(filters.userId),
        filters.eventType === 'all' ? undefined : filters.eventType,
        filters.status === 'all' ? undefined : filters.status,
        dateRange?.from?.toISOString(),
        dateRange?.to?.toISOString()
      )

      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Audit log export started')
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const hasActiveFilters =
    filters.eventType !== 'all' ||
    filters.userId !== 'all' ||
    filters.status !== 'all' ||
    !!dateRange ||
    !!searchQuery

  if (isError) {
    const axiosError = error as { response?: { status?: number; data?: { detail?: string } } }
    const status = axiosError.response?.status
    const message = axiosError.response?.data?.detail || error.message

    if (status === 403) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-4">
          <div className="p-6 bg-yellow-500/10 rounded-full mb-6 ring-1 ring-yellow-500/20">
            <ShieldAlert className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight uppercase">Admin Access Required</h2>
          <p className="text-muted-foreground mt-2 max-w-md font-medium opacity-70">
            Audit logs contain sensitive workspace data. Only users with administrative privileges
            can access the execution trail.
          </p>
          <Button
            variant="outline"
            className="mt-8 rounded-xl font-bold"
            onClick={() => window.history.back()}
          >
            Return to Safety
          </Button>
        </div>
      )
    }
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold tracking-tight uppercase">Failed to Load Logs</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{message}</p>
        <Button variant="outline" className="mt-6" onClick={() => refetch()}>
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-6 md:gap-8 px-1',
        isZenMode ? 'h-[calc(100vh-4rem)]' : 'h-[calc(100vh-8rem)]'
      )}
    >
      <PageMeta title="Audit Trail" description="Review all administrative and system events." />

      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
        <div className="space-y-1.5">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
              <Logs className="h-6 w-6 text-primary" />
            </div>
            Audit Trail
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-medium pl-1">
            Immutable History of Workspace Operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-10 w-10 bg-background/50 border-border/40 hover:bg-background transition-all"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Full History</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl h-10 px-4 font-bold text-muted-foreground hover:text-foreground gap-2 transition-all active:scale-95"
            onClick={() => refetch()}
          >
            <RotateCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* --- Registry Container --- */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative group">
        {/* --- Toolbar --- */}
        <div className="p-3 md:p-4 border-b border-border/40 bg-muted/20 flex flex-col lg:flex-row items-center justify-between shrink-0 gap-3 md:gap-4 relative z-30">
          {/* Search Bar */}
          <div className="relative w-full lg:max-w-xs group/search">
            <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-muted-foreground group-focus-within/search:text-primary transition-colors z-20 opacity-50" />
            <Input
              placeholder="Filter events..."
              value={searchQuery}
              onChange={(e) => updateParams({ q: e.target.value })}
              className="pl-9 h-10 rounded-xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-none text-xs font-medium"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-10 px-3 justify-start text-left font-normal rounded-xl border-border/50 bg-background/50 text-[10px] uppercase tracking-widest shadow-sm transition-all hover:bg-background hover:border-primary/30',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                      </>
                    ) : (
                      format(dateRange.from, 'MMM dd')
                    )
                  ) : (
                    <span>Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-3xl border-border/60 shadow-2xl"
                align="start"
              >
                <Calendar mode="range" selected={dateRange} onSelect={handleDateRangeSelect} />
              </PopoverContent>
            </Popover>

            <Select value={filters.userId} onValueChange={(v) => updateParams({ userId: v })}>
              <SelectTrigger className="h-10 border-border/50 rounded-xl bg-background/50 w-35 text-[10px] uppercase tracking-widest shadow-sm transition-all hover:border-primary/30">
                <Filter className="h-3 w-3 mr-1.5 opacity-40" />
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 shadow-2xl">
                <SelectItem value="all" className="text-xs font-bold">
                  All Actors
                </SelectItem>
                {users?.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={user.id.toString()}
                    className="text-xs font-medium"
                  >
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => updateParams({ status: v })}>
              <SelectTrigger className="h-10 border-border/40 rounded-xl bg-background/50 w-27.5 text-[10px] uppercase tracking-widest text-foreground shadow-sm transition-all hover:border-primary/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 shadow-2xl">
                <SelectItem value="all" className="text-xs font-bold">
                  Status
                </SelectItem>
                <SelectItem value="success" className="text-xs font-bold text-emerald-500">
                  Success
                </SelectItem>
                <SelectItem value="failure" className="text-xs font-bold text-destructive">
                  Failure
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.eventType} onValueChange={(v) => updateParams({ eventType: v })}>
              <SelectTrigger className="h-10 border-border/40 rounded-xl bg-background/50 w-32.5 text-[10px] uppercase tracking-widest text-foreground shadow-sm transition-all hover:border-primary/30">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 shadow-2xl">
                <SelectItem value="all" className="text-xs font-bold">
                  All Types
                </SelectItem>
                <SelectItem value="pipeline" className="text-xs font-bold">
                  Pipeline
                </SelectItem>
                <SelectItem value="connection" className="text-xs font-bold">
                  Connection
                </SelectItem>
                <SelectItem value="asset" className="text-xs font-bold">
                  Asset
                </SelectItem>
                <SelectItem value="user" className="text-xs font-bold">
                  User
                </SelectItem>
                <SelectItem value="workspace" className="text-xs font-bold">
                  Workspace
                </SelectItem>
                <SelectItem value="api_key" className="text-xs font-bold">
                  API Key
                </SelectItem>
              </SelectContent>
            </Select>

            <ViewToggle
              viewMode={viewMode}
              setViewMode={(v) => updateParams({ view: v, page: page.toString() })}
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                title="Reset Filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* --- Table Header (Visible only in List mode) --- */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/20 bg-muted/30 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0 sticky top-0 z-20 shadow-sm">
            <div
              className="col-span-12 md:col-span-5 flex items-center cursor-pointer select-none group/col"
              onClick={() => toggleSort('event_type')}
            >
              Event Signature {getSortIcon('event_type')}
            </div>
            <div
              className="col-span-2 hidden md:flex items-center cursor-pointer select-none group/col"
              onClick={() => toggleSort('user_id')}
            >
              Actor {getSortIcon('user_id')}
            </div>
            <div className="col-span-3 hidden md:block">Target Resource</div>
            <div
              className="col-span-2 flex items-center justify-end cursor-pointer select-none group/col"
              onClick={() => toggleSort('created_at')}
            >
              Timestamp {getSortIcon('created_at')}
            </div>
          </div>
        )}

        {/* --- Content Area --- */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="divide-y divide-border/10">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-8 py-6 flex items-center gap-6">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : finalLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-24 text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                  <div className="relative h-24 w-24 glass-card rounded-2xl border-border/40 flex items-center justify-center shadow-2xl">
                    <Logs className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">
                  No Events Captured
                </h3>
                <p className="text-sm mt-2 max-w-sm leading-relaxed text-muted-foreground font-medium opacity-70">
                  {hasActiveFilters
                    ? 'No logs match your current filter parameters. Try expanding your search criteria.'
                    : 'The audit trail is currently empty. Significant workspace events will appear here automatically.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-8 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                    onClick={resetFilters}
                  >
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <div className="divide-y divide-border/10">
                {finalLogs.map((log) => (
                  <AuditLogListItem key={log.id} log={log} users={users || []} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {finalLogs.map((log) => (
                  <AuditLogGridItem key={log.id} log={log} users={users || []} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* --- Footer Pagination --- */}
        <div className="p-4 border-t border-border/20 bg-muted/10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-background/50 rounded-xl border border-border/40 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Entries
              </span>
              <div className="h-4 w-px bg-border/40" />
              <span className="text-[11px] font-bold text-foreground tabular-nums">
                {Math.min(page * limit + 1, total)}-{Math.min((page + 1) * limit, total)}{' '}
                <span className="text-muted-foreground/40 font-bold mx-1">of</span> {total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                Limit
              </span>
              <Select
                value={limit.toString()}
                onValueChange={(val) => updateParams({ limit: val, page: '0' })}
              >
                <SelectTrigger className="h-8 w-20 rounded-xl bg-background/50 text-[10px] border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  <SelectItem value="10" className="text-[10px] font-bold">
                    10
                  </SelectItem>
                  <SelectItem value="20" className="text-[10px] font-bold">
                    20
                  </SelectItem>
                  <SelectItem value="50" className="text-[10px] font-bold">
                    50
                  </SelectItem>
                  <SelectItem value="100" className="text-[10px] font-bold">
                    100
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-background/50 rounded-2xl border border-border/40 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => {
                updateParams({ page: Math.max(0, page - 1).toString() })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-20"
            >
              Prev
            </Button>
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                // Simple pagination window
                const pageNum = totalPages > 5 && page > 2 ? page - 2 + i : i

                if (pageNum >= totalPages) return null

                return (
                  <button
                    key={pageNum}
                    onClick={() => updateParams({ page: pageNum.toString() })}
                    className={cn(
                      'h-7 w-7 rounded-lg text-[10px] font-bold transition-all',
                      page === pageNum
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => {
                updateParams({ page: (page + 1).toString() })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
