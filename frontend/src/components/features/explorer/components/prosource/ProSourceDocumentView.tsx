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
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatBytes } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
        (d.NAME || d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.DOCUMENT_FORMAT || d.document_format || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.DOCUMENT_TYPE || d.document_type || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [docData, search])

  const handleDownload = (items: any[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prosource_docs_export_${Date.now()}.json`
    a.click()
    toast.success(`${items.length} documents exported`)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDocs.map((d: any) => d.DOCUMENT_ID || d.document_id || d.NAME)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="h-full flex flex-col bg-muted/5 relative overflow-hidden">
      <div className="px-8 py-6 border-b border-border/10 bg-card backdrop-blur-md flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20 shadow-inner group">
            <FileText size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              Knowledge Catalog
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
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-1.5 shadow-lg shadow-rose-500/5"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                  {selectedIds.size} Selected
                </span>
                <div className="h-4 w-px bg-rose-500/20 mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 rounded-lg gap-2 font-black uppercase text-[9px] tracking-widest text-rose-600 hover:bg-rose-500/10"
                  onClick={() =>
                    handleDownload(
                      filteredDocs.filter((d: any) =>
                        selectedIds.has(d.DOCUMENT_ID || d.document_id || d.NAME)
                      )
                    )
                  }
                >
                  <Download size={14} /> Bulk_Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-500/10 p-0 flex items-center justify-center"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group w-80">
            <Search className="z-20 absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-all group-focus-within:text-rose-500" />
            <Input
              placeholder="Search documents..."
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
            className="h-10 w-10 rounded-xl hover:bg-muted active:scale-95 transition-all shadow-sm bg-background border-border/40"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-rose-500')} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="w-full pb-32">
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
            <div className="flex flex-col items-center justify-center py-48 opacity-20 grayscale gap-6">
              <FileText size={80} strokeWidth={1} />
              <p className="mt-6 font-black uppercase text-[10px] tracking-[0.3em]">
                No semantic matches found
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 max-w-[1800px] mx-auto">
              {filteredDocs.map((doc: any, i: number) => {
                const id = doc.DOCUMENT_ID || doc.document_id || doc.NAME
                const isSelected = selectedIds.has(id)
                return (
                  <div
                    key={i}
                    onClick={() => toggleSelect(id)}
                    className={cn(
                      'p-6 rounded-[2rem] bg-card border transition-all duration-500 group flex flex-col gap-5 relative overflow-hidden shadow-sm cursor-pointer hover:shadow-2xl hover:-translate-y-1',
                      isSelected
                        ? 'border-rose-500/40 bg-rose-500/[0.02] shadow-xl shadow-rose-500/5'
                        : 'border-border/40 hover:border-rose-500/20'
                    )}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner',
                          isSelected
                            ? 'bg-rose-500/20 text-rose-600 scale-110'
                            : 'bg-muted/20 text-muted-foreground group-hover:bg-rose-500/10 group-hover:text-rose-600'
                        )}
                      >
                        {getFileIcon(doc.NAME)}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[8px] font-black h-5 px-2 uppercase tracking-widest border-none transition-colors',
                            isSelected ? 'bg-rose-500 text-white' : 'bg-muted/30 text-muted-foreground/60'
                          )}
                        >
                          {doc.DOCUMENT_FORMAT || 'FILE'}
                        </Badge>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'h-5 w-5 rounded-lg border-2 transition-all',
                            isSelected
                              ? 'bg-rose-500 border-rose-500'
                              : 'border-border/40 group-hover:border-rose-500/40'
                          )}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1.5 relative z-10 flex-1">
                      <h4
                        className={cn(
                          'text-[13px] font-black uppercase tracking-tight truncate transition-colors',
                          isSelected ? 'text-rose-600' : 'text-foreground group-hover:text-rose-600'
                        )}
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

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/20 border border-border/10 relative z-10">
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                          Anchor
                        </span>
                        <span className="text-[9px] font-bold text-foreground/70 truncate">
                          {doc.ENTITY_ID || 'Global'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-right">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                          Payload
                        </span>
                        <span className="text-[9px] font-bold text-foreground/70">
                          {formatBytes(doc.FILE_SIZE) || '0 B'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/10 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/40">
                          Registered
                        </span>
                        <span className="text-[9px] font-mono font-bold text-muted-foreground/60">
                          {doc.INSERT_DATE ? new Date(doc.INSERT_DATE).toLocaleDateString() : 'Legacy'}
                        </span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload([doc])
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-90 border border-transparent hover:border-rose-500/20 shadow-sm"
                      >
                        <Download size={16} />
                      </Button>
                    </div>

                    {/* Decorative element */}
                    <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-rose-500/[0.03] blur-3xl rounded-full group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="w-full">
              <div className="grid grid-cols-12 gap-4 px-10 py-4 border-b bg-muted/50 backdrop-blur-xl sticky top-0 z-20 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shadow-sm">
                <div className="col-span-5 flex items-center gap-4">
                  <Checkbox
                    checked={filteredDocs.length > 0 && selectedIds.size === filteredDocs.length}
                    onCheckedChange={toggleSelectAll}
                    className="h-4.5 w-4.5 rounded-md"
                  />
                  Identity_Reference
                </div>
                <div className="col-span-2 px-4">Object_Format</div>
                <div className="col-span-2 text-center">Entity_Anchor</div>
                <div className="col-span-2 text-center">Payload_Size</div>
                <div className="col-span-1 text-right px-4">Action</div>
              </div>
              <div className="divide-y divide-border/5 bg-background/30">
                {filteredDocs.map((doc: any, i: number) => {
                  const id = doc.DOCUMENT_ID || doc.document_id || doc.NAME
                  const isSelected = selectedIds.has(id)
                  return (
                    <div
                      key={i}
                      onClick={() => toggleSelect(id)}
                      className={cn(
                        'grid grid-cols-12 gap-4 px-10 py-5 items-center transition-colors group cursor-pointer border-b border-border/5 hover:bg-rose-500/[0.02]',
                        isSelected && 'bg-rose-500/[0.03]'
                      )}
                    >
                      <div className="col-span-5 flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4.5 w-4.5 rounded-md border-border/40"
                        />
                        <div
                          className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner',
                            isSelected ? 'bg-rose-500/20 text-rose-600' : 'bg-muted/20 text-muted-foreground group-hover:bg-rose-500/10 group-hover:text-rose-600'
                          )}
                        >
                          {getFileIcon(doc.NAME)}
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span
                            className={cn(
                              'text-[13px] font-black truncate uppercase transition-colors',
                              isSelected ? 'text-rose-600' : 'text-foreground/80 group-hover:text-rose-600'
                            )}
                          >
                            {doc.NAME}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                            {doc.DOCUMENT_TYPE}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 px-4">
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
                      <div className="col-span-1 flex justify-end px-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload([doc])
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                        >
                          <Download size={16} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}