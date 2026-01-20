/* eslint-disable react-hooks/set-state-in-effect */
 
import React, { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateWorkspace, getAgents } from '@/lib/api'
import { Settings2, Globe, Info, CheckCircle2, RefreshCw, Copy, Laptop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { CodeBlock } from '@/components/ui/docs/CodeBlock'

interface WorkspaceSettingsFormProps {
  activeWorkspace: any
  isAdmin: boolean
  queryClient: any
}

export const WorkspaceSettingsForm: React.FC<WorkspaceSettingsFormProps> = ({
  activeWorkspace,
  isAdmin,
  queryClient,
}) => {
  const [wsName, setWsName] = useState(activeWorkspace?.name || '')
  const [wsDesc, setWsDesc] = useState(activeWorkspace?.description || '')
  const [agentGroup, setAgentGroup] = useState(activeWorkspace?.default_agent_group || '')

  // Fetch agents to get unique groups
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  })

  const agentGroups = useMemo(() => {
    const groups = new Set<string>()
    if (agents && Array.isArray(agents)) {
      agents.forEach((a: any) => {
        if (a.tags) {
          if (Array.isArray(a.tags.groups)) {
            a.tags.groups.forEach((g: string) => {
              if (g.toLowerCase() !== 'internal') groups.add(String(g))
            })
          } else if (Array.isArray(a.tags)) {
            a.tags.forEach((g: any) => {
              if (String(g).toLowerCase() !== 'internal') groups.add(String(g))
            })
          } else if (typeof a.tags === 'object' && typeof a.tags.groups === 'string') {
            if (a.tags.groups.toLowerCase() !== 'internal') groups.add(a.tags.groups)
          }
        }
      })
    }
    return Array.from(groups).sort()
  }, [agents])

  useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name)
      setWsDesc(activeWorkspace.description || '')
      setAgentGroup(activeWorkspace.default_agent_group || 'internal')
    }
  }, [activeWorkspace])

  const updateWsMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string; default_agent_group?: string }) =>
      updateWorkspace(activeWorkspace!.id, data),
    onSuccess: () => {
      toast.success('Workspace Identity Updated')
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
    onError: (err: any) => {
      toast.error('Failed to update workspace', { description: err.response?.data?.detail })
    },
  })

  const hasChanges =
    wsName !== activeWorkspace?.name ||
    wsDesc !== (activeWorkspace?.description || '') ||
    agentGroup !== (activeWorkspace?.default_agent_group || 'internal')

  const handleReset = () => {
    setWsName(activeWorkspace?.name || '')
    setWsDesc(activeWorkspace?.description || '')
    setAgentGroup(activeWorkspace?.default_agent_group || 'internal')
  }

  const handleSave = () => {
    updateWsMutation.mutate({
      name: wsName,
      description: wsDesc,
      default_agent_group: agentGroup,
    })
  }

  return (
    <div className="lg:col-span-3 flex flex-col rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />

      <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Workspace Configuration
            </h3>
            <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase opacity-70">
              TECHNICAL SPECIFICATIONS • ID: {activeWorkspace?.id}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="bg-primary/5 text-primary border-primary/20 tracking-widest px-2.5 py-0.5 font-bold rounded-lg text-[8px] uppercase"
        >
          {activeWorkspace?.role} Permissions
        </Badge>
      </div>

      <div className="p-8 space-y-10">
        {/* Identity Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
            <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-primary/80 flex items-center gap-2 whitespace-nowrap">
              <Globe className="h-2.5 w-2.5" /> Identity & Branding
            </h4>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                Workspace Name
              </Label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                className="h-11 bg-muted/20 border-border/40 rounded-xl font-bold text-base focus-visible:bg-background/80 transition-all px-5 shadow-sm focus-visible:ring-primary/20 text-foreground"
                placeholder="e.g. Analytics Production"
                readOnly={!isAdmin}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
                Resource Slug
              </Label>
              <div className="h-11 flex items-center px-5 rounded-xl border border-border/40 bg-muted/5 backdrop-blur-sm cursor-not-allowed group/slug relative">
                <code className="text-xs font-mono font-bold text-primary/60 tracking-wider">
                  {activeWorkspace?.slug}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-auto opacity-0 group-hover/slug:opacity-100 transition-opacity text-primary hover:bg-primary/10 rounded-lg"
                  onClick={() => {
                    navigator.clipboard.writeText(activeWorkspace?.slug || '')
                    toast.success('Slug copied to clipboard')
                  }}
                >
                  <Copy size={12} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Configuration */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
            <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-500/80 flex items-center gap-2 whitespace-nowrap">
              <RefreshCw className="h-2.5 w-2.5" /> Agent Routing
            </h4>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
          </div>

          <div className="space-y-2.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Default Agent Group
            </Label>

            <Select
              disabled={!isAdmin}
              value={agentGroup || 'internal'}
              onValueChange={(val) => setAgentGroup(val)}
            >
              <SelectTrigger className="h-11 bg-muted/20 border-border/40 rounded-xl font-semibold text-sm focus:ring-primary/20 transition-all px-5 shadow-sm text-foreground">
                <SelectValue placeholder="Select execution target..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 glass-panel shadow-2xl">
                <SelectItem value="internal" className="text-xs font-bold py-2.5 group">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <RefreshCw size={12} />
                    </div>
                    <span>Internal Cloud Worker</span>
                  </div>
                </SelectItem>
                {agentGroups.map((group) => (
                  <SelectItem key={group} value={group} className="text-xs font-bold py-2.5 group">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center">
                        <Laptop size={12} />
                      </div>
                      <span>Remote Agent: {group}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-[10px] text-muted-foreground px-1 font-medium  opacity-70">
              Setting a default group routes all operations in this workspace to your private
              agents.
            </p>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
            <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-500/80 flex items-center gap-2 whitespace-nowrap">
              <Info className="h-2.5 w-2.5" /> Governance & Purpose
            </h4>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-border/40 to-transparent" />
          </div>

          <div className="space-y-2.5">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">
              Mission Statement & Description
            </Label>
            <div className="relative group min-h-[120px]">
              <CodeBlock
                code={wsDesc}
                onChange={isAdmin ? setWsDesc : undefined}
                language="text"
                editable={isAdmin}
                rounded
                maxHeight="200px"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="p-4 bg-muted/5 border-t border-border/20 flex justify-end gap-3 relative z-10">
          <Button
            variant="ghost"
            className="rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[9px] hover:bg-muted/50 transition-all"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Discard
          </Button>
          <Button
            className="rounded-xl h-11 px-10 font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all gap-2 bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={updateWsMutation.isPending || !hasChanges}
          >
            {updateWsMutation.isPending ? (
              <RefreshCw className="animate-spin h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Apply Changes
          </Button>
        </div>
      )}
    </div>
  )
}
