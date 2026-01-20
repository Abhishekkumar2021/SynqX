import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPipelines, getConnections, getJobs } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Workflow,
  Network,
  Search,
  Zap,
  Moon,
  Sun,
  Home,
  LogOut,
  Hash,
  Book,
  Layout as LayoutIcon,
  ChevronRight,
  Command as CommandIcon,
  Database,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useZenMode } from '@/hooks/useZenMode'
import { useAuth } from '@/hooks/useAuth'
import { docsRegistry } from '@/lib/docs'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface GlobalCommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { setTheme, theme } = useTheme()
  const { toggleZenMode } = useZenMode()
  const { logout } = useAuth()

  // Queries
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
    enabled: isOpen,
  })
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: getConnections,
    enabled: isOpen,
  })
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => getJobs(5),
    enabled: isOpen,
  })

  const runCommand = (command: () => void) => {
    onClose()
    command()
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <div className="relative overflow-hidden">
        {/* Visual Background Accents */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary/40 to-transparent z-50" />

        <div className="relative z-10">
          <CommandInput
            placeholder="Search architecture, commands, or documentation..."
            className="h-16 text-lg border-none focus:ring-0 bg-transparent"
          />
        </div>

        <CommandList className="max-h-[480px] custom-scrollbar pb-4 relative z-10 bg-transparent">
          <CommandEmpty className="py-12 text-center flex flex-col items-center gap-4">
            <div className="p-4 rounded-3xl bg-muted/20 border border-border/40">
              <Search className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground/60 uppercase tracking-widest">
                No results discovered
              </p>
              <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                Try a different keyword or command
              </p>
            </div>
          </CommandEmpty>

          <CommandGroup
            heading="Navigation"
            className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-primary/60 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:mb-2"
          >
            <PaletteItem
              icon={<Home className="h-4 w-4" />}
              title="Command Center"
              subtitle="Overview & global metrics"
              onSelect={() => runCommand(() => navigate('/dashboard'))}
            />
            <PaletteItem
              icon={<Workflow className="h-4 w-4" />}
              title="Pipeline Registry"
              subtitle="Manage automated data flows"
              onSelect={() => runCommand(() => navigate('/pipelines'))}
            />
            <PaletteItem
              icon={<Network className="h-4 w-4" />}
              title="Data Connections"
              subtitle="Protocol & authentication vault"
              onSelect={() => runCommand(() => navigate('/connections'))}
            />
            <PaletteItem
              icon={<Search className="h-4 w-4" />}
              title="Omni Explorer"
              subtitle="Interactive data querying lab"
              onSelect={() => runCommand(() => navigate('/explorer'))}
            />
          </CommandGroup>

          <CommandSeparator className="bg-border/10 my-2 mx-4" />

          {pipelines && pipelines.length > 0 && (
            <CommandGroup
              heading="Recent Pipelines"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-amber-500/60 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:mb-2"
            >
              {pipelines.slice(0, 5).map((p) => (
                <PaletteItem
                  key={p.id}
                  icon={<Zap className="h-4 w-4 text-amber-500" />}
                  title={p.name}
                  subtitle={`Pipeline #${p.id} • ${p.status.toUpperCase()}`}
                  onSelect={() => runCommand(() => navigate(`/pipelines/${p.id}`))}
                />
              ))}
            </CommandGroup>
          )}

          {connections && connections.length > 0 && (
            <CommandGroup
              heading="Active Infrastructure"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-blue-500/60 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:mb-2"
            >
              {connections.slice(0, 5).map((c) => (
                <PaletteItem
                  key={c.id}
                  icon={<Database className="h-4 w-4 text-blue-500" />}
                  title={c.name}
                  subtitle={`${c.connector_type.toUpperCase()} Protocol`}
                  onSelect={() => runCommand(() => navigate(`/connections/${c.id}`))}
                />
              ))}
            </CommandGroup>
          )}

          {jobs && jobs.length > 0 && (
            <CommandGroup
              heading="Recent Executions"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:mb-2"
            >
              {jobs.map((j) => (
                <PaletteItem
                  key={j.id}
                  icon={<Hash className="h-4 w-4 opacity-40" />}
                  title={`Execution #${j.id}`}
                  subtitle={`Status: ${j.status.toUpperCase()}`}
                  badge={j.status}
                  onSelect={() => runCommand(() => navigate(`/jobs/${j.id}`))}
                />
              ))}
            </CommandGroup>
          )}

          <CommandGroup
            heading="Knowledge Base"
            className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-emerald-500/60 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:mb-2"
          >
            {docsRegistry.slice(0, 4).map((doc) => (
              <PaletteItem
                key={doc.href}
                icon={<Book className="h-4 w-4 text-emerald-500" />}
                title={doc.title}
                subtitle={doc.description}
                onSelect={() => runCommand(() => navigate(doc.href))}
              />
            ))}
          </CommandGroup>

          <CommandSeparator className="bg-border/10 my-2 mx-4" />

          <CommandGroup
            heading="System Engine"
            className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:mb-2"
          >
            <PaletteItem
              icon={<LayoutIcon className="h-4 w-4" />}
              title="Toggle Zen Mode"
              subtitle="Focus on core data architecture"
              shortcut="Z"
              onSelect={() => runCommand(() => toggleZenMode())}
            />
            <PaletteItem
              icon={
                theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-blue-500" />
                )
              }
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              subtitle="Calibrate visual experience"
              onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
            />
            <PaletteItem
              icon={<LogOut className="h-4 w-4" />}
              title="Secure Sign Out"
              subtitle="Terminate active session"
              className="text-destructive dark:text-red-400"
              onSelect={() => runCommand(() => logout())}
            />
          </CommandGroup>
        </CommandList>

        {/* Footer / Shortcut Bar */}
        <div className="border-t border-border/20 px-6 py-4 flex items-center justify-between bg-muted/10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              <kbd className="px-1.5 py-0.5 rounded-md border border-border/40 bg-background font-mono text-xs shadow-sm shadow-black/5">
                ↵
              </kbd>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              <kbd className="px-1.5 py-0.5 rounded-md border border-border/40 bg-background font-mono text-xs shadow-sm shadow-black/5">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60">
              Synqx Omni-Hub
            </span>
          </div>
        </div>
      </div>
    </CommandDialog>
  )
}

// --- Sub-component for clean item rendering ---
const PaletteItem = ({ icon, title, subtitle, badge, onSelect, className, shortcut }: any) => (
  <CommandItem
    onSelect={onSelect}
    className={cn(
      'flex items-center gap-4 px-4 py-3 rounded-xl mx-2 mb-1 cursor-pointer transition-all duration-200',
      'aria-selected:bg-primary/10 aria-selected:text-primary group',
      className
    )}
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 border border-border/40 group-aria-selected:bg-background group-aria-selected:border-primary/20 group-aria-selected:shadow-md transition-all">
      {icon}
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold tracking-tight">{title}</span>
        {badge && (
          <Badge
            variant="outline"
            className={cn(
              'text-[8px] font-bold uppercase tracking-tighter h-4 px-1 border-0',
              badge === 'success'
                ? 'bg-emerald-500/10 text-emerald-500'
                : badge === 'failed'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-amber-500/10 text-amber-500'
            )}
          >
            {badge}
          </Badge>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-60 font-medium">
        {subtitle}
      </span>
    </div>
    {shortcut && (
      <div className="hidden group-aria-selected:flex items-center gap-1 opacity-40">
        <CommandIcon size={10} />
        <span className="text-[10px] font-bold uppercase">{shortcut}</span>
      </div>
    )}
    <ChevronRight className="h-4 w-4 opacity-0 group-aria-selected:opacity-40 transition-all -translate-x-2 group-aria-selected:translate-x-0" />
  </CommandItem>
)
