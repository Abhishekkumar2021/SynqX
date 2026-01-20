import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  Search,
  LayoutGrid,
  List,
  FileArchive,
  Image,
  FileCode,
  File,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatBytes } from '@/lib/utils'

interface ProSourceDocumentViewProps {
  connectionId: number
}

const getFileIcon = (name: string = '') => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['zip', 'tar', 'gz'].includes(ext || '')) return <FileArchive className="text-orange-500" />
  if (['jpg', 'png', 'svg'].includes(ext || '')) return <Image className="text-pink-500" />
  if (['json', 'sql', 'xml'].includes(ext || '')) return <FileCode className="text-blue-500" />
  if (['pdf', 'doc', 'docx'].includes(ext || '')) return <FileText className="text-rose-500" />
  return <File className="text-primary" />
}

export const ProSourceDocumentView: React.FC<ProSourceDocumentViewProps> = ({ connectionId }) => {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const {
    data: docData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['prosource', 'global-docs', connectionId],
    queryFn: () => getConnectionMetadata(connectionId, 'list_all_documents', { limit: 200 }),
  })

  const filteredDocs = useMemo(() => {
    const docs = docData?.results || docData || []
    return docs.filter(
      (d: any) =>
        d.NAME?.toLowerCase().includes(search.toLowerCase()) ||
        d.DOCUMENT_FORMAT?.toLowerCase().includes(search.toLowerCase())
    )
  }, [docData, search])

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20 shadow-inner">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Unstructured Catalog</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
              Global Entity Document Index
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-80">
            <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-rose-500" />
            <Input
              placeholder="Search documents..."
              className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-rose-500/10 shadow-sm text-xs font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-muted rounded-xl p-1 border border-border/20">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                viewMode === 'grid' && 'bg-background shadow-sm text-rose-600'
              )}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                viewMode === 'list' && 'bg-background shadow-sm text-rose-600'
              )}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-7xl mx-auto w-full pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-4 opacity-40">
              <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Resolving Unstructured Stream...
              </span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 opacity-20">
              <FileText size={64} />
              <p className="mt-4 font-bold uppercase text-xs tracking-widest">No documents found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocs.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="p-5 rounded-3xl bg-card border border-border/40 hover:border-rose-500/30 hover:shadow-xl transition-all group flex flex-col gap-4 relative overflow-hidden shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                      {getFileIcon(doc.NAME)}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[8px] font-black h-4 px-1.5 bg-muted/30 uppercase"
                    >
                      {doc.DOCUMENT_FORMAT || 'FILE'}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate" title={doc.NAME}>
                      {doc.NAME}
                    </h4>
                    <p className="text-[9px] font-medium text-muted-foreground uppercase mt-1 tracking-wider">
                      {doc.DOCUMENT_TYPE}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/10">
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {formatBytes(doc.FILE_SIZE) || 'N/A'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Format</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y divide-border/10">
                {filteredDocs.map((doc: any, i: number) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/5 transition-colors"
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <div className="shrink-0 opacity-70">{getFileIcon(doc.NAME)}</div>
                      <span className="text-xs font-bold truncate text-foreground/80">
                        {doc.NAME}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="secondary" className="text-[8px] font-black">
                        {doc.DOCUMENT_FORMAT}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-[10px] font-mono text-muted-foreground">
                      {formatBytes(doc.FILE_SIZE)}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:text-rose-600"
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
