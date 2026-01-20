import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConnections } from '@/lib/api'
import { PageMeta } from '@/components/common/PageMeta'
import {
  Layers,
  Database,
  HardDrive,
  Globe,
  Search,
  ArrowRight,
  Activity,
  Server,
  Cpu,
  X,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useZenMode } from '@/hooks/useZenMode'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useFuzzySearch } from '@/hooks/useFuzzySearch'

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: any; color: string; route: string | null }
> = {
  domain: { label: 'Domain Discovery', icon: Layers, color: 'text-indigo-500', route: 'osdu' },
  sql: { label: 'Query Studio', icon: Database, color: 'text-blue-500', route: 'sql' },
  file: { label: 'File Systems', icon: HardDrive, color: 'text-emerald-500', route: 'file' },
  automation: { label: 'Automation & Logic', icon: Cpu, color: 'text-amber-500', route: null },
  unsupported: {
    label: 'Platform Connectors',
    icon: Server,
    color: 'text-muted-foreground/40',
    route: null,
  },
}

export const ExplorerPage: React.FC = () => {
  const navigate = useNavigate()
  const { isZenMode } = useZenMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''

  const setSearch = (val: string) => {
    setSearchParams((prev) => {
      if (val) prev.set('q', val)
      else prev.delete('q')
      return prev
    })
  }

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: getConnections,
  })

  const getExplorerType = (connectorType: string) => {
    const type = connectorType.toLowerCase()
    if (type.includes('osdu') || type.includes('prosource')) return 'domain'

    const files = ['local_file', 's3', 'gcs', 'azure_blob', 'sftp', 'ftp']
    if (files.includes(type)) return 'file'

    const sqlTypes = [
      'postgresql',
      'mysql',
      'mssql',
      'oracle',
      'sqlite',
      'duckdb',
      'snowflake',
      'bigquery',
      'redshift',
      'databricks',
      'mariadb',
    ]
    if (sqlTypes.includes(type)) return 'sql'

    if (type === 'custom_script' || type === 'singer_tap' || type === 'dbt') return 'automation'

    return 'unsupported'
  }

  const searchResults = useFuzzySearch(connections, search, {
    keys: ['name', 'connector_type'],
    threshold: 0.3,
  })

  const categorized = useMemo(() => {
    const filtered = searchResults

    const groups: Record<string, typeof connections> = {
      domain: [],
      sql: [],
      file: [],
      automation: [],
      unsupported: [],
    }
    filtered.forEach((c) => {
      const type = getExplorerType(c.connector_type)
      groups[type].push(c)

      // Feature: Allow ProSource to also appear in SQL Query Studio
      if (type === 'domain' && c.connector_type.toLowerCase().includes('prosource')) {
        groups['sql'].push(c)
      }
    })
    return groups
  }, [connections, searchResults])

  const handleNavigate = (connection: any, overrideType?: string) => {
    const type = overrideType || getExplorerType(connection.connector_type)
    let routeBase = CATEGORY_MAP[type]?.route

    // Dynamic routing for Domain category (if not overridden)
    if (type === 'domain' && !overrideType) {
      if (connection.connector_type.toLowerCase().includes('prosource')) {
        routeBase = 'prosource'
      } else {
        routeBase = 'osdu'
      }
    }

    if (!routeBase) {
      toast.info('Explorer not available', {
        description: `Specialized exploration for ${connection.connector_type} is coming soon.`,
      })
      return
    }

    navigate(`/explorer/${routeBase}/${connection.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex-1 flex flex-col gap-6 md:gap-8 px-1',
        isZenMode ? 'h-[calc(100vh-3rem)]' : 'h-[calc(100vh-8rem)]'
      )}
    >
      <PageMeta title="Explorer" description="Portal for multi-modal data discovery." />

      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 md:gap-0 px-1">
        <div className="space-y-1.5">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
              <Globe
                size={24}
                className="text-primary animate-spin-slow"
                style={{ animationDuration: '12s' }}
              />
            </div>
            Source Mesh
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-medium pl-1 leading-relaxed max-w-2xl">
            Universal discovery portal for your data ecosystem.
          </p>
        </div>
      </div>

      {/* --- Content Pane (Glass) --- */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl relative overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
          <div className="relative flex-1 max-w-2xl group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
            <Input
              placeholder="Filter connections by name or partition type..."
              className="pl-11 h-11 rounded-xl bg-background/50 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 bg-background/50 border border-border/50 px-4 py-2.5 rounded-full shadow-sm">
            <Activity className="h-3.5 w-3.5 text-primary" />
            {connections.length} Partitions Connected
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 md:p-10 space-y-16 pb-32">
            {isLoading ? (
              <div className="grid gap-12">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-6">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} className="h-48 rounded-[2rem]" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              Object.entries(categorized).map(([key, items]) => {
                if (items.length === 0 && !search) return null
                const cat = CATEGORY_MAP[key]
                const Icon = cat.icon

                return (
                  <section
                    key={key}
                    className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
                  >
                    <div className="flex items-center gap-4 px-2">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-[1.25rem] bg-background border border-border/40 shadow-sm flex items-center justify-center ring-4 ring-muted/5',
                          cat.color
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-xl font-black uppercase tracking-tight leading-none text-foreground/90">
                          {cat.label}
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mt-1.5">
                          {items.length} ACTIVE ENDPOINTS
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-linear-to-r from-border/40 to-transparent ml-4 opacity-50" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                      {items.map((conn) => (
                        <ConnectionCard
                          key={conn.id}
                          connection={conn}
                          onClick={() => handleNavigate(conn, key === 'sql' ? 'sql' : undefined)}
                          colorClass={cat.color}
                          isUnsupported={!cat.route}
                        />
                      ))}{' '}
                      {items.length === 0 && search && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-border/20 rounded-[3rem] opacity-30 bg-muted/5">
                          <span className="text-xs font-black uppercase tracking-widest">
                            No matching partitions
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}

const ConnectionCard = ({
  connection,
  onClick,
  colorClass,
  isUnsupported,
}: {
  connection: any
  onClick: () => void
  colorClass: string
  isUnsupported?: boolean
}) => {
  const isHealthy = connection.health_status === 'healthy'

  return (
    <motion.div
      whileHover={!isUnsupported ? { y: -5, scale: 1.02 } : {}}
      whileTap={!isUnsupported ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        'group relative h-52 p-8 rounded-[2.5rem] border transition-all overflow-hidden shadow-sm',
        isUnsupported
          ? 'bg-muted/20 border-border/20 cursor-not-allowed opacity-60 grayscale'
          : 'bg-card/40 border-border/40 hover:border-primary/40 hover:bg-card/60 cursor-pointer hover:shadow-2xl hover:shadow-primary/5'
      )}
    >
      {/* Ambient Background Gradient */}
      {!isUnsupported && (
        <div className="absolute top-0 right-0 p-24 -mr-12 -mt-12 bg-linear-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-3xl" />
      )}

      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'h-5 px-2 text-[9px] font-black uppercase tracking-widest border-none bg-muted/50',
                  colorClass
                )}
              >
                {connection.connector_type}
              </Badge>
              {!isUnsupported && (
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shadow-[0_0_8px]',
                    isHealthy
                      ? 'bg-emerald-500 shadow-emerald-500/40'
                      : 'bg-amber-500 shadow-amber-500/40'
                  )}
                />
              )}
            </div>
            <h4 className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors uppercase leading-none">
              {connection.name}
            </h4>
          </div>
          <div
            className={cn(
              'h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center transition-all shadow-xl shadow-black/5',
              !isUnsupported &&
                'group-hover:text-primary group-hover:border-primary/20 group-hover:shadow-primary/10'
            )}
          >
            {isUnsupported ? (
              <X size={20} className="text-muted-foreground/40" />
            ) : (
              <ArrowRight
                size={20}
                className="transition-transform group-hover:translate-x-1 text-muted-foreground"
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-6">
            {isUnsupported ? (
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                Specialized Explorer Unavailable
              </span>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">
                    Status
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-bold mt-1.5 uppercase',
                      isHealthy ? 'text-emerald-500' : 'text-amber-500'
                    )}
                  >
                    {connection.health_status}
                  </span>
                </div>
                <div className="w-px h-6 bg-border/20" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">
                    Entities
                  </span>
                  <span className="text-[11px] font-bold mt-1.5 text-foreground/80">
                    {connection.asset_count || 0} discovered
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ExplorerPage
