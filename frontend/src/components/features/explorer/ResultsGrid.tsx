/* eslint-disable react-hooks/incompatible-library */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { type QueryResponse } from '@/lib/api'
import {
  Terminal,
  ListFilter,
  Copy,
  Download,
  FileJson,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  Settings2,
  EyeOff,
  MoreHorizontal,
  PinOff,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Table as TableIcon,
  Code,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatNumber } from '@/lib/utils'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnPinningState,
  type Column,
  type PaginationState,
  type OnChangeFn,
} from '@tanstack/react-table'

// Extend QueryResponse locally if missing total_count
interface ExtendedQueryResponse extends QueryResponse {
  total_count?: number
}

interface ResultsGridProps {
  data: ExtendedQueryResponse | null
  isLoading: boolean
  loadingMessage?: string | null
  isMaximized?: boolean
  onToggleMaximize?: () => void
  title?: React.ReactNode
  tabs?: React.ReactNode
  description?: string
  onSelectRows?: (indices: Set<number>) => void
  selectedRows?: Set<number>
  hideHeader?: boolean
  className?: string
  noBorder?: boolean
  noBackground?: boolean
  // Pagination
  manualPagination?: boolean
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  variant?: string
}

type Density = 'compact' | 'standard' | 'comfortable'
type ViewMode = 'table' | 'json'

// --- Sub Components ---

function DataTableCell({ value, density }: { value: any; density: Density }) {
  const isObject = value !== null && typeof value === 'object'

  if (value === null) {
    return (
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
        NULL
      </span>
    )
  }

  if (isObject) {
    return (
      <div className="w-full bg-background/50 rounded-lg overflow-hidden p-1 border border-border/20 group/code relative min-w-[120px]">
        <CodeBlock
          code={JSON.stringify(value, null, 2)}
          language="json"
          maxHeight="128px"
          editable={false}
          rounded={false}
          usePortal={true}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 rounded-md shadow-lg"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(value, null, 2))
              toast.success('JSON Copied')
            }}
          >
            <Copy size={10} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center group/cell gap-3 min-h-[1.5em]">
      <div className="flex-1 min-w-0">
        {typeof value === 'boolean' ? (
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] px-2 h-4.5 font-black uppercase border-0 tracking-widest',
              value ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
            )}
          >
            {String(value)}
          </Badge>
        ) : typeof value === 'number' ? (
          <span className="text-[13px] font-mono font-bold text-primary tracking-tighter tabular-nums">
            {value.toLocaleString()}
          </span>
        ) : (
          <span
            className={cn(
              'font-medium text-foreground/80 tracking-tight leading-relaxed line-clamp-2 break-all',
              density === 'compact' ? 'text-[11px]' : 'text-[13px]'
            )}
          >
            {String(value)}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(String(value))
          toast.success('Value Copied')
        }}
        className="opacity-0 group-hover/cell:opacity-100 p-1.5 rounded-lg bg-primary/5 text-primary transition-all hover:bg-primary/10 shrink-0"
      >
        <Copy size={10} />
      </button>
    </div>
  )
}

function DataTableColumnHeader({ column, title }: { column: Column<any, unknown>; title: string }) {
  const isFiltered = column.getIsFiltered()

  return (
    <div className="flex items-center justify-between gap-2">
      <div
        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 group/h"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        <span
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 transition-colors group-hover/h:text-foreground',
            column.getIsSorted() && 'text-primary'
          )}
        >
          {title}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isFiltered && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 rounded-lg hover:bg-primary/10',
                column.getIsSorted() || isFiltered || column.getIsPinned()
                  ? 'text-primary'
                  : 'text-muted-foreground/40 hover:text-foreground'
              )}
            >
              {column.getIsSorted() === 'desc' ? (
                <ArrowDown size={12} />
              ) : column.getIsSorted() === 'asc' ? (
                <ArrowUp size={12} />
              ) : (
                <MoreHorizontal size={14} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-panel rounded-xl shadow-2xl p-1">
            <div className="px-2 py-2">
              <Input
                placeholder={`Filter ${title}...`}
                value={(column.getFilterValue() as string) ?? ''}
                onChange={(e) => column.setFilterValue(e.target.value)}
                className="h-8 text-xs bg-muted/20 rounded-lg border-border/40"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem
              onClick={() => column.toggleSorting(false)}
              className="rounded-lg text-xs font-bold uppercase tracking-widest py-2"
            >
              <ArrowUp size={14} className="mr-2 text-muted-foreground/70" /> Asc
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => column.toggleSorting(true)}
              className="rounded-lg text-xs font-bold uppercase tracking-widest py-2"
            >
              <ArrowDown size={14} className="mr-2 text-muted-foreground/70" /> Desc
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuLabel className="text-[9px] uppercase text-muted-foreground tracking-[0.2em] font-black px-2 py-1.5">
              Pinning
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => column.pin('left')}
              className="rounded-lg text-xs font-medium"
            >
              {' '}
              <ArrowLeft className="mr-2 h-4 w-4 opacity-60" /> Pin Left{' '}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => column.pin('right')}
              className="rounded-lg text-xs font-medium"
            >
              {' '}
              <ArrowRight className="mr-2 h-4 w-4 opacity-60" /> Pin Right{' '}
            </DropdownMenuItem>
            {column.getIsPinned() && (
              <DropdownMenuItem
                onClick={() => column.pin(false)}
                className="rounded-lg text-xs font-medium"
              >
                {' '}
                <PinOff size={14} className="mr-2 opacity-60" /> Unpin{' '}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem
              onClick={() => column.toggleVisibility(false)}
              className="text-destructive focus:text-destructive rounded-lg text-xs font-medium"
            >
              <EyeOff size={14} className="mr-2" /> Hide Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function LoadingSkeleton({
  message,
  noBackground,
}: {
  message?: string | null
  noBackground?: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 h-full flex flex-col items-center justify-center p-12 gap-6 bg-background/50 animate-pulse overflow-hidden',
        noBackground && 'bg-transparent'
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
        <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
      </div>
      <div className="text-center space-y-2 relative z-10">
        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-foreground">
          {' '}
          {message || 'Resolving Metadata'}{' '}
        </h3>
        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
          {' '}
          Buffering execution stream...{' '}
        </p>
      </div>
    </div>
  )
}

function EmptyState({
  message,
  description,
  noBackground,
}: {
  message?: string
  description?: string
  noBackground?: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 h-full flex flex-col items-center justify-center text-muted-foreground gap-8 bg-card/5 animate-in fade-in duration-1000',
        noBackground && 'bg-transparent'
      )}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-700" />
        <div className="relative h-24 w-24 rounded-[2.5rem] glass-card flex items-center justify-center border-0 shadow-2xl">
          <Terminal className="h-12 w-12 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold uppercase tracking-tighter text-foreground">
          {message || 'Waiting for Execution'}
        </h3>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/40 max-w-xs leading-loose">
          {description || 'Execute a command to populate the grid'}
        </p>
      </div>
    </div>
  )
}

const getCommonPinningStyles = (column: Column<any>): React.CSSProperties => {
  const isPinned = column.getIsPinned()
  return {
    left: isPinned === 'left' ? `${column.getStart()}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter()}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  }
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  data,
  isLoading,
  loadingMessage,
  isMaximized,
  onToggleMaximize,
  title,
  tabs,
  description,
  onSelectRows,
  selectedRows,
  hideHeader = false,
  className,
  noBorder = false,
  noBackground = false,
  manualPagination,
  pageCount,
  pagination,
  onPaginationChange,
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: onSelectRows ? ['select', 'index'] : ['index'],
    right: [],
  })
  const [globalFilter, setGlobalFilter] = useState('')
  const [density, setDensity] = useState<Density>('standard')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Sync pinning state if selection prop changes
  useEffect(() => {
    setColumnPinning((prev) => ({
      ...prev,
      left: onSelectRows ? ['select', 'index'] : ['index'],
    }))
  }, [onSelectRows])

  useEffect(() => {
    if (!selectedRows) {
      setRowSelection({})
      return
    }
    const newSelection: RowSelectionState = {}
    selectedRows.forEach((idx) => {
      newSelection[idx] = true
    })
    setRowSelection(newSelection)
  }, [selectedRows])

  const handleRowSelectionChange = useCallback(
    (updaterOrValue: any) => {
      const newSelection =
        typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue
      setRowSelection(newSelection)
      if (onSelectRows) {
        const indices = new Set(Object.keys(newSelection).map(Number))
        onSelectRows(indices)
      }
    },
    [rowSelection, onSelectRows]
  )

  const rawData = useMemo(() => {
    const results = data?.results || (data as any)?.rows
    if (!results) return []
    return results.map((row: any, idx: number) => ({ ...row, __idx: idx }))
  }, [data])

  const tableData = useFuzzySearch(rawData, globalFilter, {
    keys: data?.columns || [],
    threshold: 0.3,
  })

  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!data?.columns) return []
    const cols: ColumnDef<any>[] = []
    if (onSelectRows) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <div className="flex justify-center">
            {' '}
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            />{' '}
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            {' '}
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />{' '}
          </div>
        ),
        size: 40,
        enablePinning: true,
        enableSorting: false,
        enableHiding: false,
      })
    }
    cols.push({
      id: 'index',
      header: () => <div className="text-center w-full">#</div>,
      accessorFn: (row) => row.__idx + 1,
      cell: ({ getValue }) => (
        <div className="text-center font-mono text-muted-foreground/40 font-bold text-[10px]">
          {getValue() as number}
        </div>
      ),
      size: 50,
      enablePinning: true,
      enableSorting: true,
      enableHiding: false,
    })
    data.columns.forEach((colName) => {
      cols.push({
        accessorKey: colName,
        header: ({ column }) => <DataTableColumnHeader column={column} title={colName} />,
        cell: ({ getValue }) => <DataTableCell value={getValue()} density={density} />,
        minSize: 150,
      })
    })
    return cols
  }, [data, onSelectRows, density])

  const finalPagination = pagination ?? internalPagination
  const finalOnPaginationChange = onPaginationChange ?? setInternalPagination

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnPinning,
      pagination: finalPagination,
    },
    manualPagination,
    pageCount: pageCount ?? -1,
    onPaginationChange: finalOnPaginationChange,
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.__idx),
    initialState: { columnPinning: { left: ['select', 'index'] } },
  })

  const handleExport = (format: 'json' | 'csv') => {
    if (!data || table.getRowModel().rows.length === 0) return
    const visibleCols = table
      .getVisibleLeafColumns()
      .filter((c) => c.id !== 'select' && c.id !== 'index')
    const rows = table.getFilteredRowModel().rows
    const exportData = rows.map((row) => {
      const obj: any = {}
      visibleCols.forEach((col) => {
        obj[col.id] = row.getValue(col.id)
      })
      return obj
    })
    const timestamp = new Date().getTime()
    const content =
      format === 'json'
        ? JSON.stringify(exportData, null, 2)
        : [
            visibleCols.map((c) => c.id).join(','),
            ...exportData.map((row) =>
              visibleCols
                .map((col) => `"${String(row[col.id] ?? '').replaceAll('"', '""')}"`)
                .join(',')
            ),
          ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
    )
    a.download = `export_${timestamp}.${format}`
    a.click()
    toast.success(`Exported ${rows.length} rows`)
  }

  const densityConfig = {
    compact: { cell: 'px-3 py-1.5 text-[11px]', header: 'px-3 py-2 h-9' },
    standard: { cell: 'px-4 py-2.5 text-[13px]', header: 'px-4 py-3 h-11' },
    comfortable: { cell: 'px-6 py-4 text-sm', header: 'px-6 py-4 h-14' },
  }

  if (isLoading) return <LoadingSkeleton message={loadingMessage} noBackground={noBackground} />
  if (!data) return <EmptyState noBackground={noBackground} />

  const header = !hideHeader && (
    <div className="border-b border-border/20 bg-muted/5 flex flex-col shrink-0">
      {tabs && (
        <div className="px-4 py-2 border-b border-border/10 overflow-x-auto custom-scrollbar flex items-center gap-2">
          {tabs}
        </div>
      )}
      <div className="px-4 h-12 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {title && (
            <div className="flex flex-col mr-2 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground truncate">
                {typeof title === 'string' ? title : null}
              </span>
              {description && (
                <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest truncate">
                  {description}
                </span>
              )}
              {typeof title !== 'string' && title}
            </div>
          )}

          <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/20 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'table'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {' '}
              <TableIcon size={14} />{' '}
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'json'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {' '}
              <Code size={14} />{' '}
            </button>
          </div>

          <div className="relative flex-1 max-w-xs group">
            <ListFilter
              className={cn(
                'z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5',
                globalFilter ? 'text-primary' : 'text-muted-foreground/40'
              )}
            />
            <Input
              placeholder="Filter visible data..."
              className="h-8 pl-9 rounded-xl bg-background/50 border-border/40 text-[11px] focus:ring-4 focus:ring-primary/5"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          <Badge
            variant="outline"
            className="h-5 px-2 rounded-full border-border/40 text-[9px] font-black tracking-widest text-muted-foreground/40 bg-muted/10 uppercase"
          >
            {formatNumber(table.getFilteredRowModel().rows.length)}{' '}
            {data.total_count && data.total_count > table.getFilteredRowModel().rows.length
              ? `/ ${formatNumber(data.total_count)}`
              : ''}{' '}
            REC
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {viewMode === 'table' && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                    <Settings2 size={15} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 glass-panel border-border/40 rounded-2xl shadow-2xl p-1"
                >
                  <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-3 py-2">
                    Density
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={density}
                    onValueChange={(v) => setDensity(v as Density)}
                  >
                    <DropdownMenuRadioItem
                      value="compact"
                      className="text-xs font-medium rounded-lg"
                    >
                      Compact
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="standard"
                      className="text-xs font-medium rounded-lg"
                    >
                      Standard
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="comfortable"
                      className="text-xs font-medium rounded-lg"
                    >
                      Comfortable
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest bg-muted/30 px-3"
                  >
                    <Columns size={14} /> Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 glass-panel border-border/40 rounded-2xl shadow-2xl p-1 max-h-96 overflow-y-auto custom-scrollbar"
                >
                  <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-3 py-2">
                    Visibility
                  </DropdownMenuLabel>
                  {table
                    .getAllColumns()
                    .filter((c) => !['select', 'index'].includes(c.id))
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(v) => column.toggleVisibility(!!v)}
                        className="text-xs font-medium rounded-lg truncate"
                      >
                        {' '}
                        {column.id}{' '}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-primary/5 text-primary hover:bg-primary/10 transition-all px-3"
              >
                <Download size={14} /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 glass-panel border-border/40 rounded-2xl shadow-2xl p-2"
            >
              <DropdownMenuItem
                onClick={() => handleExport('json')}
                className="rounded-lg gap-3 py-2.5"
              >
                {' '}
                <FileJson className="h-4 w-4 text-orange-500" />{' '}
                <span className="font-bold text-[10px] uppercase tracking-widest">
                  JSON Manifest
                </span>{' '}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                className="rounded-lg gap-3 py-2.5"
              >
                {' '}
                <FileText className="h-4 w-4 text-blue-500" />{' '}
                <span className="font-bold text-[10px] uppercase tracking-widest">
                  CSV Spreadsheet
                </span>{' '}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onToggleMaximize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMaximize}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  const tableContent = (
    <div className="flex-1 overflow-auto custom-scrollbar h-full w-full">
      <table className="w-full text-left border-separate border-spacing-0 min-w-max">
        <thead className="sticky top-0 z-40">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="bg-background/95 backdrop-blur-xl border-b border-border/40"
            >
              {headerGroup.headers.map((header) => {
                const pinStyles = getCommonPinningStyles(header.column)
                const isPinned = header.column.getIsPinned()
                const isLastLeft = isPinned === 'left' && header.column.getIsLastColumn('left')

                return (
                  <th
                    key={header.id}
                    style={pinStyles}
                    className={cn(
                      'border-r border-b border-border/20 last:border-r-0 bg-background/95 backdrop-blur-md transition-colors',
                      densityConfig[density].header,
                      isPinned && 'z-50',
                      isLastLeft &&
                        'border-r-2 border-r-border/40 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.15)]',
                      (header.column.getIsSorted() || header.column.getIsFiltered()) &&
                        'bg-primary/[0.03]'
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border/10">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              {' '}
              <td
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest"
              >
                {' '}
                No matches found{' '}
              </td>{' '}
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'group/row transition-colors hover:bg-muted/30 even:bg-muted/10',
                  row.getIsSelected() && 'bg-primary/5'
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const pinStyles = getCommonPinningStyles(cell.column)
                  const isPinned = cell.column.getIsPinned()
                  const isLastLeft = isPinned === 'left' && cell.column.getIsLastColumn('left')
                  return (
                    <td
                      key={cell.id}
                      style={pinStyles}
                      className={cn(
                        'border-r border-border/10 last:border-r-0',
                        cell.column.id === 'select' || cell.column.id === 'index'
                          ? 'p-0'
                          : densityConfig[density].cell,
                        isPinned && 'z-30 bg-background',
                        isLastLeft &&
                          'border-r-2 border-r-border/40 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.15)]'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  const jsonContent = (
    <div className="flex-1 bg-background/30 overflow-y-auto custom-scrollbar p-6 space-y-4 h-full w-full">
      {table.getRowModel().rows.map((row) => (
        <div
          key={row.id}
          className={cn(
            'rounded-2xl border transition-all overflow-hidden',
            row.getIsSelected()
              ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-lg shadow-primary/5'
              : 'bg-card/40 border-border/40 shadow-sm'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between px-5 py-2.5 border-b',
              row.getIsSelected()
                ? 'bg-primary/10 border-primary/20'
                : 'bg-muted/30 border-border/40'
            )}
          >
            <div className="flex items-center gap-3">
              {onSelectRows && (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v) => row.toggleSelected(!!v)}
                />
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Registry Index #{row.index + 1}
              </span>
            </div>
          </div>
          <CodeBlock
            code={JSON.stringify(row.original, null, 2)}
            language="json"
            maxHeight="400px"
            className="border-none"
            rounded={false}
          />
        </div>
      ))}
    </div>
  )

  return (
    <div
      className={cn(
        'h-full flex flex-col min-h-0 relative',
        isMaximized &&
          'fixed inset-0 z-[100] bg-background animate-in fade-in zoom-in-95 duration-300',
        !noBorder &&
          !isMaximized &&
          'border border-border/40 rounded-2xl overflow-hidden shadow-xl',
        !noBackground && !isMaximized && 'bg-background/40 backdrop-blur-xl',
        className
      )}
    >
      {header}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        {viewMode === 'table' ? tableContent : jsonContent}
      </div>

      {viewMode === 'table' && (
        <footer className="px-5 h-12 bg-muted/20 border-t border-border/20 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Page Size
              </span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="h-7 w-20 text-[10px] font-bold rounded-lg bg-background/50 border-border/20 shadow-sm">
                  {' '}
                  <SelectValue />{' '}
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                  {[10, 25, 50, 100, 500].map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-[10px] font-bold">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-px bg-border/20" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              {' '}
              Page{' '}
              <span className="text-foreground">
                {table.getState().pagination.pageIndex + 1}
              </span> / {table.getPageCount()}{' '}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {' '}
              <ChevronsLeft size={14} />{' '}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {' '}
              <ChevronLeft size={14} />{' '}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {' '}
              <ChevronRight size={14} />{' '}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {' '}
              <ChevronsRight size={14} />{' '}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
