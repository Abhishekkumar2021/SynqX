import React, { useState, useMemo } from 'react'
import {
  Globe,
  Shield,
  ArrowLeft,
  Loader2,
  Lock,
  Scale,
  Tag,
  Database,
  Download,
  LayoutGrid,
  ChevronRight,
  Eye,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Copy,
  Check,
  Workflow,
  GitBranch,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useQuery } from '@tanstack/react-query'
import { executeQuery } from '@/lib/api/ephemeral'
import { getConnectionMetadata, getAssetDetails } from '@/lib/api/connections'
import { toast } from 'sonner'
import { type DomainConfig } from '@/lib/domain-definitions'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { DomainEntityGraph } from './DomainEntityGraph'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DomainEntityDetailsProps {
  item: any
  config: DomainConfig
  connectionId: number
  onClose: () => void
  onNavigate?: (kindName: string) => void
  initialTab?: string
  isNested?: boolean
  navigationStack?: any[]
}

export const DomainEntityDetails: React.FC<DomainEntityDetailsProps> = ({
  item,
  config,
  connectionId,
  onClose,
  onNavigate,
  initialTab = 'overview',
  isNested = false,
  navigationStack = [],
}) => {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isProSource = config.connectorType === 'prosource'

  // Fetch live details for ProSource (CRS, Units, Exact Count)
  const { data: liveDetails } = useQuery({
    queryKey: ['prosource', 'asset-details', connectionId, item.name],
    queryFn: () => getAssetDetails(connectionId, item.name),
    enabled: isProSource,
  })

  const normalizedItem = useMemo(() => {
    // Managed Asset from Synqx DB
    if (item.asset_type && item.schema_metadata) {
      const osduKind = item.schema_metadata.osdu_kind || item.fully_qualified_name || item.name
      const parts = osduKind?.split(':') || []

      // OSDU standard: authority:source:entity_type:version
      const authority = parts[0] || 'N/A'
      const source = parts[1] || 'N/A'
      const entityTypeFull = parts[2] || ''
      const semanticGroup = entityTypeFull.includes('--')
        ? entityTypeFull.split('--')[0]
        : item.schema_metadata.group || 'N/A'

      return {
        ...item,
        // Map DB field to the 'rows' attribute used by DOMAIN_CONFIGS stats
        rows: liveDetails?.rows ?? item.row_count_estimate,
        // Ensure 'schema' (partition) is available
        schema: item.schema || authority,
        // Map back to 'metadata' format
        metadata: {
          ...item.schema_metadata,
          authority: item.schema_metadata.authority || authority,
          source: item.schema_metadata.source || source,
          group: item.schema_metadata.group || semanticGroup,
        },
        name: osduKind,
      }
    }
    // For Discovery items, merge live details if available
    if (isProSource && liveDetails) {
      return {
        ...item,
        rows: liveDetails.rows ?? item.rows,
        metadata: {
          ...item.metadata,
          ...liveDetails,
        },
      }
    }
    return item
  }, [item, liveDetails, isProSource])

  // Clean up for technical descriptor (remove internal DB fields)
  const displayJson = useMemo(() => {
    const {
      id: _id,
      connection_id: _cid,
      workspace_id: _wid,
      created_at: _ca,
      updated_at: _ua,
      deleted_at: _da,
      created_by: _cb,
      updated_by: _ub,
      deleted_by: _db,
      metadata: _m,
      rows: _r,
      schema: _s,
      ...clean
    } = normalizedItem
    return clean
  }, [normalizedItem])

  const isOSDU = config.connectorType === 'osdu'
  const entityName = config.card.getTitle(normalizedItem)
  const entitySubtitle = config.card.getSubtitle(normalizedItem)

  // --- OSDU Specific Logic ---
  const recordQuery = useQuery({
    queryKey: ['domain', 'record-sample', connectionId, normalizedItem.name],
    queryFn: () =>
      executeQuery(connectionId, {
        query: '*:*',
        limit: 1,
        params: { kind: normalizedItem.name },
      }),
    enabled: isOSDU && (!normalizedItem.metadata?.acl || !normalizedItem.metadata?.legal),
  })

  const fullMetadata = useMemo(() => {
    if (!isOSDU) return normalizedItem.metadata || {}
    const base = normalizedItem.metadata || {}
    const sample_rows = recordQuery.data?.result_sample?.rows
    if (sample_rows && sample_rows.length > 0) {
      const record = sample_rows[0]
      return {
        ...base,
        acl: record.acl || base.acl,
        legal: record.legal || base.legal,
        tags: record.tags || base.tags,
      }
    }
    return base
  }, [normalizedItem.metadata, recordQuery.data, isOSDU])

  const [relFilter, setRelFilter] = useState<'core' | 'all'>('core')

  const schemaQuery = useQuery({
    queryKey: ['domain', 'schema', connectionId, normalizedItem.name],
    queryFn: () =>
      getConnectionMetadata(
        connectionId,
        'get_schema',
        isOSDU
          ? { kind: normalizedItem.name }
          : { table: normalizedItem.name, schema: normalizedItem.schema }
      ),
    enabled: activeTab === 'schema',
  })

  const relationshipQuery = useQuery({
    queryKey: ['domain', 'relationships', connectionId, normalizedItem.name],
    queryFn: () =>
      getConnectionMetadata(connectionId, 'get_relationships', { kind: normalizedItem.name }),
    enabled: isOSDU && activeTab === 'relationships',
  })

  const schemaProperties = useMemo(() => {
    if (!schemaQuery.data) return []
    const data = schemaQuery.data

    if (isOSDU) {
      // Flatten technical fields for display
      const getFlat = (s: any): Record<string, any> => {
        let p = s.metadata?.properties || s.properties || {}
        if (p.data?.properties) p = { ...p, ...p.data.properties }
        if (s.allOf)
          s.allOf.forEach((sub: any) => {
            p = { ...p, ...getFlat(sub) }
          })
        return p
      }
      const flat = getFlat(data)
      if (flat.data) delete flat.data
      return Object.entries(flat)
    }

    const cols = data.columns || {}
    return Object.entries(cols)
  }, [schemaQuery.data, isOSDU])

  const allRelationships = useMemo(() => {
    return relationshipQuery.data || []
  }, [relationshipQuery.data])

  const filteredRelationships = useMemo(() => {
    if (relFilter === 'all') return allRelationships
    return allRelationships.filter((r: any) => r.category !== 'Technical')
  }, [allRelationships, relFilter])

  const metadataItems = useMemo(() => {
    const allMeta: { key: string; value: any }[] = []
    const excludeKeys = new Set([
      'Records',
      'Partition',
      'Authority',
      'Source',
      'Semantic Group',
      'Module',
      'Schema',
      'group',
      'authority',
      'source',
    ])

    config.card.stats.forEach((s) => {
      const value = s.getValue(normalizedItem)
      if (value !== undefined && value !== null && !excludeKeys.has(s.label)) {
        allMeta.push({ key: s.label, value })
      }
    })
    config.filters.forEach((f) => {
      const value = f.getValue(normalizedItem)
      if (value && !excludeKeys.has(f.label)) {
        allMeta.push({ key: f.label, value })
      }
    })
    return allMeta
  }, [normalizedItem, config])

  const downloadSchema = () => {
    if (!schemaQuery.data) return
    let actualSchema = schemaQuery.data
    if (isOSDU && schemaQuery.data.metadata) {
      actualSchema = schemaQuery.data.metadata
    }
    const blob = new Blob([JSON.stringify(actualSchema, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${normalizedItem.name.replace(/:/g, '_')}_schema.json`
    a.click()
    toast.success('Schema Exported')
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const parseOSDUGroup = (groupStr: string) => {
    if (!groupStr || !groupStr.includes('@'))
      return { group: groupStr, domain: '', prefix: '', role: '', core: groupStr }
    const [fullGroup, domain] = groupStr.split('@')
    const parts = fullGroup.split('.')
    if (parts.length < 2) return { group: fullGroup, domain, prefix: '', role: '', core: fullGroup }

    const prefix = parts[0]
    const role = parts[parts.length - 1]
    const core = parts.slice(1, -1).join('.')

    return { group: fullGroup, domain, prefix, role, core }
  }

  const renderOSDUGroupCard = (v: string, type: 'viewer' | 'owner') => {
    const { prefix, core, role, domain } = parseOSDUGroup(v)
    const isCopied = copiedId === v

    return (
      <div
        key={v}
        className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/40 shadow-xs group/item transition-all hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm active:scale-[0.99] group"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={cn(
              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
              type === 'viewer'
                ? 'bg-amber-500/5 text-amber-600 group-hover/item:bg-amber-500/10'
                : 'bg-rose-500/5 text-rose-600 group-hover/item:bg-rose-500/10'
            )}
          >
            {type === 'viewer' ? <Eye size={16} /> : <Shield size={16} />}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-tighter">
                {prefix}.
              </span>
              <span className="text-xs font-black font-mono text-foreground/80 group-hover/item:text-primary transition-colors truncate tracking-tighter">
                {core || role}
              </span>
              {core && (
                <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-tighter">
                  .{role}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Globe className="h-2.5 w-2.5 text-muted-foreground/20" />
              <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest truncate">
                {domain}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation()
              copyToClipboard(v, v)
            }}
          >
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground/10 group-hover/item:text-primary/40 group-hover/item:translate-x-0.5 transition-all" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <SheetHeader className="p-8 border-b border-border/40 bg-linear-to-b from-muted/10 to-transparent shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl hover:bg-muted/80 -ml-2.5 transition-all active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-[0.2em] font-black px-3 py-1 rounded-xl bg-primary/10 text-primary border-none shadow-xs"
            >
              {config.displayName}
            </Badge>
            {isNested && (
              <Badge
                variant="outline"
                className="text-[9px] font-black uppercase bg-muted/50 border-border/40 h-6 px-2"
              >
                Sub-Entity
              </Badge>
            )}
          </div>
          <SheetTitle className="text-3xl font-black tracking-tighter leading-tight text-foreground">
            {entityName}
          </SheetTitle>
          <SheetDescription className="text-xs font-mono font-bold opacity-50 flex items-center gap-2 pt-1 tracking-tight">
            <Globe className="h-3.5 w-3.5 text-primary/60" /> {entitySubtitle}
          </SheetDescription>
        </div>
      </SheetHeader>

      <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0" onValueChange={setActiveTab}>
        <div className="px-8 bg-background border-b border-border/20">
          <TabsList className="w-full h-12 bg-muted/30 p-1 rounded-2xl border border-border/10 my-4">
            <TabsTrigger
              value="overview"
              className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="schema"
              className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all"
            >
              Schema
            </TabsTrigger>
            <TabsTrigger
              value="relationships"
              className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all"
            >
              Relationships
            </TabsTrigger>
            {isOSDU && (
              <TabsTrigger
                value="security"
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all"
              >
                Security
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <TabsContent
            value="relationships"
            className="h-full m-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {relationshipQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  Resolving semantic graph...
                </p>
              </div>
            ) : allRelationships.length > 0 ? (
              <div className="h-full flex flex-col p-4 md:p-8 gap-4 md:gap-6">
                <div className="flex items-center justify-between shrink-0 px-2 md:px-0">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                      <Workflow className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div className="flex flex-col">
                      <h5 className="text-[11px] md:text-[13px] font-black uppercase tracking-[0.3em] text-foreground leading-none">
                        Relationships
                      </h5>
                      <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground/50 uppercase mt-1 md:mt-1.5 tracking-widest leading-none">
                        Semantic Link Discovery
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            <ToggleGroup
                              type="single"
                              value={relFilter}
                              onValueChange={(v) => v && setRelFilter(v as any)}
                            >
                              <ToggleGroupItem
                                value="core"
                                className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm transition-all"
                              >
                                Core Links
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="all"
                                className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm transition-all"
                              >
                                All Metadata
                              </ToggleGroupItem>
                            </ToggleGroup>
                            <div className="mx-2 text-muted-foreground/40">
                              <Info className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-[200px] text-[10px] font-medium leading-relaxed"
                        >
                          <span className="font-bold text-primary">Core Links:</span> High-value
                          business relationships (e.g. Well to Project).
                          <br />
                          <br />
                          <span className="font-bold text-primary">All Metadata:</span> Includes
                          technical references, unit definitions, and audit links.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <DomainEntityGraph
                    rootEntity={normalizedItem.name}
                    relationships={filteredRelationships}
                    onNodeClick={(kind) => onNavigate?.(kind)}
                    navigationStack={navigationStack}
                    onBack={onClose}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6">
                <div className="p-8 rounded-[2.5rem] bg-muted/20 border border-dashed border-border/60 relative group">
                  <GitBranch className="h-16 w-16 text-muted-foreground/20 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-black uppercase tracking-[0.2em] text-foreground/60">
                    Standalone Entity
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed opacity-60">
                    No explicit outgoing relationships were detected in the technical schema
                    definitions.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <ScrollArea className="h-full">
            <div className="p-8">
              <TabsContent
                value="overview"
                className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="grid grid-cols-2 gap-4">
                  {config.card.stats.map((stat, idx) => (
                    <StatCard
                      key={idx}
                      icon={React.createElement(stat.icon || Database, { className: 'h-4 w-4' })}
                      label={stat.label}
                      value={String(stat.getValue(normalizedItem) || 'N/A')}
                    />
                  ))}
                  <StatCard
                    icon={<Database className="h-4 w-4" />}
                    label="Partition"
                    value={normalizedItem.schema}
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/30 whitespace-nowrap">
                      Entity Identity
                    </h5>
                    <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                  </div>
                  <div className="grid gap-2">
                    {metadataItems.map(({ key, value }) => (
                      <DetailItem key={key} label={key} value={value} />
                    ))}
                    {isProSource && liveDetails && (
                      <>
                        {liveDetails.crs && (
                          <DetailItem
                            label="Coordinate System"
                            value={liveDetails.crs.NAME || liveDetails.crs.name || 'Unknown'}
                          />
                        )}
                        {liveDetails.unit_system && (
                          <DetailItem label="Unit System" value={liveDetails.unit_system} />
                        )}
                      </>
                    )}
                    {isOSDU ? (
                      <>
                        <DetailItem label="Authority" value={fullMetadata?.authority} />
                        <DetailItem label="Source" value={fullMetadata?.source} />
                        <DetailItem label="Semantic Group" value={fullMetadata?.group} />
                      </>
                    ) : (
                      <>
                        {fullMetadata?.authority && (
                          <DetailItem label="Authority" value={fullMetadata.authority} />
                        )}
                        {fullMetadata?.source && (
                          <DetailItem label="Source" value={fullMetadata.source} />
                        )}
                      </>
                    )}
                    <DetailItem
                      label="Integration"
                      value={
                        <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] h-5 px-2 rounded-md shadow-lg shadow-emerald-500/20">
                          VERIFIED
                        </Badge>
                      }
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/30 whitespace-nowrap">
                      Technical Descriptor
                    </h5>
                    <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                  </div>
                  <div className="relative group rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
                    <CodeBlock
                      code={JSON.stringify(displayJson, null, 2)}
                      language="json"
                      rounded
                      maxHeight="400px"
                      className="text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="schema"
                className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {schemaQuery.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                      <Loader2 className="h-14 w-14 animate-spin text-primary relative z-10" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-foreground/60 animate-pulse">
                        Introspecting Metadata
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">
                        Fetching live definitions
                      </p>
                    </div>
                  </div>
                ) : schemaQuery.data ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between px-6 py-5 bg-muted/20 rounded-[2.5rem] border border-border/40 shadow-xs relative overflow-hidden">
                      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent pointer-events-none" />
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                          Schema Topology
                        </h5>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-60">
                          {schemaProperties.length} semantic attributes identified
                        </p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={downloadSchema}
                        className="rounded-2xl font-black uppercase tracking-widest text-[9px] h-10 px-5 gap-2.5 bg-foreground text-background hover:bg-foreground/90 shadow-xl relative z-10"
                      >
                        <Download className="h-4 w-4" /> Export Schema
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {schemaProperties.map(([name, meta]: [string, any]) => {
                        const rawType = (meta.type || meta.native_type || 'string').toLowerCase()
                        const displayType =
                          rawType === 'array' ? 'Array' : rawType === 'object' ? 'Object' : rawType

                        return (
                          <div
                            key={name}
                            className="p-5 rounded-[1.75rem] border border-border/40 bg-card/40 flex items-center justify-between group hover:bg-muted/10 hover:border-primary/20 transition-all shadow-xs active:scale-[0.99]"
                          >
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black font-mono text-foreground/90 group-hover:text-primary transition-colors truncate">
                                  {name}
                                </span>
                                {meta.required && (
                                  <Badge className="h-3.5 px-1 text-[7px] font-black bg-primary/10 text-primary border-none uppercase">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-bold line-clamp-1 opacity-60 tracking-tight">
                                {meta.description || 'Enterprise domain attribute'}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] font-black tracking-widest uppercase h-6 px-3 border shadow-xs transition-colors',
                                rawType === 'array'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                  : rawType === 'object'
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                    : 'bg-muted/50 text-muted-foreground/60 border-border/40'
                              )}
                            >
                              {displayType}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-8">
                    <div className="p-10 rounded-[3rem] bg-muted/20 border border-dashed border-border/60 relative group">
                      <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <LayoutGrid className="h-20 w-20 text-muted-foreground/20 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-lg font-black uppercase tracking-[0.2em] text-foreground/60">
                        No Schema Data
                      </p>
                      <p className="text-xs text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">
                        The schema has not been cached for this entity. Fetch live definitions from
                        the OSDU platform.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className="rounded-2xl font-black uppercase tracking-widest text-[11px] px-10 h-14 shadow-2xl shadow-primary/30 gap-3"
                      onClick={() => schemaQuery.refetch()}
                    >
                      <RefreshCw className="h-4 w-4" /> Fetch Definitions
                    </Button>
                  </div>
                )}
              </TabsContent>

              {isOSDU && (
                <TabsContent
                  value="security"
                  className="mt-0 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  {/* Entitlements Section */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <h5 className="text-[13px] font-black uppercase tracking-[0.3em] text-foreground leading-none">
                          Entitlements
                        </h5>
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase mt-1.5 tracking-widest leading-none">
                          Authorization Identity Pool
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                    </div>

                    <div className="space-y-10">
                      {/* Owners Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                          <Badge className="bg-rose-500 text-white border-none font-black text-[9px] uppercase tracking-[0.2em] px-4 h-7 rounded-xl shadow-lg shadow-rose-500/20">
                            Administrative Owners
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {(fullMetadata?.acl?.owners || []).map((o: string) =>
                            renderOSDUGroupCard(o, 'owner')
                          )}
                          {!fullMetadata?.acl?.owners?.length && (
                            <div className="py-12 flex flex-col items-center justify-center bg-muted/5 rounded-[2rem] border border-dashed border-border/60">
                              <ShieldAlert className="h-8 w-8 text-muted-foreground/10 mb-2" />
                              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30">
                                No Control Groups
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="bg-border/10" />

                      {/* Viewers Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                          <Badge className="bg-amber-500 text-white border-none font-black text-[9px] uppercase tracking-[0.2em] px-4 h-7 rounded-xl shadow-lg shadow-amber-500/20">
                            Authorized Viewers
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {(fullMetadata?.acl?.viewers || []).map((v: string) =>
                            renderOSDUGroupCard(v, 'viewer')
                          )}
                          {!fullMetadata?.acl?.viewers?.length && (
                            <div className="py-12 flex flex-col items-center justify-center bg-muted/5 rounded-[2rem] border border-dashed border-border/60">
                              <UserCheck className="h-8 w-8 text-muted-foreground/10 mb-2" />
                              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30">
                                No Access Groups
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legal Section */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                        <Scale className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <h5 className="text-[13px] font-black uppercase tracking-[0.3em] text-foreground leading-none">
                          Trust Center
                        </h5>
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase mt-1.5 tracking-widest leading-none">
                          Regional Governance & Privacy
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-linear-to-r from-border/60 to-transparent" />
                    </div>

                    <div className="p-10 rounded-[3rem] border border-border/40 bg-emerald-500/[0.02] space-y-12 shadow-2xl ring-1 ring-black/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-24 -mr-12 -mt-12 bg-emerald-500/5 blur-3xl rounded-full" />

                      <div className="space-y-6 relative z-10">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-600/80">
                            <Tag className="h-4 w-4" /> Legal Classification
                          </div>
                          <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase tracking-[0.2em] h-5 px-3 rounded-lg shadow-lg shadow-emerald-500/20">
                            Compliant
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 px-1">
                          {(fullMetadata?.legal?.legaltags || []).map((t: string) => {
                            const isTagCopied = copiedId === `tag-${t}`
                            return (
                              <div
                                key={t}
                                className="group/tag relative cursor-pointer active:scale-95 transition-all"
                                onClick={() => copyToClipboard(t, `tag-${t}`)}
                              >
                                <Badge
                                  className={cn(
                                    'relative text-[10px] py-2.5 px-6 rounded-xl font-black tracking-tight gap-2.5 transition-all border',
                                    isTagCopied
                                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                                      : 'bg-muted/30 text-foreground/60 border-border/40 hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-xs'
                                  )}
                                >
                                  <Tag
                                    size={12}
                                    className={cn(
                                      'transition-colors',
                                      isTagCopied
                                        ? 'text-primary-foreground'
                                        : 'text-muted-foreground/40 group-hover/tag:text-primary/60'
                                    )}
                                  />
                                  {t}
                                  <div
                                    className={cn(
                                      'w-px h-3 mx-0.5 transition-colors',
                                      isTagCopied ? 'bg-primary-foreground/20' : 'bg-border/60'
                                    )}
                                  />
                                  {isTagCopied ? (
                                    <Check size={12} className="text-primary-foreground" />
                                  ) : (
                                    <Copy
                                      size={12}
                                      className="opacity-0 group-hover/tag:opacity-100 transition-opacity"
                                    />
                                  )}
                                </Badge>
                              </div>
                            )
                          })}
                          {!fullMetadata?.legal?.legaltags?.length && (
                            <div className="w-full py-8 text-center bg-background/40 rounded-2xl border border-dashed border-border/60">
                              <span className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30 italic">
                                No Active Legal Tags
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="bg-emerald-500/10" />

                      <div className="p-8 rounded-3xl bg-background border border-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-6 group transition-all hover:border-emerald-500/30 shadow-xl relative z-10">
                        <div className="flex items-center gap-6">
                          <div className="p-4 rounded-2xl bg-emerald-500/5 ring-1 ring-emerald-500/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Globe className="h-6 w-6 text-emerald-500/60 transition-transform group-hover:rotate-[30deg]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70 leading-none">
                              Data Sovereignty
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase mt-2 tracking-tighter leading-none">
                              Cross-Border Governance Control
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(fullMetadata?.legal?.otherRelevantDataCountries || []).map(
                            (c: string) => (
                              <Badge
                                key={c}
                                variant="secondary"
                                className="text-[11px] font-black rounded-xl h-10 px-6 bg-muted/50 text-foreground border border-border/20 shadow-sm transition-all hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/20"
                              >
                                {c}
                              </Badge>
                            )
                          )}
                          {!fullMetadata?.legal?.otherRelevantDataCountries?.length && (
                            <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                              Global Access
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  )
}

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string
}) => (
  <div className="p-6 rounded-[2rem] border border-border/40 bg-muted/5 space-y-3 hover:bg-muted/10 transition-all group shadow-xs">
    <div className="flex items-center gap-3 text-muted-foreground/50 group-hover:text-primary/60 transition-colors">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
    <p className="text-base font-black text-foreground/90 truncate tracking-tight">
      {value || 'N/A'}
    </p>
  </div>
)

const DetailItem = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-center justify-between py-3 px-2 border-b border-border/10 last:border-0 group/row hover:bg-muted/5 transition-colors rounded-xl">
    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground group-hover/row:text-foreground/60 transition-colors">
      {label}
    </span>
    <div className="font-black text-[12px] text-foreground/80 tracking-tight">
      {React.isValidElement(value) ? (
        value
      ) : typeof value === 'object' && value !== null ? (
        <code className="text-[10px] bg-muted px-2 py-1 rounded-md">{JSON.stringify(value)}</code>
      ) : (
        String(value ?? 'N/A')
      )}
    </div>
  </div>
)
