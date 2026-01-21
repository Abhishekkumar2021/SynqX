import React, { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Database,
  Clock,
  AlertCircle,
  ChevronLeft,
  FileDown,
  Package,
  HardDrive,
  RefreshCw,
  Share2,
  FileCode,
  Globe,
  Copy,
  ChevronRight,
  FileArchive,
  Image,
  FileText,
  File,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatNumber, formatBytes } from '@/lib/utils'
import { getConnectionMetadata } from '@/lib/api/connections'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

// Import shared components
import { OSDUPageHeader } from './shared/OSDUPageHeader'
import { OSDUDiscoveryEmptyState } from './shared/OSDUDiscoveryEmptyState'
import { OSDUPlatformLoader } from './shared/OSDUPlatformLoader'
import { OSDUToolbar } from './shared/OSDUToolbar'

// Import new sub-components
import { StorageGrid } from './storage/StorageGrid'
import { StorageList } from './storage/StorageList'
import { Plus } from 'lucide-react'

interface OSDUFileBrowserProps {
  connectionId: number
}

// Helper for details dialog icon (kept local as it's simple)
const getFileIcon = (name: string = '') => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['zip', 'tar', 'gz', '7z'].includes(ext || ''))
    return <FileArchive className="text-orange-500" />
  if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || ''))
    return <Image className="text-pink-500" />
  if (['json', 'yaml', 'xml', 'csv', 'sql'].includes(ext || ''))
    return <FileCode className="text-blue-500" />
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || ''))
    return <FileText className="text-rose-500" />
  return <File className="text-amber-500" />
}

export const OSDUFileBrowser: React.FC<OSDUFileBrowserProps> = ({ connectionId }) => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // --- URL State Management ---
  const search = searchParams.get('q') || ''
  const activeFileId = searchParams.get('fileId') || null
  const pageOffset = parseInt(searchParams.get('offset') || '0')
  const limit = 50

  const [isUploading, setIsUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null) next.delete(key)
        else next.set(key, val)
      })
      return next
    })
  }

  const setSearch = (q: string) => updateParams({ q: q || null, offset: '0' })
  const setOffset = (o: number) => updateParams({ offset: String(o) })
  const setActiveFileId = (id: string | null) => updateParams({ fileId: id })

  // --- Data Queries ---
  const { data: fileResponse, isLoading } = useQuery({
    queryKey: ['osdu', 'files', connectionId, pageOffset, limit],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'execute_query', {
        kind: '*:*:dataset--File.*:*',
        limit,
        offset: pageOffset,
      }),
  })

  const results = useMemo(() => fileResponse?.results || [], [fileResponse])
  const totalAvailable = useMemo(
    () => fileResponse?.total_count ?? results.length,
    [fileResponse, results]
  )

  const { data: fileDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['osdu', 'file-details', connectionId, activeFileId],
    queryFn: async () => {
      const cleanId = activeFileId!.replace(/:\d{10,}$/, '').replace(/:\d{4,9}$/, '')
      return getConnectionMetadata(connectionId, 'get_record_deep_dive', {
        record_id: cleanId,
      })
    },
    enabled: !!activeFileId,
  })

  // --- Mutations ---
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true)
      const buffer = await file.arrayBuffer()
      const content = new Uint8Array(buffer)
      const fileId = await getConnectionMetadata(connectionId, 'upload_file', {
        content: Array.from(content),
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })
      return fileId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osdu', 'files'] })
      toast.success('File uploaded successfully')
    },
    onSettled: () => setIsUploading(false),
  })

  const downloadFileAction = async (id: string, name: string) => {
    try {
      const data = await getConnectionMetadata(connectionId, 'download_file', { file_id: id })
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = name
      link.click()
      window.URL.revokeObjectURL(link.href)
    } catch {
      toast.error(`Failed to download ${name}`)
    }
  }

  const handleBulkDownload = async () => {
    const toDownload = filteredFiles.filter((f: any) => selectedIds.has(f.id))
    toast.promise(Promise.all(toDownload.map((f: any) => downloadFileAction(f.id, f.name))), {
      loading: `Downloading ${toDownload.length} files...`,
      success: 'Bulk download started',
      error: 'Bulk download failed',
    })
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      toast.promise(uploadMutation.mutateAsync(file), {
        loading: `Uploading ${file.name}...`,
        success: 'Registered in OSDU',
        error: 'Upload failed',
      })
    }
  }

  // --- Selection Logic ---
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length && results.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(results.map((r: any) => r.id)))
  }

  // --- Data Processing ---
  const flattenedFiles = useMemo(() => {
    return results.map((f: any) => ({
      id: f.id,
      kind: f.kind,
      name: f.data?.DatasetProperties?.FileSourceInfo?.Name || f.id.split(':').pop(),
      size: f.data?.DatasetProperties?.FileSourceInfo?.FileSize || '0',
      source: f.data?.DatasetProperties?.FileSourceInfo?.FileSource || 'Cloud Storage',
      createdAt: f.createTime || 'N/A',
      category: f.kind.split(':').slice(-2, -1)[0].split('--')[0] || 'dataset',
      raw: f,
    }))
  }, [results])

  const filteredFiles = useFuzzySearch(flattenedFiles, search, {
    keys: ['name', 'kind'],
    threshold: 0.3,
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const activeFile = useMemo(
    () => flattenedFiles.find((f: { id: string | null }) => f.id === activeFileId),
    [flattenedFiles, activeFileId]
  )

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/2 animate-in fade-in duration-500 relative">
      <OSDUPageHeader
        icon={HardDrive}
        title="Storage Hub"
        subtitle="Universal Dataset Discovery"
        iconColor="text-amber-500"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Find datasets or files..."
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['osdu', 'files'] })}
        isLoading={isLoading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={totalAvailable}
        countLabel="Assets"
        actions={
          <>
            <input
              type="file"
              id="osdu-upload-v16"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <Button
              size="sm"
              onClick={() => document.getElementById('osdu-upload-v16')?.click()}
              disabled={isUploading}
              className="h-11 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-amber-500/20"
            >
              <Plus size={14} strokeWidth={3} />
              {isUploading ? 'Registering...' : 'Upload Asset'}
            </Button>
          </>
        }
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <OSDUToolbar
          totalAvailable={totalAvailable}
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          isAllSelected={results.length > 0 && selectedIds.size === results.length}
          onToggleSelectAll={toggleSelectAll}
          isLoading={isLoading}
          onBulkDownload={handleBulkDownload}
        />

        <div className="flex-1 min-h-0 relative overflow-hidden bg-muted/2">
          {isLoading ? (
            <OSDUPlatformLoader
              message="Resolving storage manifests..."
              iconColor="text-amber-500"
            />
          ) : filteredFiles.length === 0 ? (
            <OSDUDiscoveryEmptyState
              icon={Package}
              title="Registry Idle"
              description="No file records resolved for this technical scope."
            />
          ) : (
            <ScrollArea className="h-full">
              <div
                className={cn(
                  'w-full mx-auto transition-all duration-500',
                  viewMode === 'grid' ? 'p-10 max-w-[1600px]' : 'p-0'
                )}
              >
                {viewMode === 'grid' ? (
                  <StorageGrid
                    files={filteredFiles}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    onSelectFile={setActiveFileId}
                    onDownload={downloadFileAction}
                    onCopyId={(id) => copyToClipboard(id, 'Registry ID')}
                  />
                ) : (
                  <StorageList
                    files={filteredFiles}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    onSelectFile={setActiveFileId}
                    onDownload={downloadFileAction}
                  />
                )}
                {viewMode === 'grid' && <div className="h-24" />}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* NAVIGATION FOOTER */}
        <div className="px-8 py-3 border-t border-border/10 bg-background/40 backdrop-blur-md flex items-center justify-between shrink-0 relative z-20 shadow-inner">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none">
                technical registry frame
              </span>
              <span className="text-sm font-black text-foreground mt-1 tracking-tighter uppercase">
                {formatNumber(pageOffset + 1)} — {formatNumber(pageOffset + results.length)}{' '}
                <span className="opacity-20 mx-2 text-[10px]">TOTAL IN PARTITION</span>{' '}
                {formatNumber(totalAvailable)}
              </span>
            </div>
            <div className="h-8 w-px bg-border/10" />
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">
                Density
              </span>
              <Badge className="bg-amber-500/5 text-amber-600 border-amber-500/20 font-black h-6 text-[9px]">
                {limit} BUFF
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted shadow-sm"
              onClick={() => setOffset(Math.max(0, pageOffset - limit))}
              disabled={pageOffset === 0 || isLoading}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted shadow-sm"
              onClick={() => setOffset(pageOffset + limit)}
              disabled={pageOffset + limit >= totalAvailable || isLoading}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* DETAILS HUB DIALOG */}
      <Dialog open={!!activeFileId} onOpenChange={(open) => !open && setActiveFileId(null)}>
        <DialogContent className="max-w-4xl h-[82vh] p-0 gap-0 border border-border/40 overflow-hidden flex flex-col bg-background/95 backdrop-blur-3xl shadow-[0_40px_120px_rgba(0,0,0,0.5)] rounded-[2.5rem]">
          <div className="h-full flex flex-col min-w-0 overflow-hidden">
            <div className="p-8 px-10 border-b border-border/10 bg-muted/5 flex items-center justify-between shrink-0 min-w-0 relative">
              <div className="flex items-center gap-6 min-w-0 flex-1 pr-12">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-xl shrink-0">
                  {activeFile &&
                    React.cloneElement(getFileIcon(activeFile.name) as any, { size: 32 })}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-3 mb-1.5">
                    <Badge className="bg-amber-500 text-white border-none text-[9px] font-black uppercase px-2 h-4.5 tracking-widest shadow-lg">
                      DATASET_V2
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40 truncate">
                      <span className="truncate">{activeFileId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-40 hover:opacity-100"
                        onClick={() => copyToClipboard(activeFileId || '', 'ID')}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black tracking-tighter truncate text-foreground leading-none uppercase">
                    {activeFile?.name}
                  </h2>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 bg-muted/5">
              <div className="p-10 space-y-10 max-w-4xl mx-auto w-full overflow-hidden">
                <div className="flex items-center gap-3">
                  <Button
                    className="flex-1 rounded-xl h-12 gap-3 font-black uppercase text-[11px] tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-500/20"
                    onClick={() =>
                      activeFileId &&
                      downloadFileAction(activeFileId, activeFile?.name || 'download')
                    }
                  >
                    <FileDown size={18} /> Request Binary Stream
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl border-border/40 hover:bg-muted shadow-sm"
                  >
                    <Share2 size={18} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-[2rem] border border-border/10 bg-background/40 shadow-inner">
                  {[
                    {
                      label: 'KIND',
                      value: activeFile?.category || 'File',
                      icon: Box,
                      color: 'text-orange-500',
                    },
                    {
                      label: 'SIZE',
                      value: activeFile ? formatBytes(parseInt(activeFile.size)) : '0 B',
                      icon: Database,
                      color: 'text-blue-500',
                    },
                    {
                      label: 'SOURCE',
                      value: activeFile?.source || 'Persistent',
                      icon: Globe,
                      color: 'text-rose-500',
                    },
                    {
                      label: 'STAMP',
                      value: activeFile
                        ? new Date(activeFile.createdAt).toLocaleDateString()
                        : 'N/A',
                      icon: Clock,
                      color: 'text-emerald-500',
                    },
                  ].map((stat, i) => (
                    <div key={i} className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1.5">
                        <stat.icon size={10} className={stat.color} /> {stat.label}
                      </span>
                      <p className="text-sm font-black truncate text-foreground/90 tracking-tight uppercase">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 overflow-hidden">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2">
                      <FileCode size={16} /> Registry Manifest
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black border-border/40 bg-muted/20 px-2.5 h-5"
                    >
                      PROTOCOL_JSON
                    </Badge>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/40 overflow-hidden bg-background shadow-lg">
                    {isLoadingDetails ? (
                      <div className="h-48 flex items-center justify-center">
                        <RefreshCw size={24} className="animate-spin text-primary/20" />
                      </div>
                    ) : (
                      <CodeBlock
                        code={JSON.stringify(fileDetails?.record || {}, null, 2)}
                        language="json"
                        maxHeight="350px"
                        rounded={false}
                        className="border-none"
                      />
                    )}
                  </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-6 shadow-xl">
                  <AlertCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">
                      Governance Context
                    </p>
                    <p className="text-sm text-amber-600/70 leading-relaxed font-bold">
                      Governed by{' '}
                      <strong>{fileDetails?.record?.legal?.legaltags?.[0] || 'DEFAULT'}</strong>{' '}
                      context. Data sovereignty residency rules apply.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-5 px-10 border-t border-border/10 bg-muted/5 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 leading-none">
                OSDU Technical Storage Hub v2.5.3
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-black uppercase border-border/40 opacity-40 px-3 h-6"
              >
                Verified_Admin
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
