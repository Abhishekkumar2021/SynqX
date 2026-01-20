import React, { useState, useEffect } from 'react'
import { ProSourceSidebar } from './ProSourceSidebar'
import { ProSourceDataTable } from './ProSourceDataTable'

interface ProSourceMeshViewProps {
  assets: any[]
  onSelectEntity: (record: any) => void
  connectionId: number
}

export const ProSourceMeshView: React.FC<ProSourceMeshViewProps> = ({
  assets,
  onSelectEntity,
  connectionId,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<any>(null)

  // Auto-select first asset if available
  useEffect(() => {
    if (assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0])
    }
  }, [assets])

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <ProSourceSidebar
        assets={assets}
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-muted/5 relative">
        {selectedAsset ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-4 px-2">
                    <h2 className="text-xl font-bold text-foreground">{selectedAsset.name}</h2>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{selectedAsset.metadata?.module}</span>
                </div>
                <ProSourceDataTable
                    connectionId={connectionId}
                    assetName={selectedAsset.name}
                    onSelectRecord={onSelectEntity}
                />
            </div>
        ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/40">
                Select an asset to view records
            </div>
        )}
      </main>
    </div>
  )
}
