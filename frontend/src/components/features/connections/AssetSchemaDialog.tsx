import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileJson, RefreshCw, Terminal, History } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { getAssetSchemaVersions, type Asset } from '@/lib/api'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'

interface AssetSchemaDialogProps {
  asset: Asset
  connectionId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AssetSchemaDialog: React.FC<AssetSchemaDialogProps> = ({
  asset,
  connectionId,
  open,
  onOpenChange,
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)

  // Fetch Schema Versions
  const { data: schemaVersions, isLoading: loadingSchema } = useQuery({
    queryKey: ['schema', asset.id],
    queryFn: () => getAssetSchemaVersions(connectionId, asset.id),
    enabled: open,
  })

  // Default to latest version when loaded
  useEffect(() => {
    if (schemaVersions && schemaVersions.length > 0 && !selectedVersionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedVersionId(schemaVersions[0].id)
    }
  }, [schemaVersions, selectedVersionId])

  const selectedSchema = schemaVersions?.find((v) => v.id === selectedVersionId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[75vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-[1.5rem] border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl">
        <div className="flex h-full">
          {/* Sidebar: History List */}
          <div className="w-72 bg-muted/20 border-r border-border/50 flex flex-col shrink-0">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center h-[73px]">
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-3">
                <History className="h-4 w-4" /> Version History
              </h4>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col p-3 gap-2 pb-8">
                {loadingSchema
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))
                  : schemaVersions?.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionId(v.id)}
                        className={cn(
                          'text-left px-4 py-3 rounded-xl text-xs transition-all flex flex-col gap-1 border',
                          selectedVersionId === v.id
                            ? 'bg-background border-primary/20 text-foreground shadow-sm ring-1 ring-primary/10'
                            : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span
                            className={cn(
                              'font-bold text-sm',
                              selectedVersionId === v.id ? 'text-primary' : ''
                            )}
                          >
                            v{v.version}
                          </span>
                          <span className="text-[10px] opacity-70 font-mono">
                            {format(new Date(v.discovered_at), 'MMM dd')}
                          </span>
                        </div>
                        <span className="truncate opacity-70 text-[10px] flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5" /> Auto-detected change
                        </span>
                      </button>
                    ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main: JSON Viewer */}
          <div className="flex-1 flex flex-col min-w-0 bg-card">
            <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-foreground">
                    {asset.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    Schema Definition
                    {selectedSchema && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>
                          Discovered {formatDistanceToNow(new Date(selectedSchema.discovered_at))}{' '}
                          ago
                        </span>
                      </>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 relative">
              {selectedSchema ? (
                <CodeBlock
                  code={JSON.stringify(selectedSchema.json_schema, null, 2)}
                  language="json"
                  maxHeight="100%"
                  className="border-0 rounded-none h-full"
                  rounded={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Terminal className="h-8 w-8 opacity-20" />
                  </div>
                  <span>Select a version to view schema</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
