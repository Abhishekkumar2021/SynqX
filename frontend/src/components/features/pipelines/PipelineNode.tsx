import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  ArrowRightLeft,
  HardDriveUpload,
  Server,
  Settings2,
  Loader2,
  Layers,
  ShieldCheck,
  Zap,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ZoomIn,
  MoreVertical,
  Copy,
  Trash,
  BoxSelect,
  GitCommit,
  Workflow,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatNumber } from '@/lib/utils'
import { type AppNode } from '@/types/pipeline'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// --- Visual Mapping ---
const NODE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string; bgGradient: string }
> = {
  source: {
    icon: Database,
    color: 'text-indigo-500',
    label: 'Source',
    bgGradient: 'from-indigo-500/5 to-indigo-500/10',
  },
  transform: {
    icon: ArrowRightLeft,
    color: 'text-blue-500',
    label: 'Transform',
    bgGradient: 'from-blue-500/5 to-blue-500/10',
  },
  join: {
    icon: GitCommit,
    color: 'text-violet-500',
    label: 'Join',
    bgGradient: 'from-violet-500/5 to-violet-500/10',
  },
  validate: {
    icon: ShieldCheck,
    color: 'text-emerald-500',
    label: 'Validate',
    bgGradient: 'from-emerald-500/5 to-emerald-500/10',
  },
  sink: {
    icon: HardDriveUpload,
    color: 'text-rose-500',
    label: 'Destination',
    bgGradient: 'from-rose-500/5 to-rose-500/10',
  },
  destination: {
    icon: HardDriveUpload,
    color: 'text-rose-500',
    label: 'Destination',
    bgGradient: 'from-rose-500/5 to-rose-500/10',
  },
  api: {
    icon: Server,
    color: 'text-cyan-500',
    label: 'API',
    bgGradient: 'from-cyan-500/5 to-cyan-500/10',
  },
  operator: {
    icon: Cpu,
    color: 'text-amber-500',
    label: 'Operator',
    bgGradient: 'from-amber-500/5 to-amber-500/10',
  },
  default: {
    icon: Workflow,
    color: 'text-primary',
    label: 'Node',
    bgGradient: 'from-primary/5 to-primary/10',
  },
}

const PipelineNode = ({ id, data, selected }: NodeProps<AppNode>) => {
  const navigate = useNavigate()
  const nodeData = data
  // Handle both 'type' and 'operator_type' for compatibility
  const rawType = nodeData.type || 'default'
  const type = rawType.toLowerCase()

  const config = NODE_CONFIG[type] || NODE_CONFIG.default
  const Icon = config.icon
  const isReadOnly = nodeData.readOnly || false

  const status = nodeData.status || 'idle'
  const isRunning = status === 'running'
  const isError = ['failed', 'error'].includes(status)
  const isSuccess = ['success', 'completed'].includes(status)

  const diffStatus = nodeData.diffStatus || 'none'
  const isAdded = diffStatus === 'added'
  const isRemoved = diffStatus === 'removed'
  const isModified = diffStatus === 'modified'

  return (
    <div
      className={cn(
        'group relative flex flex-col w-[320px] rounded-[1.75rem] transition-all duration-300 ease-out border',
        'bg-card/95 backdrop-blur-xl text-card-foreground shadow-sm hover:shadow-xl',
        // Selection State
        selected
          ? 'ring-2 ring-primary/60 border-primary/60 scale-[1.01] z-50 shadow-2xl shadow-primary/10'
          : 'border-border/60 hover:border-border-strong',
        // Running State
        isRunning && 'ring-2 ring-primary border-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]',
        // Error State
        isError && 'ring-2 ring-destructive border-destructive shadow-[0_0_30px_-5px_rgba(var(--destructive),0.3)]',
        // Success State
        isSuccess && 'border-emerald-500/50',
        // Diff States
        isAdded && 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5',
        isRemoved && 'opacity-60 grayscale border-dashed border-destructive',
        isModified && 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/5'
      )}
    >
      {/* Status Line Indicator (Top) */}
      <div
        className={cn(
          'absolute top-0 left-1/2 -translate-x-1/2 h-1 w-24 rounded-b-full transition-all duration-500',
          isRunning ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-transparent',
          isError && 'bg-destructive shadow-[0_0_10px_rgba(var(--destructive),0.5)]',
          isSuccess && 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
        )}
      />

      {/* --- Header Section --- */}
      <div className={cn('p-5 pb-5 rounded-t-[1.75rem] relative overflow-hidden')}>
        {/* Ambient Background Gradient */}
        <div
          className={cn(
            'absolute inset-0 bg-linear-to-b opacity-100 transition-colors duration-500 pointer-events-none',
            config.bgGradient,
            isError && 'from-destructive/10 to-destructive/20',
            isSuccess && 'from-emerald-500/10 to-emerald-500/20'
          )}
        />

        <div className="relative flex items-start gap-4 z-10">
          {/* Icon Box */}
          <div className="relative shrink-0">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 shadow-sm',
                'bg-background border-border/50',
                isRunning && 'border-primary text-primary shadow-primary/20',
                isError && 'border-destructive text-destructive shadow-destructive/20',
                !isRunning && !isError && config.color
              )}
            >
              {isRunning ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Icon className="h-6 w-6" />
              )}
            </div>

            {/* Status Badge Overlays */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-card shadow-md z-20"
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </motion.div>
              )}
              {isError && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -bottom-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center ring-2 ring-card shadow-md z-20"
                >
                  <AlertCircle className="h-3 w-3 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Titles & Labels */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-[0.2em] opacity-70',
                  config.color
                )}
              >
                {config.label}
              </span>
              
              {/* Options Menu */}
              <div className="flex items-center -mr-2">
                {nodeData.sub_pipeline_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/pipelines/${nodeData.sub_pipeline_id}`)
                    }}
                    title="Zoom into Sub-Pipeline"
                  >
                    <ZoomIn size={12} />
                  </Button>
                )}
                {!isReadOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-xl bg-background/95 backdrop-blur-xl border-border/50 shadow-xl p-1"
                    >
                      <DropdownMenuItem
                        className="text-xs font-medium py-2 rounded-lg cursor-pointer gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (nodeData.onSettings) nodeData.onSettings(id)
                        }}
                      >
                        <Settings2 size={14} className="opacity-70" /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs font-medium py-2 rounded-lg cursor-pointer gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (nodeData.onDuplicate) nodeData.onDuplicate(id)
                        }}
                      >
                        <Copy size={14} className="opacity-70" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/30 m-1" />
                      <DropdownMenuItem
                        className="text-xs font-medium py-2 rounded-lg cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (nodeData.onDelete) nodeData.onDelete(id)
                        }}
                      >
                        <Trash size={14} className="opacity-70" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            
            <h3 className="font-bold text-sm leading-snug text-foreground/90 line-clamp-2" title={nodeData.label}>
              {nodeData.label}
            </h3>
          </div>
        </div>
      </div>

      <div className="px-5">
        <div className="h-px w-full bg-linear-to-r from-transparent via-border/40 to-transparent" />
      </div>

      {/* --- Metrics & Status Body --- */}
      <div className="px-5 pt-5 pb-6 space-y-5 flex flex-col h-full justify-end">
        {/* Only show metrics grid if there is data or actively running */}
        {(isRunning || (nodeData.rowsProcessed && nodeData.rowsProcessed > 0) || (nodeData.throughput && nodeData.throughput > 0)) && (
          <div className="grid grid-cols-2 gap-3">
            {/* Throughput Metric */}
            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors">
              <div className="flex items-center gap-1.5 text-muted-foreground/70">
                <Activity size={10} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Speed</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatNumber(nodeData.throughput || 0)}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground/50">r/s</span>
              </div>
            </div>

            {/* Volume Metric */}
            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors">
              <div className="flex items-center gap-1.5 text-muted-foreground/70">
                <Layers size={10} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatNumber(nodeData.rowsProcessed || 0)}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground/50">rows</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Strip & Duration */}
        <div className={cn(
          "flex items-center justify-between py-2.5 px-3.5 rounded-xl border text-xs font-medium transition-colors mt-auto",
          isRunning ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted/30 border-border/40 text-muted-foreground",
          isSuccess && "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          isError && "bg-destructive/5 border-destructive/20 text-destructive"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-current animate-pulse shadow-sm" : "bg-current opacity-40"
            )} />
            <span className="uppercase tracking-widest text-[10px] font-bold">
               {isRunning ? 'Running...' : status || 'Idle'}
            </span>
          </div>

          {(nodeData.duration && nodeData.duration > 0) && (
             <div className="flex items-center gap-1.5 opacity-80 bg-background/50 px-2 py-0.5 rounded-md shadow-sm">
               <Clock size={10} />
               <span className="tabular-nums font-mono text-[10px]">{(nodeData.duration / 1000).toFixed(1)}s</span>
             </div>
          )}
        </div>

        {/* Error Display */}
        {isError && nodeData.error && (
           <div className="group/error relative overflow-hidden rounded-xl bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors">
              <div className="p-3.5">
                 <div className="flex items-center gap-2 text-destructive mb-2">
                    <Zap size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Error Trace</span>
                 </div>
                 <p className="text-[10px] text-destructive/90 font-mono leading-relaxed line-clamp-3 group-hover/error:line-clamp-none transition-all break-all">
                    {nodeData.error}
                 </p>
              </div>
           </div>
        )}
      </div>

      {/* --- Connectors --- */}
      {/* Target (Left) */}
      {!['source'].includes(type) && (
        <Handle
          type="target"
          position={Position.Left}
          className={cn(
            "!w-3 !h-6 !rounded-r-md !rounded-l-none !bg-border !border-0 !-left-3",
            "transition-all duration-300 hover:!bg-primary hover:!w-4 hover:!shadow-lg hover:!shadow-primary/30",
            "after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-1 after:bg-background"
          )}
        />
      )}

      {/* Source (Right) */}
      {!['sink', 'destination'].includes(type) && (
        <Handle
          type="source"
          position={Position.Right}
          className={cn(
             "!w-3 !h-6 !rounded-l-md !rounded-r-none !bg-border !border-0 !-right-3",
             "transition-all duration-300 hover:!bg-primary hover:!w-4 hover:!shadow-lg hover:!shadow-primary/30",
             "before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-background"
          )}
        />
      )}
    </div>
  )
}

export default memo(PipelineNode)