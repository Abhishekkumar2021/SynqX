import React, { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, ArrowUpDown, MoreHorizontal, Hash, Binary, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface MeshListProps {
  results: any[]
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  onSelectRecord: (id: string) => void
}

export const MeshList: React.FC<MeshListProps> = ({
  results,
  selectedIds,
  onToggleSelection,
  onSelectRecord,
}) => {
  const [sorting, setSorting] = useState<SortingState>([])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const columnHelper = createColumnHelper<any>()

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <div className="px-1">
            {/* Select All is handled by parent Toolbar, but we could add it here too if desired */}
            {/* For now keeping it simple as per MeshGrid parity */}
          </div>
        ),
        cell: ({ row }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(row.original.id)}
              onCheckedChange={() => onToggleSelection(row.original.id)}
              className="translate-y-[2px]"
            />
          </div>
        ),
        enableSorting: false,
        size: 40,
      }),
      columnHelper.accessor('id', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 text-[10px] font-black uppercase tracking-widest hover:bg-transparent"
            >
              Entity ID
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="flex flex-col max-w-[200px]">
            <span className="font-bold text-xs truncate" title={row.original.id}>
              {row.original.id.split(':').pop()}
            </span>
            <span className="text-[9px] text-muted-foreground/50 truncate font-mono">
              {row.original.id}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('kind', {
        header: 'Kind',
        cell: ({ row }) => {
          // Parse URN: authority:source:entity:version
          const parts = row.original.kind.split(':')
          const shortKind = parts[2] || 'Unknown'
          return (
            <div className="flex flex-col max-w-[250px]">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-5 px-2 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary/80"
                >
                  {shortKind}
                </Badge>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('authority', {
        header: 'Partition',
        cell: ({ row }) => {
          const parts = row.original.kind.split(':')
          const authority = parts[0] || row.original.authority || 'OSDU'
          return (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {authority}
            </span>
          )
        },
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: ({ row }) => {
          const parts = row.original.kind.split(':')
          const source = parts[1] || row.original.source || 'Standard'
          return <span className="text-[10px] font-medium text-foreground/70">{source}</span>
        },
      }),
      columnHelper.accessor('version', {
        header: 'Version',
        cell: ({ row }) => (
          <span className="font-mono text-[10px] text-muted-foreground">
            {row.original.version ? String(row.original.version) : '-'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={() => onSelectRecord(row.original.id)}
            >
              <Eye size={14} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground/50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl border-border/40 bg-background/95 backdrop-blur-sm"
              >
                <DropdownMenuItem
                  className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                  onClick={() => copyToClipboard(row.original.id, 'ID')}
                >
                  <Hash size={12} className="opacity-50" /> Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                  onClick={() => onSelectRecord(row.original.id)}
                >
                  <Binary size={12} className="opacity-50" /> Inspect
                </DropdownMenuItem>
                <DropdownMenuSeparator className="opacity-20" />
                <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2 text-rose-500 focus:text-rose-500 cursor-pointer">
                  <Trash2 size={12} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ],
    [selectedIds, onToggleSelection, onSelectRecord]
  )

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <div className="w-full">
      <Table wrapperClassName="border-0 shadow-none bg-transparent overflow-visible">
        <TableHeader className="bg-muted/90 backdrop-blur-xl sticky top-0 z-10 border-b border-border/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/40">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-11 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60"
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className="border-border/20 hover:bg-muted/10 transition-colors group cursor-pointer"
                onClick={() => onSelectRecord(row.original.id)} // Click row to inspect
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-xs text-muted-foreground"
              >
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
