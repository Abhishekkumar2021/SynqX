/* eslint-disable react-hooks/incompatible-library */
import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import {
  Database,
  Download,
  RefreshCw,
  Eye,
  ArrowUpDown,
  Box,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn, formatNumber } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ProSourceDataTableProps {
  connectionId: number
  assetName: string
  customQuery?: string
  onSelectRecord: (record: any) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
  viewMode: 'grid' | 'list'
}

export const ProSourceDataTable: React.FC<ProSourceDataTableProps> = ({
  connectionId,
  assetName,
  customQuery,
  onSelectRecord,
  pageOffset,
  onOffsetChange,
  viewMode,
}) => {
  const pageSize = 50
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Fetch Data with Pagination
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['prosource', 'data', connectionId, assetName, pageOffset, pageSize, customQuery],
    queryFn: async () => {
      const activeAssetName = assetName
      const sql = customQuery || `SELECT * FROM ${activeAssetName}`

      const result = await getConnectionMetadata(connectionId, 'execute_query', {
        query: sql,
        limit: pageSize,
        offset: pageOffset,
      })

      const countSql = `SELECT COUNT(*) as CNT FROM (${sql})`
      const countRes = await getConnectionMetadata(connectionId, 'execute_query', {
        query: countSql,
      })
      const totalRow = countRes?.results?.[0] || countRes?.rows?.[0] || {}
      const total = totalRow.CNT || totalRow.cnt || 0

      return {
        results: result?.results || result?.rows || [],
        columns:
          result?.summary?.columns ||
          (result?.results?.[0]
            ? Object.keys(result.results[0])
            : result?.rows?.[0]
              ? Object.keys(result.rows[0])
              : []),
        total_count: total,
      }
    },
    enabled: !!assetName,
  })

  const results = data?.results || []
  const columns_list = data?.columns || []

  const columnHelper = createColumnHelper<any>()

  const tableColumns = useMemo<ColumnDef<any, any>[]>(() => {
    if (!columns_list.length) return []

    // Use any[] for the intermediate array to avoid complex union union mismatch
    const cols: any[] = [
      columnHelper.display({
        id: 'select',
        header: () => (
          <Checkbox
            checked={results.length > 0 && selectedIndices.size === results.length}
            onCheckedChange={() => {
              if (selectedIndices.size === results.length) setSelectedIndices(new Set())
              else setSelectedIndices(new Set(results.map((_: any, i: any) => i)))
            }}
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIndices.has(row.index)}
              onCheckedChange={() => {
                const next = new Set(selectedIndices)
                if (next.has(row.index)) next.delete(row.index)
                else next.add(row.index)
                setSelectedIndices(next)
              }}
              className="translate-y-[2px]"
            />
          </div>
        ),
        size: 40,
      }),
    ]

    // Add first 8 columns for visibility
    columns_list.slice(0, 10).forEach((colName: string) => {
      cols.push(
        columnHelper.accessor(colName, {
          id: colName,
          header: ({ column }) => (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 text-[10px] font-black uppercase tracking-[0.1em] hover:bg-transparent -ml-2 text-muted-foreground/60 group-hover:text-primary transition-colors"
            >
              {colName}
              <ArrowUpDown className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          ),
          cell: ({ getValue }) => {
            const val = getValue()
            return (
              <span className="text-[11px] font-bold text-foreground/70 truncate block max-w-[250px] tabular-nums tracking-tight">
                {val === null ? (
                  <span className="opacity-20 italic font-medium">---</span>
                ) : (
                  String(val)
                )}
              </span>
            )
          },
        })
      )
    })

    cols.push(
      columnHelper.display({
        id: 'actions',
        header: () => (
          <div className="text-right pr-4 text-[9px] font-black uppercase tracking-widest opacity-30">
            Actions
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2 pr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
              onClick={() => onSelectRecord(row.original)}
            >
              <Eye size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted active:scale-90"
              onClick={(e) => {
                e.stopPropagation()
                const blob = new Blob([JSON.stringify(row.original, null, 2)], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `record_${Date.now()}.json`
                a.click()
                toast.success('Record exported')
              }}
            >
              <Download size={14} className="opacity-40 hover:opacity-100" />
            </Button>
          </div>
        ),
      })
    )

    return cols as ColumnDef<any, any>[]
  }, [columns_list, results, selectedIndices, onSelectRecord])

  const table = useReactTable({
    data: results,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  const handleDownload = () => {
    const selectedData = results.filter((_: any, idx: number) => selectedIndices.has(idx))
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assetName}_export_${Date.now()}.json`
    a.click()
    toast.success(`Exported ${selectedIndices.size} records`)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-48 gap-8 opacity-40">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full" />
          <RefreshCw className="h-16 w-16 text-primary animate-spin" strokeWidth={1} />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse text-primary">
          Executing Oracle Context...
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
      {/* TOOLBAR */}
      <div className="px-8 py-4 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 leading-none">
              Context_Data_Frame
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <Badge
                variant="outline"
                className="h-6 px-3 border-primary/20 bg-primary/5 text-[10px] font-black text-primary tracking-widest uppercase rounded-md shadow-sm"
              >
                {formatNumber(data?.total_count || 0)} Total Objects
              </Badge>
              <div className="h-3 w-px bg-border/20" />
              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                Oracle_Live_Session
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {selectedIndices.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-1.5 shadow-xl shadow-primary/5"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  {selectedIndices.size} Selected_Buffer
                </span>
                <div className="h-4 w-px bg-primary/20 mx-1" />
                <Button
                  onClick={handleDownload}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-95"
                >
                  <Download size={14} /> Export_JSON
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                  onClick={() => setSelectedIndices(new Set())}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-background border-border/40 hover:bg-muted active:scale-95 transition-all shadow-sm"
            onClick={() => refetch()}
          >
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} /> Refresh_Cache
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        {viewMode === 'list' ? (
          <div className="w-full">
            <Table wrapperClassName="border-0 shadow-none bg-transparent overflow-visible">
              <TableHeader className="bg-muted/50 backdrop-blur-xl sticky top-0 z-20 border-b border-border/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-6"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {results.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        'border-border/5 hover:bg-primary/[0.02] transition-all group cursor-pointer border-b',
                        selectedIndices.has(row.index) && 'bg-primary/[0.03]'
                      )}
                      onClick={() => onSelectRecord(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 px-6">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tableColumns.length} className="h-[400px] text-center">
                      <div className="flex flex-col items-center justify-center opacity-20 gap-6 grayscale">
                        <Database size={80} strokeWidth={1} />
                        <div className="space-y-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.4em]">
                            Zero_Result_Matrix
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-widest">
                            No data objects resolved from Oracle for {assetName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1600px] mx-auto pb-48">
            {results.map((record: any, i: number) => {
              const isSelected = selectedIndices.has(i)
              return (
                <div
                  key={i}
                  onClick={() => onSelectRecord(record)}
                  className={cn(
                    'p-6 rounded-[2.5rem] bg-card border transition-all duration-500 group flex flex-col gap-6 relative overflow-hidden shadow-sm cursor-pointer hover:shadow-2xl hover:-translate-y-1.5',
                    isSelected
                      ? 'border-primary/40 bg-primary/[0.02] shadow-xl shadow-primary/5'
                      : 'border-border/40 hover:border-primary/20'
                  )}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div
                      className={cn(
                        'h-14 w-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 shadow-inner',
                        isSelected
                          ? 'bg-primary/20 text-primary rotate-12 scale-110'
                          : 'bg-muted/20 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      )}
                    >
                      <Box size={28} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-black h-5 px-2 uppercase tracking-[0.2em] border-none transition-colors',
                          isSelected
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-muted/30 text-muted-foreground/60'
                        )}
                      >
                        RECORD_INDEX_{i + pageOffset + 1}
                      </Badge>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          const next = new Set(selectedIndices)
                          if (next.has(i)) next.delete(i)
                          else next.add(i)
                          setSelectedIndices(next)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'h-5 w-5 rounded-lg border-2 transition-all',
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-border/40 group-hover:border-primary/40'
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10 flex-1 px-1">
                    {Object.entries(record)
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <div key={k} className="space-y-1.5 group/field">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary/20 group-hover/field:bg-primary transition-colors" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 group-hover/field:text-primary/60 transition-colors">
                              {k}
                            </span>
                          </div>
                          <p className="text-[12px] font-bold text-foreground/80 truncate leading-tight tracking-tight pl-3 tabular-nums">
                            {v === null ? (
                              <span className="opacity-20 italic font-medium">---</span>
                            ) : (
                              String(v)
                            )}
                          </p>
                        </div>
                      ))}
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-border/10 relative z-10">
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95',
                        isSelected
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10'
                      )}
                    >
                      Materialize_Entity
                    </Button>
                    <ArrowRight
                      size={16}
                      className={cn(
                        'text-primary transition-all duration-500',
                        isSelected
                          ? 'translate-x-0 opacity-100'
                          : 'translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                      )}
                    />
                  </div>

                  {/* Technical background decoration */}
                  <div className="absolute -right-12 -bottom-12 h-48 w-48 bg-primary/[0.02] blur-3xl rounded-full group-hover:bg-primary/[0.05] transition-all duration-700 pointer-events-none" />
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <span className="text-[40px] font-black font-mono leading-none">
                      {i + pageOffset + 1}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* FOOTER PAGINATION - Polished */}
      <div className="px-8 py-5 border-t border-border/10 bg-background/80 flex items-center justify-between shrink-0 backdrop-blur-2xl relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">
              Live_Navigation_Active
            </span>
            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Frame {pageOffset + 1} - {Math.min(pageOffset + pageSize, data?.total_count || 0)} OF{' '}
              {formatNumber(data?.total_count || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted transition-all active:scale-95"
            disabled={pageOffset === 0}
            onClick={() => onOffsetChange(Math.max(0, pageOffset - pageSize))}
          >
            <ChevronLeft size={14} />
          </Button>

          <div className="flex items-center gap-2 mx-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-white text-[10px] font-black shadow-lg shadow-primary/30 relative">
              {Math.floor(pageOffset / pageSize) + 1}
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-white rounded-full flex items-center justify-center">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse" />
              </div>
            </div>
            <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-widest mx-1">
              /
            </span>
            <span className="h-8 w-8 flex items-center justify-center text-[10px] font-black text-muted-foreground/60 border border-border/20 rounded-lg bg-muted/10">
              {Math.ceil((data?.total_count || 0) / pageSize) || 1}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted transition-all active:scale-95"
            disabled={pageOffset + pageSize >= (data?.total_count || 0)}
            onClick={() => onOffsetChange(pageOffset + pageSize)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
