import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'
import { Loader2, Database } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'

interface ProSourceDataTableProps {
  connectionId: number
  assetName: string
  onSelectRecord: (record: any) => void
}

export const ProSourceDataTable: React.FC<ProSourceDataTableProps> = ({
  connectionId,
  assetName,
  onSelectRecord,
}) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Fetch Data with Pagination
  const { data, isLoading } = useQuery({
    queryKey: ['prosource', 'data', connectionId, assetName, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      // Calculate offset based on page index
      const offset = pagination.pageIndex * pagination.pageSize
      
      // 1. Fetch Data
      const result = await getConnectionMetadata(connectionId, 'execute_query', {
        query: `SELECT * FROM ${assetName}`,
        limit: pagination.pageSize,
        offset: offset,
      })

      // 2. Fetch Total Count (Only once or if needed? ProSource can be slow)
      // We can use the separate count query or rely on estimation.
      // Let's assume we fetch total count separately for better UX
      const countRes = await getConnectionMetadata(connectionId, 'execute_query', {
        query: `SELECT COUNT(*) as CNT FROM ${assetName}`,
      })
      const total = countRes?.results?.[0]?.CNT || countRes?.results?.[0]?.cnt || 0

      return {
        ...result,
        total_count: total
      }
    },
    enabled: !!assetName,
    keepPreviousData: true,
  })

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
        pageCount={data?.total_count ? Math.ceil(data.total_count / pagination.pageSize) : -1}
        pagination={pagination}
        onPaginationChange={setPagination}
        onSelectRows={(indices) => {
            const index = Array.from(indices)[0]
            if (index !== undefined && data?.results?.[index]) {
                onSelectRecord(data.results[index])
            }
        }}
      />
    </div>
  )
}
