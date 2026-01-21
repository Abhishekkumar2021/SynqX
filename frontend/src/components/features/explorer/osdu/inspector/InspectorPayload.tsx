import React, { useState, useMemo } from 'react'
import {
  ListTree,
  Binary,
  Copy,
  TableProperties,
  FileJson,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { JsonTree } from '@/components/ui/JsonTree'
import { toast } from 'sonner'
import { OSDUDiscoveryEmptyState } from '../shared/OSDUDiscoveryEmptyState'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/hooks/useTheme'

interface InspectorPayloadProps {
  record: any
  onUpdate?: (data: any) => void
  isUpdating?: boolean
}

export const InspectorPayload: React.FC<InspectorPayloadProps> = ({
  record,
  onUpdate,
  isUpdating,
}) => {
  const { theme } = useTheme()
  const [viewMode, setViewMode] = useState<'table' | 'tree' | 'raw' | 'edit'>('tree')
  const [editedData, setEditedData] = useState<string>('')

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

  const handleStartEdit = () => {
    setEditedData(JSON.stringify(record.details?.data || {}, null, 2))
    setViewMode('edit')
  }

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedData)
      onUpdate?.(parsed)
      // Success will be handled by mutation state, but we can optimistically exit edit mode
      // if we want, or wait for isUpdating to finish.
    } catch (e) {
      toast.error('Invalid JSON', { description: 'Please correct the syntax before saving.' })
    }
  }

  // Effect to exit edit mode on successful update
  React.useEffect(() => {
    if (!isUpdating && viewMode === 'edit') {
      // If we were editing and updating finished, we should probably check if it was successful
      // For now, let's just stay in edit mode unless the user cancels or it's done.
    }
  }, [isUpdating])

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* View Toggle Bar */}
      <div className="px-6 py-1.5 bg-muted/5 border-b border-border/40 flex items-center justify-between shrink-0 h-10 transition-all">
        <div className="flex items-center gap-2">
          {viewMode === 'edit' ? (
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-6.5 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest gap-1.5"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                Commit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6.5 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest gap-1.5"
                onClick={() => setViewMode('tree')}
                disabled={isUpdating}
              >
                <X size={10} /> Abort
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-6.5 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest gap-1.5 border-primary/20 hover:bg-primary/5 text-primary shadow-sm"
              onClick={handleStartEdit}
            >
              <Pencil size={10} /> Edit JSON
            </Button>
          )}
        </div>

        <div className="flex items-center gap-0.5 bg-muted/20 p-0.5 rounded-lg border border-border/20 h-7">
          <Button
            variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-[8px] font-black uppercase tracking-widest h-6 rounded-md px-2.5"
            onClick={() => setViewMode('tree')}
            disabled={viewMode === 'edit'}
          >
            <ListTree size={11} className="mr-1" /> Tree
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-[8px] font-black uppercase tracking-widest h-6 rounded-md px-2.5"
            onClick={() => setViewMode('table')}
            disabled={viewMode === 'edit'}
          >
            <TableProperties size={11} className="mr-1" /> Grid
          </Button>
          <Button
            variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-[8px] font-black uppercase tracking-widest h-6 rounded-md px-2.5"
            onClick={() => setViewMode('raw')}
            disabled={viewMode === 'edit'}
          >
            <Binary size={11} className="mr-1" /> Raw
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {viewMode === 'edit' && (
          <div className="absolute inset-0">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={editedData}
              onChange={(val) => setEditedData(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderWhitespace: 'none',
                padding: { top: 15, left: 15 },
              }}
            />
          </div>
        )}

        {viewMode === 'raw' && (
          <div className="absolute inset-0">
            <CodeBlock
              code={JSON.stringify(record.details, null, 2)}
              language="json"
              rounded={false}
              maxHeight="100%"
              className="!shadow-none border-0 h-full text-[11px]"
            />
          </div>
        )}

        {viewMode === 'table' && (
          <ScrollArea className="h-full">
            {flattenedData.length > 0 ? (
              <div className="w-full">
                <div className="grid grid-cols-1 gap-px bg-border/20 border-b border-border/20">
                  {flattenedData.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 bg-background hover:bg-muted/5 transition-colors group"
                    >
                      <div className="col-span-4 p-3 px-6 border-r border-border/20 bg-muted/2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                          {item.key}
                        </span>
                      </div>
                      <div className="col-span-8 p-3 px-6 flex items-center justify-between gap-4">
                        <span className="text-[12px] font-medium text-foreground/70 break-all leading-relaxed font-mono">
                          {item.value}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => copyToClipboard(item.value, item.key)}
                        >
                          <Copy size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/2 relative min-h-[400px]">
                <OSDUDiscoveryEmptyState
                  icon={FileJson}
                  title="No Data Attributes"
                  description="This record does not contain any structured data properties in the OSDU technical manifest."
                />
              </div>
            )}
          </ScrollArea>
        )}

        {viewMode === 'tree' && (
          <ScrollArea className="h-full">
            {hasData ? (
              <div className="p-8">
                <div className="p-0 bg-transparent">
                  <JsonTree data={record.details?.data || {}} defaultOpen={true} />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/2 relative min-h-[400px]">
                <OSDUDiscoveryEmptyState
                  icon={FileJson}
                  title="No Data Structure"
                  description="The payload tree is empty for this record in the current technical frame."
                />
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
