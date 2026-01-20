import React from 'react'
import { MeshItem } from './MeshItem'

interface MeshGridProps {
  isLoading: boolean
  results: any[]
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  onSelectRecord: (id: string) => void
  onToggleAI: () => void
}

export const MeshGrid: React.FC<MeshGridProps> = ({
  results,
  selectedIds,
  onToggleSelection,
  onSelectRecord,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
    {results.map((r, idx) => (
        <MeshItem
        key={r.id || `result-${idx}`}
        record={r}
        isSelected={selectedIds.has(r.id)}
        onToggleSelection={onToggleSelection}
        onSelectRecord={onSelectRecord}
        />
    ))}
    </div>
  )
}
