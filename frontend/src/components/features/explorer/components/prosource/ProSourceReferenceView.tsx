import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Globe, Ruler, Tag, Database, RefreshCw } from 'lucide-react'
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid'
import { Badge } from '@/components/ui/badge'

interface ProSourceReferenceViewProps {
  connectionId: number
}

export const ProSourceReferenceView: React.FC<ProSourceReferenceViewProps> = ({ connectionId }) => {
  const [activeTab, setActiveTab] = useState('crs')

  const { data: crsData, isLoading: isLoadingCRS } = useQuery({
    queryKey: ['prosource', 'refs', 'crs', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_crs', { limit: 100 }),
    enabled: activeTab === 'crs',
  })

  const { data: unitData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['prosource', 'refs', 'units', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_units', { limit: 100 }),
    enabled: activeTab === 'units',
  })

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="px-8 py-6 border-b border-border/10 bg-muted/5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Standards & References</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Global Partition Reference Data
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-muted/20 p-1 rounded-xl">
            <TabsTrigger
              value="crs"
              className="gap-2 text-[10px] font-bold uppercase tracking-widest px-4 h-8 rounded-lg"
            >
              <Globe size={12} /> Coordinate Systems
            </TabsTrigger>
            <TabsTrigger
              value="units"
              className="gap-2 text-[10px] font-bold uppercase tracking-widest px-4 h-8 rounded-lg"
            >
              <Ruler size={12} /> Unit Systems
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="crs" className="h-full m-0 p-6">
            <ResultsGrid data={crsData} isLoading={isLoadingCRS} noBorder />
          </TabsContent>
          <TabsContent value="units" className="h-full m-0 p-6">
            <ResultsGrid data={unitData} isLoading={isLoadingUnits} noBorder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
