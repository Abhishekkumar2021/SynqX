import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'
import { Database, Download } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ProSourceDataTableProps {
  connectionId: number
  assetName: string
  customQuery?: string
  onSelectRecord: (record: any) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
}

export const ProSourceDataTable: React.FC<ProSourceDataTableProps> = ({
  connectionId,
  assetName,
  customQuery,
  onSelectRecord,
  pageOffset,
  onOffsetChange,
}) => {
  const pageSize = 50
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Fetch Data with Pagination
  const { data, isLoading } = useQuery({
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
        ...result,
        total_count: total,
      }
    },
    enabled: !!assetName,
    keepPreviousData: true,
  })

  const handleDownloadSelected = () => {
    const results = data?.results || (data as any)?.rows
    if (!results || selectedIndices.size === 0) return
    const selectedData = results.filter((_: any, idx: number) => selectedIndices.has(idx))
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assetName}_selection_${Date.now()}.json`
    a.click()
    toast.success(`Downloaded ${selectedIndices.size} records`)
  }

  if (!assetName) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
        <Database size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest">Select an Asset</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card/30 rounded-2xl border border-border/40 overflow-hidden shadow-inner">
      <ResultsGrid
        data={data}
        isLoading={isLoading}
        noBorder
        noBackground
        manualPagination
        pageCount={data?.total_count ? Math.ceil(data.total_count / pageSize) : -1}
        pagination={{ pageIndex: Math.floor(pageOffset / pageSize), pageSize }}
        onPaginationChange={(updater) => {
          const next =
            typeof updater === 'function'
              ? updater({ pageIndex: Math.floor(pageOffset / pageSize), pageSize })
              : updater
          onOffsetChange(next.pageIndex * next.pageSize)
          setSelectedIndices(new Set())
        }}
        onSelectRows={(indices) => {
          setSelectedIndices(indices)
          // Single selection for inspector
          if (indices.size === 1) {
            const index = Array.from(indices)[0]
            const results = data?.results || (data as any)?.rows
            if (index !== undefined && results?.[index]) {
              onSelectRecord(results[index])
            }
          }
        }}
        tabs={
          selectedIndices.size > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                {selectedIndices.size} selected
              </span>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-black uppercase text-[9px] tracking-widest gap-2 shadow-lg shadow-primary/20"
                onClick={handleDownloadSelected}
              >
                <Download size={12} /> Download Selection
              </Button>
            </div>
          )
        }
      />
    </div>
  )
}
