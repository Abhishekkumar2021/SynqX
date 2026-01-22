import React from 'react'
import { MoreVertical, Search, Globe, Calendar, Database, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface Column<T> {
  header: string
  accessor: (item: T) => React.ReactNode
  className?: string
  width?: string
}

interface OSDUDiscoveryListProps<T> {
  items: T[]
  columns: Column<T>[]
  onInspect: (id: string) => void
  icon: any
  iconColor: string
  iconBg: string
  getDisplayName: (item: T) => string
  getId: (item: T) => string
  isLoading?: boolean
}

export function OSDUDiscoveryList<T extends { id: string; kind?: string }>({
  items,
  columns,
  onInspect,
  icon: Icon,
  iconColor,
  iconBg,
  getDisplayName,
  getId,
  isLoading,
}: OSDUDiscoveryListProps<T>) {
  if (items.length === 0 && !isLoading) {
    return (
      <div className="py-20 text-center opacity-40 bg-background rounded-3xl border border-border/40">
        <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Records Found</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-background rounded-3xl border border-border/40 overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-[900px] table-fixed">
          <thead>
            <tr className="border-b border-border/10 bg-muted/5">
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-[35%]">
                Discovery Asset
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60',
                    col.width || 'w-auto',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-[140px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {items.map((item) => {
              const name = getDisplayName(item)
              const id = getId(item)

              return (
                <tr
                  key={item.id}
                  className="group hover:bg-muted/10 transition-colors cursor-pointer"
                  onClick={() => onInspect(item.id)}
                >
                  <td className="px-6 py-4 overflow-hidden">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm shrink-0',
                          iconBg,
                          iconColor,
                          'border-current/10'
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h4 className="font-bold text-sm uppercase tracking-tight truncate text-foreground/90">
                          {name}
                        </h4>
                        <p className="text-[9px] font-mono text-muted-foreground/40 truncate uppercase">
                          {id}
                        </p>
                      </div>
                    </div>
                  </td>
                  {columns.map((col, idx) => (
                    <td key={idx} className={cn('px-6 py-4 align-middle overflow-hidden', col.className)}>
                      <div className="text-[11px] font-bold text-foreground/80 truncate">
                        {col.accessor(item)}
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right shrink-0">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest px-3"
                        onClick={(e) => {
                          e.stopPropagation()
                          onInspect(item.id)
                        }}
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
