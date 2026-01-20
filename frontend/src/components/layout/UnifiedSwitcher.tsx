import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronsUpDown,
  Check,
  PlusCircle,
  Building2,
  Settings2,
  Loader2,
  Search,
  Laptop,
  Box,
  Cpu,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkspace } from '@/hooks/useWorkspace'
import { getAgents, updateWorkspace } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog'

export const UnifiedSwitcher: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    workspaces,
    activeWorkspace,
    switchActiveWorkspace,
    isSwitching,
    isLoading: loadingWs,
  } = useWorkspace()

  const [activeTab, setActiveTab] = useState<'workspace' | 'execution'>('workspace')
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  })

  const updateRoutingMutation = useMutation({
    mutationFn: (group: string) =>
      updateWorkspace(activeWorkspace!.id, {
        default_agent_group: group,
        clear_all_pipelines: group === 'internal',
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      toast.success(
        variables === 'internal'
          ? 'Reverted to Internal Cloud Mode'
          : `Execution routed to ${variables}`
      )
    },
  })

  const agentGroups = useMemo(() => {
    if (!agents || !Array.isArray(agents)) return []
    const groups = new Set<string>()
    agents.forEach((a: any) => {
      const tags = a.tags
      if (!tags) return

      const groupList = Array.isArray(tags.groups) ? tags.groups : Array.isArray(tags) ? tags : []
      groupList.forEach((g: any) => {
        const groupName = String(g)
        if (groupName !== 'internal') groups.add(groupName)
      })
    })
    return Array.from(groups).sort()
  }, [agents])

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(search.toLowerCase()))
  }, [workspaces, search])

  if (!activeWorkspace) return null

  const currentAgentGroup = activeWorkspace.default_agent_group || 'internal'
  const isInternal = currentAgentGroup === 'internal'

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-3 px-4 h-11 rounded-xl transition-all duration-300 outline-none group border border-border/40 bg-muted/20 hover:bg-muted/30 hover:border-primary/30 shadow-xs',
              !isInternal && 'ring-1 ring-emerald-500/20 border-emerald-500/30 bg-emerald-500/5'
            )}
          >
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg h-7 w-7 border shadow-inner transition-all duration-500',
                !isInternal
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              )}
            >
              {isSwitching || loadingWs || updateRoutingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isInternal ? (
                <Zap className="h-4 w-4 fill-emerald-500/20" />
              ) : (
                <Building2 className="h-4 w-4 fill-primary/20" />
              )}
            </div>

            <div className="flex flex-col items-start min-w-[120px] max-w-[180px] overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground truncate w-full leading-tight">
                {activeWorkspace.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className={cn(
                    'h-1 w-1 rounded-full',
                    !isInternal ? 'bg-emerald-500 animate-pulse' : 'bg-primary/60'
                  )}
                />
                <span
                  className={cn(
                    'text-[9px] font-bold uppercase tracking-tight',
                    !isInternal
                      ? 'text-emerald-600/80 dark:text-emerald-400/80'
                      : 'text-muted-foreground/50'
                  )}
                >
                  {!isInternal ? currentAgentGroup : 'Internal Cloud'}
                </span>
              </div>
            </div>

            <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
          </motion.button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={12}
          className="w-[320px] p-0 rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <div className="p-4 pb-2 bg-muted/20">
              <TabsList className="w-full h-9 bg-background/50 border border-border/40 p-1 rounded-xl">
                <TabsTrigger
                  value="workspace"
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Building2 className="h-3 w-3" /> Environments
                </TabsTrigger>
                <TabsTrigger
                  value="execution"
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Cpu className="h-3 w-3" /> Routing
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-100 overflow-y-auto custom-scrollbar">
              <TabsContent
                value="workspace"
                className="m-0 focus-visible:outline-none outline-none"
              >
                <div className="p-3 space-y-1">
                  <div className="px-1 pb-2">
                    <div className="relative group">
                      <Search className="z-20 absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Search environments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-9"
                      />
                    </div>
                  </div>

                  {filteredWorkspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-xl cursor-pointer group transition-all relative overflow-hidden mb-1',
                        activeWorkspace.id === ws.id
                          ? 'bg-primary/5 border border-primary/10'
                          : 'hover:bg-muted/50 border border-transparent'
                      )}
                      onClick={() => switchActiveWorkspace(ws.id)}
                    >
                      <div
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center border transition-all shrink-0',
                          activeWorkspace.id === ws.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/50 border-border/40 group-hover:bg-background'
                        )}
                      >
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-bold tracking-tight truncate leading-none mb-1">
                          {ws.name}
                        </span>
                        <span className="text-[9px] opacity-40 uppercase font-black tracking-widest leading-none">
                          {ws.role}
                        </span>
                      </div>
                      {activeWorkspace.id === ws.id && (
                        <div className="absolute right-3">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="execution"
                className="m-0 focus-visible:outline-none outline-none"
              >
                <div className="p-3 space-y-2">
                  <div className="px-2 py-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                      Select Target Agent Group
                    </span>
                  </div>

                  <DropdownMenuItem
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-xl cursor-pointer group transition-all border relative overflow-hidden',
                      isInternal
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'hover:bg-muted/50 border-transparent'
                    )}
                    onClick={() => updateRoutingMutation.mutate('internal')}
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center border transition-all shrink-0',
                        isInternal
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 border-border/40 group-hover:bg-background'
                      )}
                    >
                      <Box className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold tracking-tight mb-1 leading-none">
                        Native Cloud
                      </span>
                      <span className="text-[9px] opacity-40 font-black uppercase tracking-widest leading-none">
                        Internal Managed
                      </span>
                    </div>
                    {isInternal && <Check className="h-4 w-4 ml-auto text-primary" />}
                  </DropdownMenuItem>

                  {agentGroups.map((group) => (
                    <DropdownMenuItem
                      key={group}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-xl cursor-pointer group transition-all border relative overflow-hidden',
                        currentAgentGroup === group
                          ? 'bg-emerald-500/5 border-emerald-500/20 shadow-sm'
                          : 'hover:bg-muted/50 border-transparent'
                      )}
                      onClick={() => updateRoutingMutation.mutate(group)}
                    >
                      <div
                        className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center border transition-all shrink-0',
                          currentAgentGroup === group
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                            : 'bg-muted/50 border-border/40 group-hover:bg-background'
                        )}
                      >
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-tight mb-1 leading-none">
                          {group}
                        </span>
                        <span className="text-[9px] opacity-40 font-black uppercase tracking-widest leading-none">
                          Secure Remote
                        </span>
                      </div>
                      {currentAgentGroup === group && (
                        <Check className="h-4 w-4 ml-auto text-emerald-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DropdownMenuSeparator className="bg-border/20" />

          <div className="p-3 grid grid-cols-2 gap-2 bg-muted/10">
            <DropdownMenuItem
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-emerald-500/5 hover:text-emerald-600 transition-all group border border-transparent hover:border-emerald-500/10 cursor-pointer focus:bg-emerald-500/5"
              onClick={() => setCreateWsOpen(true)}
            >
              <PlusCircle
                size={18}
                className="text-emerald-500/60 group-hover:text-emerald-600 transition-colors"
              />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40 group-hover:opacity-100 transition-opacity">
                Provision
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary/5 hover:text-primary transition-all group border border-transparent hover:border-primary/10 cursor-pointer focus:bg-primary/5"
              onClick={() => navigate('/settings?tab=workspace')}
            >
              <Settings2
                size={18}
                className="text-primary/60 group-hover:text-primary transition-colors"
              />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40 group-hover:opacity-100 transition-opacity">
                Settings
              </span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={createWsOpen} onOpenChange={setCreateWsOpen} />
    </div>
  )
}
