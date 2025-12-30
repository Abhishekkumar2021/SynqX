/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { type QueryResponse } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Terminal, ListFilter, Copy,
    Database, Download, FileJson, FileText,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Columns, Settings2, EyeOff, MoreHorizontal,
    PinOff, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X
} from 'lucide-react';
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
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn, formatNumber } from '@/lib/utils';
import { CodeBlock } from '@/components/ui/docs/CodeBlock';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

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
} from "@tanstack/react-table"

interface ResultsGridProps {
    data: QueryResponse | null;
    isLoading: boolean;
    isMaximized?: boolean;
    title?: string;
    description?: string;
    onSelectRows?: (indices: Set<number>) => void;
    selectedRows?: Set<number>;
    hideHeader?: boolean;
}

type Density = 'compact' | 'standard' | 'comfortable';

export const ResultsGrid: React.FC<ResultsGridProps> = ({ 
    data, 
    isLoading, 
    title, 
    description,
    onSelectRows,
    selectedRows,
    hideHeader = false
}) => {
    // --- Table State ---
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [], right: [] });
    const [globalFilter, setGlobalFilter] = useState('');
    const [density, setDensity] = useState<Density>('standard');
    
    // Sync external selectedRows prop to internal table state
    useEffect(() => {
        if (!selectedRows) {
            setRowSelection({});
            return;
        }
        const newSelection: RowSelectionState = {};
        selectedRows.forEach(idx => {
            newSelection[idx] = true;
        });
        setRowSelection(newSelection);
    }, [selectedRows]);

    // Update parent when selection changes
    const handleRowSelectionChange = useCallback((updaterOrValue: any) => {
        const newSelection = typeof updaterOrValue === 'function' 
            ? updaterOrValue(rowSelection) 
            : updaterOrValue;
        
        setRowSelection(newSelection);
        
        if (onSelectRows) {
            const indices = new Set(Object.keys(newSelection).map(Number));
            onSelectRows(indices);
        }
    }, [rowSelection, onSelectRows]);


    // --- Data Preparation ---
    const tableData = useMemo(() => {
        if (!data?.results) return [];
        return data.results.map((row, idx) => ({ ...row, __idx: idx }));
    }, [data]);

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!data?.columns) return [];

        const cols: ColumnDef<any>[] = [];

        // 1. Selection Column (if enabled)
        if (onSelectRows) {
            cols.push({
                id: "select",
                header: ({ table }) => (
                    <div className="flex justify-center">
                        <Checkbox
                            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                            aria-label="Select all"
                        />
                    </div>
                ),
                cell: ({ row }) => (
                    <div className="flex justify-center">
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label="Select row"
                        />
                    </div>
                ),
                size: 40,
                enablePinning: true,
                enableSorting: false,
                enableHiding: false,
            });
        }

        // 2. Index Column
        cols.push({
            id: "index",
            header: () => <div className="text-center w-full">IDX</div>,
            accessorFn: (row) => row.__idx + 1,
            cell: ({ getValue }) => <div className="text-center font-mono text-muted-foreground/50 font-bold text-[10px]">{getValue() as number}</div>,
            size: 50,
            enablePinning: true,
            enableSorting: true,
            enableHiding: false,
        });

        // 3. Data Columns
        data.columns.forEach(colName => {
            cols.push({
                accessorKey: colName,
                header: ({ column }) => <DataTableColumnHeader column={column} title={colName} />,
                cell: ({ getValue }) => <DataTableCell value={getValue()} density={density} />,
                minSize: 100,
            });
        });

        return cols;
    }, [data, onSelectRows, density]);

    // --- Table Instance ---
    const table = useReactTable({
        data: tableData,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            columnPinning,
            globalFilter,
        },
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
        getRowId: row => String(row.__idx), // Use stable index as ID
        initialState: {
            pagination: {
                pageSize: 50,
            },
            columnPinning: {
                left: ['select', 'index'],
            }
        },
    });

    // --- Export Logic ---
    const downloadFile = (content: string, fileName: string, contentType: string) => {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        toast.success(`Exported to ${fileName}`);
    };

    const handleExport = (format: 'json' | 'csv') => {
        if (!data || table.getRowModel().rows.length === 0) return;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const visibleCols = table.getVisibleLeafColumns().filter(c => c.id !== 'select' && c.id !== 'index');
        const rows = table.getFilteredRowModel().rows; // Export all filtered rows, not just paginated

        const exportData = rows.map(row => {
            const obj: any = {};
            visibleCols.forEach(col => {
                obj[col.id] = row.getValue(col.id);
            });
            return obj;
        });

        if (format === 'json') {
            downloadFile(JSON.stringify(exportData, null, 2), `export_${timestamp}.json`, 'application/json');
        } else {
            const headers = visibleCols.map(c => c.id).join(',');
            const csvRows = exportData.map(row =>
                visibleCols.map(col => {
                    let val = row[col.id];
                    if (val !== null && typeof val === 'object') {
                        try { val = JSON.stringify(val); } catch (e) { val = '[Object]'; }
                    }
                    return `"${String(val ?? '').replace(/"/g, '""')}"`;
                }).join(',')
            ).join('\n');
            downloadFile(`${headers}\n${csvRows}`, `export_${timestamp}.csv`, 'text/csv');
        }
    };

    // --- Styling Helpers ---
    const densityConfig = {
        compact: { cell: "px-3 py-1 text-[11px]", header: "px-3 py-2 h-8" },
        standard: { cell: "px-4 py-2 text-[13px]", header: "px-4 py-3 h-10" },
        comfortable: { cell: "px-6 py-4 text-sm", header: "px-6 py-4 h-12" }
    };

    if (isLoading) return <LoadingSkeleton />;
    if (!data) return <EmptyState />;

    if (tableData.length === 0 && data.results.length === 0 && data.columns.length === 0) {
        return (
             <div className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground gap-4 bg-card/5 animate-in fade-in duration-500">
                <div className="p-4 rounded-full bg-success/10 text-success">
                    <Terminal size={32} />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">Command Executed</h3>
                    <p className="text-xs text-muted-foreground">No data returned.</p>
                </div>
            </div>
        );
    }
    
    const activeFilterCount = (globalFilter ? 1 : 0) + columnFilters.length;
    const clearAllFilters = () => {
        setGlobalFilter('');
        setColumnFilters([]);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full bg-background/60 dark:bg-background/40 backdrop-blur-2xl backdrop-saturate-150 relative overflow-hidden isolate">
            <div className="absolute inset-x-0 top-0 h-px bg-white/40 dark:bg-white/10 pointer-events-none z-50" />

            {/* Header Control Bar */}
            {!hideHeader && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/40 shrink-0 z-50 gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {title && (
                            <div className="flex flex-col mr-2 shrink-0">
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-foreground truncate max-w-[120px] sm:max-w-none">{title}</span>
                                {description && <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[120px] sm:max-w-none hidden xs:block">{description}</span>}
                            </div>
                        )}
                        <div className="relative flex-1 max-w-[240px] group">
                            <ListFilter className={cn(
                                "z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
                                globalFilter ? "text-primary" : "text-muted-foreground group-focus-within:text-primary"
                            )} />
                            <Input
                                placeholder="Search..."
                                className="h-8 pl-9 rounded-xl bg-background/50 border-border/40 text-[11px] font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-none"
                                value={globalFilter ?? ''}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                        </div>
                         <div className="flex items-center gap-1.5 shrink-0">
                             <Badge variant="outline" className="h-5 px-2 rounded-full border-border/50 text-[9px] font-black uppercase tracking-tight text-muted-foreground/60 bg-muted/20 whitespace-nowrap">
                                {formatNumber(table.getFilteredRowModel().rows.length)}
                            </Badge>
                            {activeFilterCount > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={clearAllFilters}
                                            className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                        >
                                            <X size={12} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Clear Filters</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                        {/* Density & Settings */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary">
                                    <Settings2 size={15} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 glass-panel border-border/40 rounded-2xl shadow-2xl p-1 z-[10000]" align="end">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Density</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as Density)}>
                                    <DropdownMenuRadioItem value="compact" className="text-xs font-medium rounded-lg">Compact</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="standard" className="text-xs font-medium rounded-lg">Standard</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="comfortable" className="text-xs font-medium rounded-lg">Comfortable</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Columns */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 rounded-xl gap-2 text-xs font-medium bg-muted/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all px-2 md:px-3">
                                    <Columns size={14} />
                                    <span className="hidden md:inline">Columns</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 glass-panel border-border/40 rounded-2xl shadow-2xl p-1 max-h-96 overflow-y-auto custom-scrollbar z-[10000]" align="end">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Visible Columns</DropdownMenuLabel>
                                {table.getAllColumns().filter(c => c.id !== 'select' && c.id !== 'index').map(column => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        className="text-xs font-medium cursor-pointer rounded-lg"
                                    >
                                        <span className="truncate">{column.id}</span>
                                    </DropdownMenuCheckboxItem>
                                ))}
                                <DropdownMenuSeparator className="bg-border/30" />
                                <DropdownMenuItem onClick={() => table.toggleAllColumnsVisible(true)} className="text-xs cursor-pointer rounded-lg justify-center text-primary font-bold">
                                    Reset to All
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                         {/* Export */}
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-primary/5 hover:bg-primary/10 text-primary transition-all px-2 md:px-3">
                                    <Download size={14} />
                                    <span className="hidden md:inline">Export</span>
                                </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent className="w-56 glass-panel border-border/40 rounded-2xl shadow-2xl p-2 z-[10000]" align="end">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Data Formats</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleExport('json')} className="rounded-lg gap-3 py-2.5 cursor-pointer">
                                    <FileJson className="h-4 w-4 text-orange-500" />
                                    <span className="font-bold text-xs uppercase italic">JSON Registry</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('csv')} className="rounded-lg gap-3 py-2.5 cursor-pointer">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="font-bold text-xs uppercase italic">CSV Spreadsheet</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            )}

             {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-card/5 relative min-h-0">
                <table className="w-full text-left border-separate border-spacing-0 min-w-max relative">
                     <thead className="sticky top-0 z-40">
                         {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-sm">
                                {headerGroup.headers.map(header => {
                                    // Pinning Styles
                                    const pinStyles = getCommonPinningStyles(header.column);
                                    const isPinned = header.column.getIsPinned();
                                    const isLastLeft = isPinned === 'left' && header.column.getIsLastColumn('left');
                                    const isFirstRight = isPinned === 'right' && header.column.getIsFirstColumn('right');
                                    
                                    return (
                                        <th
                                            key={header.id}
                                            style={pinStyles}
                                            className={cn(
                                                "border-r border-b-2 border-border/60 last:border-r-0 bg-background/90 backdrop-blur-xl transition-colors",
                                                densityConfig[density].header,
                                                (header.column.getIsSorted() || header.column.getIsFiltered()) && "bg-primary/5",
                                                isPinned && "z-50 bg-background/95 backdrop-blur-md",
                                                isLastLeft && "border-r-2 border-r-border/60 shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)]",
                                                isFirstRight && "border-l-2 border-l-border/60 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]"
                                            )}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-border/10">
                         {table.getRowModel().rows.length === 0 ? (
                             <tr>
                                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground text-xs italic">
                                    No results match your filters.
                                </td>
                            </tr>
                         ) : (
                            table.getRowModel().rows.map(row => (
                                <tr 
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        "group/row transition-colors hover:bg-muted/50",
                                        "even:bg-muted/30 odd:bg-transparent",
                                        row.getIsSelected() && "bg-primary/10"
                                    )}
                                >
                                    {row.getVisibleCells().map(cell => {
                                         const pinStyles = getCommonPinningStyles(cell.column);
                                         const isPinned = cell.column.getIsPinned();
                                         const isLastLeft = isPinned === 'left' && cell.column.getIsLastColumn('left');
                                         const isFirstRight = isPinned === 'right' && cell.column.getIsFirstColumn('right');

                                         return (
                                            <td
                                                key={cell.id}
                                                style={pinStyles}
                                                className={cn(
                                                    "border-r border-b border-border/40 last:border-r-0 max-w-md",
                                                    cell.column.id === 'select' || cell.column.id === 'index' ? "p-0" : densityConfig[density].cell,
                                                    cell.column.getIsFiltered() && "bg-primary/2",
                                                    isPinned && "z-30 bg-background/95 backdrop-blur-md",
                                                    isLastLeft && "border-r-2 border-r-border/60 shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)]",
                                                    isFirstRight && "border-l-2 border-l-border/60 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]"
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                         );
                                    })}
                                </tr>
                            ))
                         )}
                    </tbody>
                </table>
            </div>

             {/* Footer Control Bar */}
             <footer className="px-5 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between shrink-0 z-50">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rows</span>
                         <Select 
                            value={String(table.getState().pagination.pageSize)} 
                            onValueChange={(v) => table.setPageSize(Number(v))}
                        >
                             <SelectTrigger className="h-7 w-16 text-[10px] font-bold">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="z-[10000]">
                                {[10, 25, 50, 100, 500].map(size => (
                                     <SelectItem key={size} value={String(size)} className="text-[10px] font-bold">{size}</SelectItem>
                                ))}
                             </SelectContent>
                         </Select>
                    </div>
                    <div className="h-4 w-px bg-border/40" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                        Page <span className="text-foreground font-bold">{table.getState().pagination.pageIndex + 1}</span> of <span className="text-foreground font-bold">{table.getPageCount()}</span>
                    </span>
                 </div>

                 <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg disabled:opacity-30"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronsLeft size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg disabled:opacity-30"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft size={14} />
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg disabled:opacity-30"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight size={14} />
                    </Button>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg disabled:opacity-30"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronsRight size={14} />
                    </Button>
                 </div>
            </footer>

        </div>
    );
};


// --- Sub Components ---

const DataTableCell = ({ value, density }: { value: any, density: Density }) => {
    const isObject = value !== null && typeof value === 'object';
    
    if (value === null) {
        return <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">NULL</span>;
    }
    
    if (isObject) {
        return (
             <div className="w-full bg-background/50 rounded-none overflow-hidden p-1">
                <CodeBlock 
                    code={JSON.stringify(value, null, 2)} 
                    language="json" 
                    maxHeight='128px' 
                    editable={false} 
                    rounded={false} 
                    usePortal={true}
                />
            </div>
        );
    }
    
    return (
        <div className="flex items-center group/cell gap-3">
             <div className="flex-1 min-w-0">
                {typeof value === 'boolean' ? (
                     <Badge variant="outline" className={cn(
                        "text-[9px] px-2.5 h-5 font-black uppercase border-0 tracking-widest",
                        value ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                    )}>
                        {String(value)}
                    </Badge>
                ) : typeof value === 'number' ? (
                    <span className="text-[13px] font-mono font-bold text-primary tracking-tighter">{value.toLocaleString()}</span>
                ) : (
                     <span className={cn(
                        "font-medium text-foreground/80 tracking-tight leading-relaxed line-clamp-2",
                        density === 'compact' ? "text-[11px]" : "text-[13px]"
                    )}>{String(value)}</span>
                )}
             </div>
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(String(value));
                    toast.success("Copied to clipboard");
                }}
                className="opacity-0 group-hover/cell:opacity-100 p-1.5 rounded-lg bg-primary/10 text-primary transition-all hover:scale-110 active:scale-95 shrink-0"
            >
                <Copy size={10} />
            </button>
        </div>
    );
};

const DataTableColumnHeader = ({ column, title }: { column: Column<any, unknown>, title: string }) => {
    const isFiltered = column.getIsFiltered();
    
    return (
        <div className="flex items-center justify-between gap-2">
             <div 
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 group/h"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors group-hover/h:text-foreground",
                    column.getIsSorted() && "text-primary"
                )}>{title}</span>
            </div>
            
             <div className="flex items-center gap-1 shrink-0">
                {isFiltered && <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                                "h-6 w-6 rounded-lg hover:bg-primary/10",
                                (column.getIsSorted() || isFiltered || column.getIsPinned()) ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"
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
                    <DropdownMenuContent align="end" className="w-56 z-[10001]">
                         <div className="px-2 py-2">
                            <Input
                                placeholder={`Filter ${title}...`}
                                value={(column.getFilterValue() as string) ?? ""}
                                onChange={(e) => column.setFilterValue(e.target.value)}
                                className="h-8 text-xs bg-muted/20"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                            <ArrowUp size={14} className="mr-2 text-muted-foreground/70" /> Asc
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                            <ArrowDown size={14} className="mr-2 text-muted-foreground/70" /> Desc
                        </DropdownMenuItem>
                        {column.getIsSorted() && (
                            <DropdownMenuItem onClick={() => column.clearSorting()}>
                                <X size={14} className="mr-2 text-muted-foreground/70" /> Clear Sort
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">Pinning</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => column.pin('left')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Pin Left
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => column.pin('right')}>
                            <ArrowRight className="mr-2 h-4 w-4" /> Pin Right
                        </DropdownMenuItem>
                        {column.getIsPinned() && (
                            <DropdownMenuItem onClick={() => column.pin(false)}>
                                <PinOff size={14} className="mr-2" /> Unpin
                            </DropdownMenuItem>
                        )}

                         <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => column.toggleVisibility(false)} className="text-destructive focus:text-destructive">
                            <EyeOff size={14} className="mr-2" /> Hide Column
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
        </div>
    );
};

// CSS for sticky pinning using React Table
const getCommonPinningStyles = (column: Column<any>): React.CSSProperties => {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === 'left' ? `${column.getStart()}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter()}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    backgroundColor: isPinned ? 'var(--background)' : undefined,
  };
};

const LoadingSkeleton = () => (
    <div className="flex-1 h-full flex flex-col p-6 gap-6 bg-background/50 animate-pulse overflow-hidden">
        <div className="flex gap-4 border-b border-border pb-6 shrink-0">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-32 rounded-xl bg-muted/40" />)}
        </div>
        <div className="space-y-4 flex-1 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-12 flex-1 rounded-2xl bg-muted/20" />
                    <Skeleton className="h-12 w-24 rounded-2xl bg-muted/10" />
                </div>
            ))}
        </div>
    </div>
);

const EmptyState = ({ message, description }: { message?: string, description?: string }) => (
    <div className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground gap-8 bg-card/5 animate-in fade-in duration-1000">
        <div className="relative group">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-700" />
            <div className="relative h-24 w-24 rounded-[2.5rem] glass-card flex items-center justify-center border-0 shadow-2xl">
                <Terminal className="h-12 w-12 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
        </div>
        <div className="text-center space-y-3">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">{message || "Waiting for Execution"}</h3>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 max-w-xs leading-loose">
                {description || "Execute a command to populate the grid"}
            </p>
        </div>
    </div>
);