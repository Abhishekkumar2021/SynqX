import { type Node } from '@xyflow/react'

export interface PipelineNodeData {
  label: string
  type: string
  operator_class: string
  config: Record<string, any>
  status: 'idle' | 'pending' | 'running' | 'success' | 'failed' | 'warning'
  error?: string
  duration?: number
  rowsProcessed?: number
  throughput?: number
  source_asset_id?: number
  destination_asset_id?: number
  connection_id?: number

  // Orchestration & Strategy
  write_strategy?: string
  schema_evolution_policy?: string
  is_dynamic?: boolean
  mapping_expr?: string
  sub_pipeline_id?: number
  worker_tag?: string

  // Retry logic
  max_retries?: number
  retry_strategy?: string
  retry_delay_seconds?: number
  timeout_seconds?: number

  diffStatus?: 'added' | 'removed' | 'modified' | 'none'
  diffInfo?: any
  guardrails?: any[]
  data_contract?: any
  quarantine_asset_id?: number
  sync_mode?: string
  cdc_config?: Record<string, any>
  watermark_column?: string
  onSettings?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  [key: string]: any
}

export type AppNode = Node<PipelineNodeData>
