import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionAssets } from '@/lib/api/connections'
import { ProSourceMeshView } from './ProSourceMeshView'
import { ProSourceRecordInspector } from './ProSourceRecordInspector'
import { Loader2 } from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'

interface ProSourceExplorerProps {
  connectionId: number
}

export const ProSourceExplorer: React.FC<ProSourceExplorerProps> = ({ connectionId }) => {
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const { data: assets, isLoading } = useQuery({
    queryKey: ['prosource', 'assets', connectionId],
    queryFn: () => getConnectionAssets(connectionId),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Scanning Seabed Metadata...
        </p>
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden">
      <ProSourceMeshView
        assets={assets || []}
        onSelectEntity={(entity) => setSelectedRecord(entity)}
      />

      <AnimatePresence>
        {selectedRecord && (
          <ProSourceRecordInspector
            connectionId={connectionId}
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}