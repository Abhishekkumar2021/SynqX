import React, { useState, useEffect } from 'react'
import { ProSourceSidebar } from './ProSourceSidebar'
import { ProSourceDataTable } from './ProSourceDataTable'
import { ProSourceMeshHeader } from './ProSourceMeshHeader'
import { ProSourceAICommandCenter } from './ProSourceAICommandCenter'

interface ProSourceMeshViewProps {
  assets: any[]
  selectedAsset: any
  onSelectAsset: (asset: any) => void
  onSelectEntity: (record: any) => void
  connectionId: number
  customQuery?: string
  onApplyQuery: (sql: string | null) => void
  pageOffset: number
  onOffsetChange: (offset: number) => void
}

export const ProSourceMeshView: React.FC<ProSourceMeshViewProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  onSelectEntity,
  connectionId,
  customQuery,
  onApplyQuery,
  pageOffset,
  onOffsetChange,
}) => {
  const [isAIOpen, setIsAIOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // Auto-select first asset if available and none selected
  useEffect(() => {
    if (assets.length > 0 && !selectedAsset) {
      onSelectAsset(assets[0])
    }
  }, [assets, selectedAsset, onSelectAsset])

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      <ProSourceSidebar
        assets={assets}
        selectedAsset={selectedAsset}
        onSelectAsset={onSelectAsset}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-muted/5 relative">
        <ProSourceMeshHeader
          connectionId={connectionId}
          asset={selectedAsset}
          currentQuery={customQuery}
          onApplyQuery={onApplyQuery}
          onToggleAI={() => setIsAIOpen(true)}
          isLoading={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {selectedAsset ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ProSourceDataTable
              connectionId={connectionId}
              assetName={selectedAsset.name || selectedAsset.NAME}
              customQuery={customQuery}
              onSelectRecord={onSelectEntity}
              pageOffset={pageOffset}
              onOffsetChange={onOffsetChange}
              viewMode={viewMode}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground/40">
            Select an asset to view records
          </div>
        )}

        <ProSourceAICommandCenter
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          onApplyQuery={(sql) => {
            onApplyQuery(sql)
            setIsAIOpen(false)
          }}
        />
      </main>
    </div>
  )
}
