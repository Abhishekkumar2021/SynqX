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
    X
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
import { formatNumber } from '@/lib/utils'
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
      const sql = customQuery || `SELECT * FROM ${assetName}`

      const result = await getConnectionMetadata(connectionId, 'execute_query', {
        query: sql,
        limit: pageSize,
        offset: pageOffset,
      })

      const countSql = `SELECT COUNT(*) as CNT FROM (${sql})`
      const countRes = await getConnectionMetadata(connectionId, 'execute_query', {
        query: countSql,
      })
      const total = countRes?.results?.[0]?.CNT || countRes?.results?.[0]?.cnt || 0

      return {
        results: result?.results || [],
        columns: result?.summary?.columns || (result?.results?.[0] ? Object.keys(result.results[0]) : []),
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
    columns_list.slice(0, 8).forEach((colName: string) => {
        cols.push(
            columnHelper.accessor(colName, {
                id: colName,
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2 text-[10px] font-black uppercase tracking-widest hover:bg-transparent -ml-2"
                    >
                        {colName}
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                ),
                cell: ({ getValue }) => {
                    const val = getValue()
                    return (
                        <span className="text-[11px] font-medium text-foreground/80 truncate block max-w-[200px]">
                            {val === null ? <span className="opacity-20 italic">NULL</span> : String(val)}
                        </span>
                    )
                }
            })
        )
    })

    cols.push(
        columnHelper.display({
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => onSelectRecord(row.original)}
                    >
                        <Eye size={14} />
                    </Button>
                </div>
            )
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
            <span className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse text-primary">Executing Oracle Context...</span>
        </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background/50">
      {/* TOOLBAR */}
      <div className="px-8 py-3 border-b border-border/10 bg-muted/10 flex items-center justify-between shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-6">
            <Badge variant="outline" className="h-7 px-4 border-border/40 bg-background text-[10px] font-black text-foreground/80 tracking-widest uppercase rounded-full shadow-sm">
                {formatNumber(data?.total_count || 0)} Total Records
            </Badge>
            <div className="h-4 w-px bg-border/20" />
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-3 gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all" onClick={() => refetch()}>
                    <RefreshCw size={12} /> Refetch
                </Button>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <AnimatePresence>
                {selectedIndices.size > 0 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedIndices.size} SELECTED</span>
                        <div className="h-5 w-px bg-border/20 mx-1" />
                        <Button onClick={handleDownload} variant="default" size="sm" className="h-8 px-5 rounded-xl gap-2.5 font-black uppercase text-[10px] tracking-widest bg-primary shadow-lg shadow-primary/20 text-white transition-all active:scale-95">
                            <Download size={14} /> Download JSON
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-muted" onClick={() => setSelectedIndices(new Set())}>
                            <X size={14} />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {viewMode === 'list' ? (
            <div className="w-full">
                <Table wrapperClassName="border-0 shadow-none bg-transparent overflow-visible">
                    <TableHeader className="bg-muted/90 backdrop-blur-xl sticky top-0 z-10 border-b border-border/40">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/40">
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} className="h-11 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {results.length > 0 ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="border-border/20 hover:bg-muted/10 transition-colors group cursor-pointer" onClick={() => onSelectRecord(row.original)}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={tableColumns.length} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-30 gap-4">
                                        <Database size={48} strokeWidth={1} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Oracle data returned</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        ) : (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto pb-32">
                {results.map((record: any, i: number) => (
                    <div key={i} onClick={() => onSelectRecord(record)} className="p-6 rounded-[2rem] bg-card border border-border/40 hover:border-primary/30 hover:shadow-2xl transition-all group flex flex-col gap-5 relative overflow-hidden shadow-sm cursor-pointer">
                        <div className="flex items-start justify-between relative z-10">
                            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner text-muted-foreground group-hover:text-primary">
                                <Box size={24} />
                            </div>
                            <div className="flex flex-col items-end">
                                <Badge variant="outline" className="text-[8px] font-black h-5 px-2 bg-muted/30 border-none uppercase tracking-widest mb-1">
                                    RECORD_{i + pageOffset + 1}
                                </Badge>
                                <Checkbox checked={selectedIndices.has(i)} onCheckedChange={() => {
                                    const next = new Set(selectedIndices)
                                    if (next.has(i)) next.delete(i)
                                    else next.add(i)
                                    setSelectedIndices(next)
                                }} onClick={e => e.stopPropagation()} />
                            </div>
                        </div>

                        <div className="space-y-3 relative z-10 flex-1">
                            {Object.entries(record).slice(0, 4).map(([k, v]) => (
                                <div key={k} className="space-y-1">
                                    <span className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">{k}</span>
                                    <p className="text-[11px] font-bold text-foreground/80 truncate leading-tight">{v === null ? '---' : String(v)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/10 relative z-10">
                            <Button variant="ghost" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all bg-primary/5 hover:bg-primary/10">
                                Inspect Record
                            </Button>
                            <ArrowRight size={14} className="text-primary translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                        
                        <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
                    </div>
                ))}
            </div>
        )}
      </ScrollArea>

      {/* FOOTER PAGINATION */}
      <div className="px-8 py-4 border-t border-border/10 bg-muted/5 flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            Showing {pageOffset + 1} - {Math.min(pageOffset + pageSize, data?.total_count || 0)} of {formatNumber(data?.total_count || 0)}
        </div>
        
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold uppercase text-[9px] tracking-widest gap-2 active:scale-95 disabled:opacity-30" disabled={pageOffset === 0} onClick={() => onOffsetChange(Math.max(0, pageOffset - pageSize))}>
                <ChevronLeft size={14} /> Previous Page
            </Button>
            <div className="flex items-center gap-1 mx-2">
                <span className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary/20">
                    {Math.floor(pageOffset / pageSize) + 1}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/40 mx-1">/</span>
                <span className="text-[10px] font-bold text-muted-foreground/60">
                    {Math.ceil((data?.total_count || 0) / pageSize)}
                </span>
            </div>
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold uppercase text-[9px] tracking-widest gap-2 active:scale-95 disabled:opacity-30" disabled={(pageOffset + pageSize) >= (data?.total_count || 0)} onClick={() => onOffsetChange(pageOffset + pageSize)}>
                Next Page <ChevronRight size={14} />
            </Button>
        </div>
      </div>
    </div>
  )
}
