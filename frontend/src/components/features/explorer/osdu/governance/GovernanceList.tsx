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
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  Copy, 
  Trash2,
  Users,
  ShieldCheck,
  Info
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GovernanceListProps {
  items: any[]
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  initialMode: 'identity' | 'compliance'
}

export const GovernanceList: React.FC<GovernanceListProps> = ({
  items,
  selectedIds,
  toggleSelection,
  initialMode,
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
        header: ({ table }) => <div className="px-1" />,
        cell: ({ row }) => {
          const id = row.original.id || row.original.name || row.original.email
          return (
            <div className="px-1" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                checked={selectedIds.has(id)}
                onCheckedChange={() => toggleSelection(id)}
                className="translate-y-[2px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
            </div>
          )
        },
        enableSorting: false,
        size: 40,
      }),
      columnHelper.accessor('name', { // Fallback accessor, cell uses custom logic
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 text-[10px] font-black uppercase tracking-widest hover:bg-transparent"
            >
              Entity Name
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => {
            const displayName = row.original.displayName || row.original.name || row.original.email?.split('@')[0]
            const id = row.original.id || row.original.name || row.original.email
            return (
                <div className="flex items-center gap-3 max-w-[300px]">
                    <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                        initialMode === 'identity' 
                            ? "bg-indigo-500/5 text-indigo-600 border-indigo-500/10"
                            : "bg-rose-500/5 text-rose-600 border-rose-500/10"
                    )}>
                        {initialMode === 'identity' ? <Users size={14} /> : <ShieldCheck size={14} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs truncate text-foreground/90" title={displayName}>
                            {displayName}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 truncate font-mono">
                            {id}
                        </span>
                    </div>
                </div>
            )
        },
      }),
      columnHelper.display({
        id: 'type',
        header: 'Type',
        cell: () => (
            <Badge variant="outline" className={cn(
                "h-5 px-2 text-[9px] font-black uppercase tracking-widest border px-1.5 py-0 rounded-md tracking-wider h-5 shrink-0",
                initialMode === 'identity' 
                  ? "bg-indigo-500/5 text-indigo-600 border-indigo-500/20"
                  : "bg-rose-500/5 text-rose-600 border-rose-500/20"
            )}>
                 {initialMode === 'identity' ? 'Security Group' : 'Legal Tag'}
            </Badge>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ row }) => (
            <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[200px] block" title={row.original.description}>
                {row.original.description || '-'}
            </span>
        ),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: () => (
             <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black h-5 uppercase">
                Active
            </Badge>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => {
            const id = row.original.id || row.original.name || row.original.email
            return (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground"
                    onClick={() => copyToClipboard(id, 'ID')}
                    >
                        <Copy size={14} />
                    </Button>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/60">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/40 bg-background/95 backdrop-blur-sm">
                        <DropdownMenuItem
                            className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                            onClick={() => copyToClipboard(id, 'ID')}
                        >
                            <Copy size={12} className="opacity-50" /> Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                        >
                            <Info size={12} className="opacity-50" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="opacity-20" />
                        <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2 text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 size={12} /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
      }),
    ],
    [selectedIds, toggleSelection, initialMode]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <div className="w-full pb-24">
      <Table wrapperClassName="border-0 shadow-none bg-transparent overflow-visible">
        <TableHeader className="bg-muted/90 backdrop-blur-xl sticky top-0 z-10 border-b border-border/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-border/40">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-11 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
                className="border-border/20 hover:bg-muted/10 transition-colors group cursor-default"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-muted-foreground">
                No governance records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
