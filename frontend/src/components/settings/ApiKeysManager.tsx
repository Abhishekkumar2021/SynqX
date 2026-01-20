 
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  Copy,
  Key,
  Shield,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Search,
  List,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, differenceInDays, isBefore, startOfToday } from 'date-fns'
import { useWorkspace } from '@/hooks/useWorkspace'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

import { getApiKeys, createApiKey, revokeApiKey, type ApiKeyCreate } from '@/lib/api'

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

export const ApiKeysManager = () => {
  const queryClient = useQueryClient()
  const { isAdmin } = useWorkspace()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRevokeAlertOpen, setIsRevokeAlertOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<number | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: getApiKeys,
  })

  const filteredKeys = useMemo(() => {
    if (!apiKeys) return []
    return apiKeys.filter(
      (key) =>
        key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.prefix.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [apiKeys, searchQuery])

  const createMutation = useMutation({
    mutationFn: (data: ApiKeyCreate) => createApiKey(data),
    onSuccess: (data) => {
      setCreatedKey(data.key)
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
      toast.success('API Key Generated', {
        description: 'Your new key is ready. Please copy it now.',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      })
      setNewKeyName('')
      setExpiryDate(undefined)
    },
    onError: (error: any) => {
      toast.error('Generation Failed', {
        description: error.response?.data?.detail || 'Failed to create API key',
      })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
      toast.success('Key Revoked', {
        description: 'The API key has been permanently deactivated.',
      })
      setIsRevokeAlertOpen(false)
      setKeyToRevoke(null)
    },
    onError: (error: any) => {
      toast.error('Revocation Failed', {
        description: error.response?.data?.detail || 'Failed to revoke API key',
      })
    },
  })

  const handleRevokeClick = (id: number) => {
    setKeyToRevoke(id)
    setIsRevokeAlertOpen(true)
  }

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error('Name Required', { description: 'Please provide a name for this API key.' })
      return
    }

    let days: number | undefined = undefined
    if (expiryDate) {
      days = differenceInDays(expiryDate, startOfToday())
      if (days < 0) days = 0
    }

    createMutation.mutate({
      name: newKeyName,
      expires_in_days: days,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const closeDialog = () => {
    setIsCreateOpen(false)
    setCreatedKey(null)
  }

  return (
    <div className="flex flex-col h-full min-h-125 rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden relative">
      <div className="p-4 md:p-5 border-b border-border/40 bg-muted/10 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-6">
        <div className="space-y-0.5 relative z-10">
          <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Key className="h-3.5 w-3.5" />
            </div>
            Identity Registry
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold tracking-tight pl-1">
            <span className="text-foreground">{apiKeys?.length || 0}</span> ACTIVE KEYS{' '}
            <span className="mx-2 opacity-30">•</span>{' '}
            <span className="text-primary">{isAdmin ? 'ADMIN' : 'VIEWER'}</span> ACCESS
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-56 group">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
            <Input
              placeholder="Filter keys..."
              className="pl-8 h-8 rounded-lg bg-background/50 border-border/40 focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/5 transition-all shadow-none text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-md transition-all',
                  viewMode === 'list'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-md transition-all',
                  viewMode === 'grid'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>

            {isAdmin && (
              <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeDialog()}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-lg shadow-sm h-8 px-3 gap-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Generate Key</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-border/40 glass-panel shadow-2xl">
                  {!createdKey ? (
                    <div className="flex flex-col h-full">
                      <div className="p-8 pb-4">
                        <DialogHeader className="mb-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                              <Key className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <DialogTitle className="text-2xl font-bold tracking-tight">
                                Generate API Key
                              </DialogTitle>
                              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                                Secure Programmatic Access
                              </DialogDescription>
                            </div>
                          </div>
                        </DialogHeader>

                        <div className="space-y-6 py-2">
                          <div className="space-y-2.5">
                            <Label
                              htmlFor="name"
                              className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 px-1"
                            >
                              Key Name
                            </Label>
                            <Input
                              id="name"
                              placeholder="e.g., CI/CD Pipeline"
                              className="h-12 bg-muted/20 border-border/40 rounded-xl px-4 font-bold focus-visible:ring-primary/20"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              autoFocus
                            />
                          </div>

                          <div className="space-y-2.5">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
                              Expiration Policy
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full h-12 justify-start text-left font-bold rounded-xl bg-muted/20 border-border/40 px-4 transition-all hover:bg-muted/30',
                                    !expiryDate && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="mr-3 h-4 w-4 opacity-60" />
                                  {expiryDate ? (
                                    format(expiryDate, 'PPP')
                                  ) : (
                                    <span className="opacity-60">Never (No expiration)</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 rounded-2xl border-border/40 shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl"
                                align="start"
                              >
                                <div className="p-3 border-b border-border/20 bg-muted/5 flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Select Expiry Date
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpiryDate(undefined)}
                                    className="h-6 text-[10px] font-bold text-primary hover:bg-primary/10"
                                  >
                                    Clear
                                  </Button>
                                </div>
                                <Calendar
                                  mode="single"
                                  selected={expiryDate}
                                  onSelect={setExpiryDate}
                                  disabled={(date) => isBefore(date, startOfToday())}
                                  initialFocus
                                />
                                <div className="p-3 bg-muted/10 border-t border-border/20 grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold rounded-lg border-border/40"
                                    onClick={() => setExpiryDate(addDays(new Date(), 30))}
                                  >
                                    30 Days
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold rounded-lg border-border/40"
                                    onClick={() => setExpiryDate(addDays(new Date(), 90))}
                                  >
                                    90 Days
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <p className="text-[9px] font-medium text-muted-foreground/60 px-1 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              Security best practice: Rotate keys every 90 days.
                            </p>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="p-8 pt-4 bg-muted/5 border-t border-border/20 gap-3">
                        <Button
                          variant="ghost"
                          onClick={closeDialog}
                          className="flex-1 rounded-xl h-12 font-bold uppercase tracking-widest text-[10px]"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreate}
                          disabled={createMutation.isPending}
                          className="flex-1 rounded-xl h-12 font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:shadow-primary/40 transition-all gap-2"
                        >
                          {createMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Initializing...
                            </>
                          ) : (
                            <>
                              Generate Key
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
                      <div className="p-8 text-center space-y-6">
                        <div className="h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-emerald-500/5 border border-emerald-500/20">
                          <Shield className="h-10 w-10" />
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold tracking-tight text-foreground">
                            Identity Secured
                          </h3>
                          <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
                            Your API key has been successfully generated. Please store it securely.
                          </p>
                        </div>

                        <div className="p-6 bg-muted/30 rounded-[2rem] border border-border/40 space-y-4 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                            <Key size={80} />
                          </div>

                          <div className="flex flex-col gap-2 relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                              Secret Access Key
                            </span>
                            <code className="text-sm font-bold font-mono break-all text-primary bg-primary/5 p-4 rounded-2xl border border-primary/10">
                              {createdKey}
                            </code>
                          </div>

                          <Button
                            variant="outline"
                            className="w-full h-11 rounded-xl font-bold gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                            onClick={() => copyToClipboard(createdKey)}
                          >
                            <Copy className="h-4 w-4" /> Copy to Clipboard
                          </Button>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start text-left">
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 mt-0.5 shrink-0">
                            <AlertCircle className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-[10px] text-amber-700/80 leading-normal font-bold uppercase tracking-tight">
                            Warning: You will not be able to see this key again once you close this
                            dialog.
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="p-8 pt-0">
                        <Button
                          onClick={closeDialog}
                          className="w-full rounded-2xl h-14 font-bold uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-primary/20"
                        >
                          Done, I've Stored It
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border/80 scrollbar-track-transparent">
        {isLoading && !apiKeys ? (
          <div className="divide-y divide-border/20 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredKeys.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {viewMode === 'list' ? (
              <div className="flex flex-col">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 sticky top-0 z-20 shadow-sm">
                  <div className="col-span-12 md:col-span-4">Credential</div>
                  <div className="col-span-6 md:col-span-3">Signature</div>
                  <div className="col-span-6 md:col-span-2">Status</div>
                  <div className="col-span-6 md:col-span-2">Expiration</div>
                  <div className="col-span-12 md:col-span-1 text-right pr-4">Control</div>
                </div>

                <div className="divide-y divide-border/30">
                  {filteredKeys.map((key) => (
                    <div
                      key={key.id}
                      className={cn(
                        'group grid grid-cols-12 gap-4 items-center px-6 py-3 transition-all duration-200 cursor-pointer relative',
                        'hover:bg-muted/40',
                        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1',
                        'before:bg-primary before:scale-y-0 before:transition-transform before:duration-200',
                        'hover:before:scale-y-100'
                      )}
                    >
                      {/* Credential */}
                      <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform shadow-xs">
                          <Key className="h-4 w-4 text-primary/60" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm tracking-tight text-foreground truncate">
                            {key.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 font-bold truncate">
                            Issued {format(new Date(key.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>

                      {/* Signature */}
                      <div className="col-span-6 md:col-span-3 flex items-center">
                        <code className="bg-muted/30 px-2 py-1 rounded text-[10px] font-bold text-muted-foreground font-mono tracking-tight">
                          {key.prefix}••••••••
                        </code>
                      </div>

                      {/* Status */}
                      <div className="col-span-6 md:col-span-2 flex items-center">
                        <Badge
                          variant={key.is_active ? 'default' : 'secondary'}
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border w-fit',
                            key.is_active
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'opacity-50'
                          )}
                        >
                          {key.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Expiration */}
                      <div className="col-span-6 md:col-span-2 flex items-center">
                        {key.expires_at ? (
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                'text-[11px] font-bold tabular-nums',
                                isBefore(new Date(key.expires_at), new Date())
                                  ? 'text-destructive'
                                  : 'text-muted-foreground/60'
                              )}
                            >
                              {format(new Date(key.expires_at), 'MMM d, yyyy')}
                            </span>
                            {isBefore(new Date(key.expires_at), new Date()) && (
                              <span className="text-[9px] font-bold text-destructive uppercase tracking-tighter">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-20">
                            Persistent
                          </span>
                        )}
                      </div>

                      {/* Control */}
                      <div className="col-span-12 md:col-span-1 flex items-center justify-end pr-2">
                        {isAdmin && (
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRevokeClick(key.id)}
                              disabled={revokeMutation.isPending}
                              title="Revoke Key"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredKeys.map((key) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={key.id}
                    className="group relative flex flex-col p-5 rounded-[2rem] border border-border/40 bg-card/40 hover:bg-card/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <Key className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                            onClick={() => handleRevokeClick(key.id)}
                            disabled={revokeMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Badge
                          variant={key.is_active ? 'default' : 'secondary'}
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-widest px-2.5 py-1',
                            key.is_active
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                              : 'opacity-50'
                          )}
                        >
                          {key.is_active ? 'Active' : 'Revoked'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1 mb-6">
                      <h4 className="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {key.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-bold text-muted-foreground/60 font-mono bg-muted/20 px-1.5 py-0.5 rounded leading-none">
                          {key.prefix}••••••••
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground/40 hover:text-primary transition-colors"
                          onClick={() => {
                            toast.info('Full key hidden', {
                              description:
                                'API keys cannot be viewed after generation for security.',
                            })
                          }}
                        >
                          <ExternalLink size={10} />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-6 space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                          Last Activity
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              key.last_used_at
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : 'bg-muted-foreground/20'
                            )}
                          />
                          <span className="text-[11px] font-bold text-foreground/70">
                            {key.last_used_at
                              ? format(new Date(key.last_used_at), 'MMM d, HH:mm')
                              : 'Never used'}
                          </span>
                        </div>
                      </div>
                      {key.scopes && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                            Authorized Scopes
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.split(',').map((scope, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-muted/10 text-[8px] font-bold px-1.5 py-0 border-border/20 lowercase"
                              >
                                {scope.trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto space-y-3 pt-4 border-t border-border/10">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-muted-foreground/50">
                        <span>Issued On</span>
                        <span className="text-foreground/70 tabular-nums">
                          {format(new Date(key.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-muted-foreground/50">
                        <span>Expiration</span>
                        <span
                          className={cn(
                            'text-foreground/70 tabular-nums',
                            key.expires_at &&
                              isBefore(new Date(key.expires_at), new Date()) &&
                              'text-destructive'
                          )}
                        >
                          {key.expires_at
                            ? format(new Date(key.expires_at), 'MMM d, yyyy')
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
              <div className="relative h-20 w-20 glass-card rounded-3xl border-border/40 flex items-center justify-center shadow-xl">
                {searchQuery ? (
                  <Search className="h-10 w-10 text-muted-foreground/30" />
                ) : (
                  <Key className="h-10 w-10 text-muted-foreground/30" />
                )}
              </div>
            </motion.div>
            <h3 className="font-bold text-xl text-foreground">
              {searchQuery ? 'No matching keys found' : 'No identity keys yet'}
            </h3>
            <p className="text-sm mt-2 max-w-sm leading-relaxed text-muted-foreground font-medium">
              {searchQuery
                ? `We couldn't find any API keys matching "${searchQuery}". Try a different term.`
                : "You haven't generated any programmatic access keys yet. Generate one to get started."}
            </p>
            {!searchQuery && isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="mt-8 rounded-xl border-dashed border-border/60 bg-background/50 hover:border-primary/50 hover:bg-primary/5 px-6 gap-2 font-bold transition-all shadow-sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-4 w-4 text-primary" />
                Provision First Key
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={isRevokeAlertOpen} onOpenChange={setIsRevokeAlertOpen}>
        <AlertDialogContent className="rounded-[2.5rem] p-10 glass-panel border-destructive/20 border-2">
          <AlertDialogHeader className="space-y-4 text-center items-center">
            <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-2">
              <AlertCircle size={32} />
            </div>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight">
              Revoke Credential?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed opacity-70 px-4">
              Any applications or automated pipelines using this key will lose access immediately.
              This action cannot be reverted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:justify-center">
            <AlertDialogCancel
              onClick={() => setKeyToRevoke(null)}
              className="rounded-xl h-12 min-w-30 font-bold uppercase tracking-widest text-[10px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToRevoke && revokeMutation.mutate(keyToRevoke)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-12 min-w-30 font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-destructive/20"
            >
              Confirm Revocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
