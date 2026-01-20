import React, { useState, useMemo } from 'react'
import {
  ListTree,
  Binary,
  Copy,
  TableProperties,
  FileJson,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { JsonTree } from '@/components/ui/JsonTree'
import { toast } from 'sonner'
import { InspectorEmptyState } from './InspectorEmptyState'

interface InspectorPayloadProps {
  record: any
}

export const InspectorPayload: React.FC<InspectorPayloadProps> = ({ record }) => {
  const [viewMode, setViewMode] = useState<'table' | 'tree' | 'raw'>('tree')

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const flattenedData = useMemo(() => {
    if (!record?.details?.data) return []
    return Object.entries(record.details.data).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
  }, [record])

  const hasData = record?.details?.data && Object.keys(record.details.data).length > 0

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* View Toggle Bar */}
      <div className="px-8 py-2 bg-muted/5 border-b border-border/40 flex items-center justify-end shrink-0">
         <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/40 h-8">
            <Button
              variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-[9px] font-black uppercase tracking-widest h-6 rounded-md px-3"
              onClick={() => setViewMode('tree')}
            >
              <ListTree size={12} className="mr-1.5" /> Tree
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-[9px] font-black uppercase tracking-widest h-6 rounded-md px-3"
              onClick={() => setViewMode('table')}
            >
              <TableProperties size={12} className="mr-1.5" /> Table
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-[9px] font-black uppercase tracking-widest h-6 rounded-md px-3"
              onClick={() => setViewMode('raw')}
            >
              <Binary size={12} className="mr-1.5" /> Raw
            </Button>
          </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {viewMode === 'raw' && (
          <CodeBlock
            code={JSON.stringify(record.details, null, 2)}
            language="json"
            rounded={false}
            maxHeight="100%"
            className="!shadow-none border-0"
          />
        )}
        
        {viewMode === 'table' && (
          <ScrollArea className="h-full">
            {flattenedData.length > 0 ? (
                <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-px bg-border/40 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                    {flattenedData.map((item, idx) => (
                    <div
                        key={idx}
                        className="grid grid-cols-12 bg-background hover:bg-muted/5 transition-colors group"
                    >
                        <div className="col-span-4 p-4 border-r border-border/40 bg-muted/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                            {item.key}
                        </span>
                        </div>
                        <div className="col-span-8 p-4 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-foreground/80 break-all leading-relaxed font-mono">
                            {item.value}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(item.value, item.key)}
                        >
                            <Copy size={12} />
                        </Button>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            ) : (
                <InspectorEmptyState
                    icon={FileJson}
                    title="No Data Attributes"
                    description="This record does not contain any structured data properties."
                />
            )}
          </ScrollArea>
        )}

        {viewMode === 'tree' && (
          <ScrollArea className="h-full">
             {hasData ? (
                <div className="p-8">
                    <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm">
                    <JsonTree data={record.details?.data || {}} defaultOpen={true} />
                    </div>
                </div>
             ) : (
                <InspectorEmptyState
                    icon={FileJson}
                    title="No Data Structure"
                    description="The payload tree is empty for this record."
                />
             )}
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
