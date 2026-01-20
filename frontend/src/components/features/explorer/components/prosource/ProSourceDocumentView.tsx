import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnectionMetadata } from '@/lib/api'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  if (['zip', 'tar', 'gz'].includes(ext || ''))
    return <FileArchive className="text-orange-500" size={20} />
  if (['jpg', 'png', 'svg', 'jpeg'].includes(ext || ''))
    return <Image className="text-pink-500" size={20} />
  if (['json', 'sql', 'xml', 'yaml', 'yml'].includes(ext || ''))
    return <FileCode className="text-blue-500" size={20} />
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || ''))
    return <FileText className="text-rose-500" size={20} />
  return <File className="text-indigo-500" size={20} />
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
        d.DOCUMENT_FORMAT?.toLowerCase().includes(search.toLowerCase()) ||
        d.DOCUMENT_TYPE?.toLowerCase().includes(search.toLowerCase())
    )
  }, [docData, search])

  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20 shadow-inner group">
            <FileText size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              Unstructured Catalog
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-rose-500/10 text-rose-600 border-none text-[9px] font-black uppercase"
              >
                {filteredDocs.length} Objects
              </Badge>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">
              Global Entity Document Index & Knowledge Base
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-80">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-all group-focus-within:text-rose-500" />
            <Input
              placeholder="Search documents by name, format, type..."
              className="h-10 pl-10 rounded-xl bg-background/50 border-border/40 focus:ring-rose-500/10 shadow-sm text-[11px] font-bold placeholder:uppercase placeholder:opacity-30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-muted p-1 rounded-xl border border-border/20 shadow-inner">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 gap-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                viewMode === 'grid'
                  ? 'bg-background shadow-sm text-rose-600 ring-1 ring-border/40'
                  : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} /> Grid
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 gap-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                viewMode === 'list'
                  ? 'bg-background shadow-sm text-rose-600 ring-1 ring-border/40'
                  : 'text-muted-foreground'
              )}
              onClick={() => setViewMode('list')}
            >
              <List size={14} /> List
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-rose-500')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-[1600px] mx-auto w-full pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-6 opacity-40">
              <div className="relative">
                <div className="absolute inset-0 bg-rose-500/20 blur-3xl animate-pulse rounded-full" />
                <RefreshCw className="h-12 w-12 animate-spin text-rose-600 relative z-10" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 animate-pulse">
                Resolving Unstructured Matrix...
              </span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 opacity-20 grayscale">
              <FileText size={80} strokeWidth={1} />
              <p className="mt-6 font-black uppercase text-[10px] tracking-[0.3em]">
                No semantic matches found
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredDocs.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="p-6 rounded-[2rem] bg-card border border-border/40 hover:border-rose-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col gap-5 relative overflow-hidden shadow-sm"
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center group-hover:bg-rose-500/10 transition-colors shadow-inner">
                      {getFileIcon(doc.NAME)}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[8px] font-black h-5 px-2 bg-muted/30 border-none uppercase tracking-widest"
                    >
                      {doc.DOCUMENT_FORMAT || 'FILE'}
                    </Badge>
                  </div>

                  <div className="min-w-0 space-y-1 relative z-10">
                    <h4
                      className="text-[13px] font-black text-foreground uppercase tracking-tight truncate group-hover:text-rose-600 transition-colors"
                      title={doc.NAME}
                    >
                      {doc.NAME}
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate opacity-60">
                        {doc.DOCUMENT_TYPE || 'Unspecified Type'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/20 border border-border/10">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                        Entity Link
                      </span>
                      <span className="text-[9px] font-bold text-foreground/70 truncate">
                        {doc.ENTITY_ID || 'Global'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                        Storage
                      </span>
                      <span className="text-[9px] font-bold text-foreground/70">
                        {formatBytes(doc.FILE_SIZE) || '0 B'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10 relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                        Inserted At
                      </span>
                      <span className="text-[9px] font-mono font-bold text-muted-foreground/60">
                        {doc.INSERT_DATE
                          ? new Date(doc.INSERT_DATE).toLocaleDateString()
                          : 'Legacy'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-transparent hover:border-rose-500/20"
                    >
                      <Download size={16} />
                    </Button>
                  </div>

                  {/* Decorative element */}
                  <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-rose-500/5 blur-3xl rounded-full group-hover:bg-rose-500/10 transition-colors" />
                </div>
              ))}
              n{' '}
            </div>
          ) : (
            <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                <div className="col-span-5">Identity_Reference</div>
                <div className="col-span-2">Object_Format</div>
                <div className="col-span-2 text-center">Entity_Anchor</div>
                <div className="col-span-2 text-center">Payload_Size</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              <div className="divide-y divide-border/10">
                {filteredDocs.map((doc: any, i: number) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-rose-500/[0.02] transition-colors group"
                  >
                    <div className="col-span-5 flex items-center gap-4">
                      <div className="h-9 w-9 rounded-xl bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-rose-500/10 transition-colors shadow-inner">
                        {getFileIcon(doc.NAME)}
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-[13px] font-black truncate text-foreground/80 uppercase group-hover:text-rose-600 transition-colors">
                          {doc.NAME}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                          {doc.DOCUMENT_TYPE}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Badge
                        variant="secondary"
                        className="bg-muted/50 text-foreground/60 border-none text-[8px] font-black uppercase tracking-widest h-5"
                      >
                        {doc.DOCUMENT_FORMAT}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                        {doc.ENTITY_TBL || '---'}
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-[11px] font-mono font-black text-muted-foreground/40 tabular-nums">
                      {formatBytes(doc.FILE_SIZE)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                      >
                        <Download size={16} />
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
