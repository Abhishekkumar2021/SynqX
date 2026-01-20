import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getConnection,
  testConnection,
  deleteConnection,
  discoverAssets,
  getConnectionAssets,
  type ConnectionTestResult,
  getConnectionEnvironment,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Database,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  Layers,
  Server,
  MoreVertical,
  Trash2,
  Pencil,
  CheckCircle2,
  Terminal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CreateConnectionDialog } from '@/components/features/connections/CreateConnectionDialog'
import { PageMeta } from '@/components/common/PageMeta'
import { useMemo, useState } from 'react'
import { useZenMode } from '@/hooks/useZenMode'
import { motion } from 'framer-motion'
import { AssetsTabContent } from '@/components/features/connections/AssetsTabContent'
import { ConnectionConfigStats } from '@/components/features/connections/ConnectionConfigStats'
import { EnvironmentInfo } from '@/components/features/connections/EnvironmentInfo'
import { useWorkspace } from '@/hooks/useWorkspace'

export const ConnectionDetailsPage: React.FC = () => {
  const { isZenMode } = useZenMode()
  const { activeWorkspace } = useWorkspace()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const connectionId = parseInt(id!)
  const queryClient = useQueryClient()

  // URL Synced State
  const activeTab = searchParams.get('tab') || 'assets'
  const setActiveTab = (val: string) => {
    setSearchParams((prev) => {
      prev.set('tab', val)
      return prev
    })
  }

  const [discoveredAssets, setDiscoveredAssets] = useState<any[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const {
    data: connection,
    isLoading: loadingConnection,
    isError: isConnectionError,
  } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection(connectionId),
    retry: 1,
  })

  const { data: envInfo } = useQuery({
    queryKey: ['connectionEnvironment', connectionId],
    queryFn: () => getConnectionEnvironment(connectionId),
    enabled: !!connectionId,
  })

  const hasEnvironment = useMemo(() => {
    if (!envInfo) return false
    return !!(
      envInfo.python_version ||
      (envInfo.available_tools && Object.keys(envInfo.available_tools).length > 0)
    )
  }, [envInfo])

  const deleteMutation = useMutation({
    mutationFn: () => deleteConnection(connectionId),
    onSuccess: () => {
      toast.success('Connection deleted')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      navigate('/connections')
    },
    onError: () => toast.error('Failed to delete connection'),
  })

  const { data: assets, isLoading: loadingAssets } = useQuery({
    queryKey: ['assets', connectionId],
    queryFn: () => getConnectionAssets(connectionId),
    enabled: !!connection,
  })

  const isRemote = useMemo(() => {
    return (
      activeWorkspace?.default_agent_group && activeWorkspace.default_agent_group !== 'internal'
    )
  }, [activeWorkspace])

  const testMutation = useMutation({
    mutationFn: () => testConnection(connectionId),

    onSuccess: (data: ConnectionTestResult) => {
      if (data.success) {
        toast.success(isRemote ? 'Agent Connectivity Verified' : 'Connection Healthy', {
          description: `${data.message || 'The system can successfully communicate with the data source.'}`,

          icon: <ShieldCheck className="text-emerald-500 h-4 w-4" />,
        })
      } else {
        toast.error('Connection Failed', {
          description:
            data.message ||
            'The data source could not be reached. Please check your credentials and host settings.',

          icon: <AlertTriangle className="text-destructive h-4 w-4" />,
        })
      }
    },

    onError: (err: any) => {
      let errorMsg = 'An internal error occurred while trying to verify connectivity.'
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (detail && typeof detail === 'object') {
        errorMsg = detail.message || detail.error || JSON.stringify(detail)
      }
      toast.error('Test execution failed', {
        description: errorMsg,
      })
    },
  })

  const discoverMutation = useMutation({
    mutationFn: () => discoverAssets(connectionId, true),

    onSuccess: (data: any) => {
      const newAssets = data.assets || []

      toast.success(isRemote ? `Agent Discovery Complete` : `Discovery Complete`, {
        description: `Found ${data.discovered_count || newAssets.length || 0} items across remote node.`,
      })

      setDiscoveredAssets(newAssets)
    },

    onError: (err: any) => {
      let errorMsg = 'Make sure your remote agent is online.'
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (detail && typeof detail === 'object') {
        errorMsg = detail.message || detail.error || JSON.stringify(detail)
      }
      toast.error('Discovery failed', {
        description: errorMsg,
      })
    },
  })

  if (loadingConnection)
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-150 w-full rounded-3xl" />
      </div>
    )

  if (isConnectionError || !connection)
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-muted-foreground gap-8 animate-in fade-in duration-500',
          isZenMode ? 'h-[calc(100vh-3rem)]' : 'h-[60vh]'
        )}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
          <div className="relative h-24 w-24 glass-card rounded-3xl flex items-center justify-center shadow-2xl">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Connection Not Found</h2>
          <p className="max-w-md mx-auto text-sm leading-relaxed">
            The connection you are looking for does not exist or you do not have permission to view
            it.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/connections')}
          className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Connections
        </Button>
      </div>
    )

  const handleExplore = () => {
    if (!connection) return
    const type = connection.connector_type.toLowerCase()
    let explorerType = 'sql'
    if (type === 'osdu' || type === 'prosource') explorerType = 'osdu'
    else if (['local_file', 's3', 'gcs', 'azure_blob', 'sftp', 'ftp'].includes(type))
      explorerType = 'file'

    navigate(`/explorer/${explorerType}/${connection.id}`)
  }

  return (
    <motion.div
      className={cn(
        'flex flex-col gap-6 md:gap-8 px-1',
        isZenMode ? 'h-[calc(100vh-4rem)]' : 'h-[calc(100vh-8rem)]'
      )}
    >
      <PageMeta
        title={connection.name}
        description={`Manage ${connection.name} connection details.`}
      />

      {/* --- Page Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-6 md:gap-0 px-1">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 hover:bg-muted/50 rounded-2xl border border-border/40 transition-all shadow-sm hover:shadow-md hidden md:flex"
            onClick={() => navigate('/connections')}
          >
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>

          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-2xl ring-1 ring-border/50 backdrop-blur-md shadow-sm">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                {connection.name}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  'uppercase text-[10px] tracking-widest font-bold px-2.5 py-1 rounded-lg shadow-sm mt-1',
                  connection.health_status === 'active' || connection.health_status === 'healthy'
                    ? 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-muted-foreground border-border bg-muted/50'
                )}
              >
                {connection.health_status || 'UNKNOWN'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium pl-1 overflow-x-auto whitespace-nowrap scrollbar-none">
              <span className="flex items-center gap-1.5 capitalize">
                <span className="font-semibold text-foreground/70">
                  {connection.connector_type}
                </span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
              <span className="flex items-center gap-1.5 font-medium text-xs">
                ID: <span className="font-bold font-mono text-foreground/70">{connection.id}</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Updated{' '}
                {formatDistanceToNow(new Date(connection.updated_at || new Date()), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExplore}
            className="h-11 px-5 rounded-2xl border-border/40 bg-background/40 backdrop-blur-md hover:shadow-lg transition-all shadow-sm font-semibold gap-2"
          >
            <Search className="h-4 w-4 text-primary" />
            Explore Data
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className={cn(
                    'h-11 px-5 rounded-2xl border-border/40 bg-background/40 backdrop-blur-md hover:shadow-lg transition-all shadow-sm font-semibold gap-2 min-w-40',
                    testMutation.isSuccess &&
                      testMutation.data?.success &&
                      'text-emerald-600 dark:text-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
                    (testMutation.isError ||
                      (testMutation.isSuccess &&
                        testMutation.data &&
                        !testMutation.data.success)) &&
                      'text-destructive border-destructive/30 bg-destructive/10 hover:bg-destructive/20'
                  )}
                >
                  {testMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : testMutation.isSuccess && testMutation.data?.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : testMutation.isError ||
                    (testMutation.isSuccess && testMutation.data && !testMutation.data.success) ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  {testMutation.isPending
                    ? isRemote
                      ? 'Testing Agent...'
                      : 'Testing...'
                    : testMutation.isSuccess && testMutation.data?.success
                      ? isRemote
                        ? 'Verified on Agent'
                        : 'Connection Healthy'
                      : testMutation.isError ||
                          (testMutation.isSuccess &&
                            testMutation.data &&
                            !testMutation.data.success)
                        ? 'Test Failed'
                        : 'Test Connection'}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-xs text-xs font-medium bg-background/95 backdrop-blur-xl border-border/40 shadow-xl rounded-xl p-3"
              >
                {testMutation.data ? (
                  <div className="space-y-1">
                    <p
                      className={cn(
                        'font-bold',
                        testMutation.data.success ? 'text-emerald-500' : 'text-destructive'
                      )}
                    >
                      {testMutation.data.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                    <p className="opacity-90 leading-relaxed">{testMutation.data.message}</p>
                    {testMutation.data.latency_ms && (
                      <p className="text-muted-foreground pt-1 border-t border-border/30 mt-2 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Latency: {testMutation.data.latency_ms.toFixed(2)}ms
                      </p>
                    )}
                  </div>
                ) : testMutation.error ? (
                  <p className="text-destructive">
                    An error occurred while testing the connection. Check console for details.
                  </p>
                ) : (
                  <p>Click to verify connectivity to the data source.</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-2xl border-border/40 bg-background/40 backdrop-blur-md hover:shadow-lg transition-all shadow-sm"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl border-border/60 glass-panel shadow-2xl p-2"
            >
              <DropdownMenuItem
                className="rounded-xl cursor-pointer py-2.5 gap-2.5 font-medium"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4 text-primary" /> Edit Connection
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40 my-1.5" />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-xl py-2.5 gap-2.5 font-medium"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete Connection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl glass-panel border-border/60 shadow-2xl overflow-hidden p-0">
          <div className="p-8 space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold tracking-tight">
                Delete Connection?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base leading-relaxed text-muted-foreground">
                This will permanently delete the connection{' '}
                <span className="font-bold text-foreground">"{connection.name}"</span> and all its
                metadata. Any pipelines using this connection will{' '}
                <span className="text-destructive font-semibold">stop working immediately</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="bg-muted/30 p-6 gap-3">
            <AlertDialogCancel className="rounded-xl border-border/40 bg-background/50 hover:bg-background font-semibold h-11 px-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-lg shadow-destructive/20 font-semibold h-11 px-6"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Connection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Content Tabs --- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 px-1 shrink-0">
          <TabsList className="w-full justify-start gap-1">
            <TabsTrigger value="assets" className="gap-2">
              <Layers className="h-3.5 w-3.5" />
              Assets
            </TabsTrigger>

            <TabsTrigger value="configuration" className="gap-2">
              <Server className="h-3.5 w-3.5" />
              Configuration
            </TabsTrigger>

            {hasEnvironment && (
              <TabsTrigger value="environment" className="gap-2">
                <Terminal className="h-3.5 w-3.5" />
                Environment
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div
          className={cn(
            'flex-1 min-h-0',
            isZenMode ? 'h-[calc(100vh-10rem)]' : 'h-[calc(100vh-16rem)]'
          )}
        >
          <TabsContent value="assets" className="h-full mt-0 focus-visible:outline-none">
            <AssetsTabContent
              connectionId={connectionId}
              connectionName={connection.name}
              connectorType={connection.connector_type}
              assets={assets}
              discoveredAssets={discoveredAssets}
              isLoading={loadingAssets || discoverMutation.isPending}
              onDiscover={() => discoverMutation.mutate()}
              setDiscoveredAssets={setDiscoveredAssets}
            />
          </TabsContent>

          <TabsContent value="configuration" className="h-full mt-0 focus-visible:outline-none">
            <ConnectionConfigStats connection={connection} connectionId={connectionId} />
          </TabsContent>

          {hasEnvironment && (
            <TabsContent value="environment" className="h-full mt-0 focus-visible:outline-none">
              <EnvironmentInfo connectionId={connectionId} />
            </TabsContent>
          )}
        </div>
      </Tabs>

      <CreateConnectionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={connection}
      />
    </motion.div>
  )
}
