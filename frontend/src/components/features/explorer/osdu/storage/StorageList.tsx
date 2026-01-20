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
  Eye, 
  ArrowUpDown, 
  MoreHorizontal, 
  FileDown, 
  Copy, 
  Trash2,
  FileArchive,
  Image,
  FileCode,
  FileText,
  File,
  Globe
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatBytes } from '@/lib/utils'

interface StorageListProps {
  files: any[]
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  onSelectFile: (id: string) => void
  onDownload: (id: string, name: string) => void
}

const getFileIcon = (name: string = '') => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['zip', 'tar', 'gz', '7z'].includes(ext || ''))
    return <FileArchive className="text-orange-500" />
  if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || ''))
    return <Image className="text-pink-500" />
  if (['json', 'yaml', 'xml', 'csv', 'sql'].includes(ext || ''))
    return <FileCode className="text-blue-500" />
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || ''))
    return <FileText className="text-rose-500" />
  return <File className="text-primary" />
}

export const StorageList: React.FC<StorageListProps> = ({
  files,
  selectedIds,
  toggleSelection,
  onSelectFile,
  onDownload,
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
        cell: ({ row }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(row.original.id)}
              onCheckedChange={() => toggleSelection(row.original.id)}
              className="translate-y-[2px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
        ),
        enableSorting: false,
        size: 40,
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 text-[10px] font-black uppercase tracking-widest hover:bg-transparent"
            >
              File Name
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-3 max-w-[300px]">
             <div className="h-8 w-8 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center shrink-0">
                {React.cloneElement(getFileIcon(row.original.name) as any, { size: 16 })}
             </div>
             <div className="flex flex-col min-w-0">
                 <span className="font-bold text-xs truncate text-foreground/90" title={row.original.name}>
                    {row.original.name}
                 </span>
                 <span className="text-[9px] text-muted-foreground/60 truncate font-mono">
                    {row.original.id.split(':').pop()}
                 </span>
             </div>
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ row }) => (
            <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                 {row.original.category}
            </Badge>
        ),
      }),
      columnHelper.accessor('size', {
        header: 'Size',
        cell: ({ row }) => (
            <span className="text-[11px] font-mono font-medium text-foreground/80">
                {formatBytes(parseInt(row.original.size))}
            </span>
        ),
      }),
       columnHelper.accessor('source', {
        header: 'Source',
        cell: ({ row }) => {
            const src = row.original.source.split('/').pop() || 'Persistent';
            return (
                <div className="flex items-center gap-1.5 opacity-70">
                    <Globe size={12} className="text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {src}
                    </span>
                </div>
            )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Indexed',
        cell: ({ row }) => (
             <span className="font-mono text-[10px] text-muted-foreground">
                {new Date(row.original.createdAt).toLocaleDateString()}
             </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
             <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground"
              onClick={() => onDownload(row.original.id, row.original.name)}
            >
              <FileDown size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground"
              onClick={() => onSelectFile(row.original.id)}
            >
              <Eye size={14} />
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
                     onClick={() => copyToClipboard(row.original.id, 'ID')}
                >
                    <Copy size={12} className="opacity-50" /> Copy ID
                </DropdownMenuItem>
                 <DropdownMenuItem
                    className="text-[10px] font-bold uppercase tracking-widest gap-2 cursor-pointer"
                    onClick={() => onDownload(row.original.id, row.original.name)}
                >
                    <FileDown size={12} className="opacity-50" /> Download
                </DropdownMenuItem>
                <DropdownMenuSeparator className="opacity-20" />
                <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest gap-2 text-destructive focus:text-destructive cursor-pointer">
                    <Trash2 size={12} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ],
    [selectedIds, toggleSelection, onSelectFile, onDownload]
  )

  const table = useReactTable({
    data: files,
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
                className="border-border/20 hover:bg-muted/10 transition-colors group cursor-pointer"
                onClick={() => onSelectFile(row.original.id)} 
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
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
