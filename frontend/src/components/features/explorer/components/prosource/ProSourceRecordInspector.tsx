import React, { useState } from 'react'
import { FileJson, FileText, Database, Shield, X, Download, Copy, ExternalLink, Activity, Info } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { Separator } from '@/components/ui/separator'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProSourceRecordInspectorProps {
  connectionId: number
  record: any
  onClose: () => void
}

export const ProSourceRecordInspector: React.FC<ProSourceRecordInspectorProps> = ({
  connectionId,
  record,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('data')

  // Fetch documents for this specific record
  const { data: documentData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['prosource', 'record-documents', connectionId, record],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'list_documents', {
        entity_ids: [record.ID || record.id || record.uwi || record.well_id],
      }),
    enabled: !!record,
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Derive key properties for header
  const recordId = record.ID || record.id || record.UWI || record.uwi || 'Unknown'
  const recordName = record.NAME || record.name || record.well_name || record.WELL_NAME || 'Unnamed Record'
  const recordType = record.TYPE || record.type || 'Entity'

  // Filter out large/complex objects for the "Properties" quick view
  const simpleProperties = Object.entries(record).filter(([_, v]) => 
    typeof v !== 'object' && v !== null && String(v).length < 50
  )

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full md:w-[600px] xl:w-[800px] z-50 bg-background/95 backdrop-blur-3xl border-l border-border/40 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col border-b border-border/40 bg-muted/10">
        <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-5 overflow-hidden">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
                <Database size={24} />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5 h-6 px-2">
                    {recordType}
                </Badge>
                <div 
                    className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md cursor-pointer hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => copyToClipboard(String(recordId))}
                    title="Copy ID"
                >
                    <span className="truncate max-w-[200px]">{recordId}</span>
                    <Copy size={10} className="opacity-60" />
                </div>
                </div>
                <h2 className="text-xl font-black text-foreground truncate uppercase tracking-tight leading-none">
                {recordName}
                </h2>
            </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-muted h-10 w-10">
            <X size={20} />
            </Button>
        </div>
        
        {/* Quick Stats / Context Bar */}
        <div className="px-6 pb-4 flex items-center gap-6 overflow-x-auto no-scrollbar text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                <span>Active Status</span>
            </div>
            <div className="w-px h-3 bg-border/40" />
            <div className="flex items-center gap-2">
                <Info size={14} />
                <span>{Object.keys(record).length} Fields</span>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-2 border-b border-border/40 bg-muted/5">
          <TabsList className="bg-muted/30 p-1 h-10 rounded-xl w-full justify-start">
            <TabsTrigger value="data" className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <FileJson size={14} /> Data Payload
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <FileText size={14} /> Documents
              {documentData?.documents?.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 bg-primary text-primary-foreground text-[9px] rounded-sm">{documentData.documents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lineage" className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <Shield size={14} /> Lineage
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden bg-muted/5 relative">
          <TabsContent value="data" className="h-full m-0 p-0 absolute inset-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* Properties Grid */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Key Properties</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {simpleProperties.slice(0, 12).map(([key, value]) => (
                            <div key={key} className="p-3 rounded-xl bg-background border border-border/40 flex flex-col gap-1 hover:border-primary/20 transition-colors">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate">{key}</span>
                                <span className="text-xs font-semibold text-foreground truncate" title={String(value)}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator className="bg-border/40" />

                {/* Full JSON */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Raw JSON</h4>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[9px] font-bold uppercase tracking-widest gap-2"
                            onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                        >
                            <Copy size={12} /> Copy
                        </Button>
                    </div>
                    <CodeBlock
                    code={JSON.stringify(record, null, 2)}
                    language="json"
                    className="bg-card border-border/40 shadow-sm text-xs"
                    rounded
                    />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-0 absolute inset-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {isLoadingDocs ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-50">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <div className="relative bg-background p-3 rounded-xl border border-border/40 shadow-lg">
                            <FileText size={32} className="text-primary animate-pulse" />
                        </div>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Scanning Files...</span>
                  </div>
                ) : !documentData?.documents || documentData.documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 mx-4">
                    <FileText size={48} className="mb-4 opacity-30" />
                    <p className="text-sm font-bold text-foreground/60">No Documents Linked</p>
                    <p className="text-[10px] font-medium mt-1 uppercase tracking-wide">No files found for this record ID</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {documentData.documents.map((doc: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                      >
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-500/20">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-bold text-foreground truncate" title={doc.name}>
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[9px] h-5 px-1.5 font-bold">{doc.document_format}</Badge>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                {new Date(doc.update_date).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground opacity-50">•</span>
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                {doc.document_type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary">
                                <Download size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted">
                                <ExternalLink size={16} />
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="lineage" className="h-full m-0 p-0 absolute inset-0 flex items-center justify-center">
             <div className="text-center p-12 opacity-60 max-w-sm mx-auto">
                <div className="p-6 bg-muted/20 rounded-full inline-flex mb-6 border border-border/40">
                    <Shield size={40} className="text-muted-foreground/50" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">Lineage Graph Unavailable</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Relationship mapping is currently disabled for this connection type. Enable semantic indexing to visualize data lineage.
                </p>
             </div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
