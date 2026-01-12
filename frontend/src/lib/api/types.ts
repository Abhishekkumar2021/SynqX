/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ConnectorType,
  PipelineStatus,
  JobStatus,
  JobType,
  RetryStrategy,
  OperatorType,
  AuditEvent,
} from "../enums";

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  active_workspace_id?: number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface WorkspaceRead {
  id: number;
  name: string;
  slug: string;
  description?: string;
  default_agent_group?: string;
  is_remote_group: boolean;
  git_config?: Record<string, any>;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  user_id: number;
  email: string;
  full_name?: string;
  role: string;
  joined_at: string;
}

export interface Connection {
  id: number;
  name: string;
  connector_type: ConnectorType;
  description?: string;
  config_schema?: Record<string, any>;
  health_status: string;
  last_test_at?: string;
  last_schema_discovery_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  asset_count?: number;
  max_concurrent_connections: number;
  connection_timeout_seconds: number;
  tags: Record<string, any>;
}

export interface ConnectionCreate {
  name: string;
  config: Record<string, any>;
  connector_type: ConnectorType;
  description?: string;
  tags?: Record<string, any>;
  max_concurrent_connections?: number;
  connection_timeout_seconds?: number;
}

export interface ConnectionUpdate {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  tags?: Record<string, any>;
  max_concurrent_connections?: number;
  connection_timeout_seconds?: number;
}

export interface EphemeralJobResponse {
  id: number;
  workspace_id: number;
  user_id?: number;
  job_type: JobType;
  status: JobStatus;
  payload: any;
  agent_group?: string;
  worker_id?: string;
  result_summary?: {
    count: number;
    total_count?: number;
    columns: string[];
  };
  result_sample?: {
    rows: any[];
  };
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  execution_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  schedule_cron?: string;
  schedule_enabled: boolean;
  schedule_timezone: string;
  status: PipelineStatus;
  current_version?: number;
  published_version_id?: number;
  max_parallel_runs: number;
  max_retries: number;
  retry_strategy: RetryStrategy;
  retry_delay_seconds: number;
  execution_timeout_seconds?: number;
  agent_group?: string;
  is_remote_group: boolean;
  tags: Record<string, any>;
  priority: number;
  sla_config?: Record<string, any>;
  upstream_pipeline_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface PipelineVersionCreate {
  config_snapshot?: Record<string, any>;
  change_summary?: Record<string, any>;
  version_notes?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface PipelineCreate {
  name: string;
  description?: string;
  schedule_cron?: string;
  schedule_enabled?: boolean;
  schedule_timezone?: string;
  max_parallel_runs?: number;
  max_retries?: number;
  retry_strategy?: RetryStrategy;
  retry_delay_seconds?: number;
  execution_timeout_seconds?: number;
  agent_group?: string;
  tags?: Record<string, any>;
  initial_version?: PipelineVersionCreate;
}

export interface PipelineUpdate {
  name?: string;
  description?: string;
  schedule_cron?: string;
  schedule_enabled?: boolean;
  schedule_timezone?: string;
  status?: PipelineStatus;
  max_parallel_runs?: number;
  max_retries?: number;
  retry_strategy?: RetryStrategy;
  retry_delay_seconds?: number;
  execution_timeout_seconds?: number;
  agent_group?: string;
  tags?: Record<string, any>;
  priority?: number;
}

export interface Job {
  id: number;
  pipeline_id: number;
  pipeline_version_id: number;
  status: JobStatus;
  retry_count: number;
  max_retries: number;
  retry_strategy: RetryStrategy;
  retry_delay_seconds: number;
  infra_error?: string;
  worker_id?: string;
  queue_name?: string;
  is_backfill: boolean;
  backfill_config: Record<string, any>;
  execution_time_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  celery_task_id?: string;
  correlation_id: string;
}

export interface StepRunRead {
  id: number;
  pipeline_run_id: number;
  node_id: number;
  operator_type: OperatorType | string;
  status: "pending" | "running" | "success" | "failed" | "skipped" | "warning";
  order_index: number;
  retry_count: number;
  records_in: number;
  records_out: number;
  records_filtered: number;
  records_error: number;
  bytes_processed: number;
  duration_seconds?: number;
  cpu_percent?: number;
  memory_mb?: number;
  sample_data?: any;
  error_message?: string;
  error_type?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  source_asset_id?: number;
  destination_asset_id?: number;
}

export interface PipelineRunRead {
  id: number;
  job_id: number;
  pipeline_id: number;
  pipeline_version_id: number;
  run_number: number;
  status: string;
  total_nodes: number;
  total_extracted: number;
  total_loaded: number;
  total_failed: number;
  bytes_processed: number;
  error_message?: string;
  failed_step_id?: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface PipelineRunContextRead {
  context: Record<string, any>;
  parameters: Record<string, any>;
  environment: Record<string, any>;
}

export interface PipelineRunDetailRead extends PipelineRunRead {
  version?: PipelineVersionRead;
  step_runs: StepRunRead[];
  context?: PipelineRunContextRead;
}

export interface PipelineVersionRead {
  id: number;
  pipeline_id: number;
  version: number;
  is_published: boolean;
  published_at?: string;
  config_snapshot: Record<string, any>;
  change_summary?: Record<string, any>;
  version_notes?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  created_at: string;
  updated_at: string;
}

export interface PipelineNode {
  id?: number;
  node_id: string;
  name: string;
  description?: string;
  operator_type: OperatorType | string;
  operator_class: string;
  config: Record<string, any>;
  order_index: number;
  source_asset_id?: number;
  destination_asset_id?: number;
  connection_id?: number;
  max_retries: number;
  retry_strategy?: RetryStrategy;
  retry_delay_seconds?: number;
  timeout_seconds?: number;
  position?: { x: number; y: number };
}

export interface PipelineEdge {
  id?: number;
  from_node_id: string;
  to_node_id: string;
  edge_type: string;
}

export interface Asset {
  id: number;
  connection_id: number;
  name: string;
  asset_type: string;
  fully_qualified_name?: string;
  is_source: boolean;
  is_destination: boolean;
  is_incremental_capable: boolean;
  schema_metadata?: any;
  current_schema_version?: number;
  description?: string;
  config?: Record<string, any>;
  tags: Record<string, any>;
  row_count_estimate?: number;
  size_bytes_estimate?: number;
  updated_at: string;
  created_at: string;
}

export interface AssetCreate {
  name: string;
  asset_type: string;
  connection_id: number;
  schema_metadata?: Record<string, any>;
  description?: string;
  is_source?: boolean;
  is_destination?: boolean;
  is_incremental_capable?: boolean;
  config?: Record<string, any>;
  tags?: Record<string, any>;
  fully_qualified_name?: string;
  row_count_estimate?: number;
  size_bytes_estimate?: number;
}

export interface AssetUpdate {
  name?: string;
  description?: string;
  asset_type?: string;
  fully_qualified_name?: string;
  is_source?: boolean;
  is_destination?: boolean;
  is_incremental_capable?: boolean;
  config?: Record<string, any>;
  tags?: Record<string, any>;
  schema_metadata?: Record<string, any>;
}

export interface SchemaVersion {
  id: number;
  asset_id: number;
  version: number;
  json_schema: any;
  discovered_at: string;
  is_breaking_change: boolean;
}

export interface Alert {
  id: number;
  alert_config_id?: number;
  pipeline_id?: number;
  job_id?: number;
  message: string;
  level: string;
  status: string;
  delivery_method: string;
  recipient: string;
  sent_at?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface AlertConfig {
  id: number;
  name: string;
  description?: string;
  alert_type: string;
  delivery_method: string;
  recipient: string;
  enabled: boolean;
  threshold_value: number;
  threshold_window_minutes: number;
  cooldown_minutes: number;
  pipeline_filter?: Record<string, any>;
  severity_filter?: Record<string, any>;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertConfigUpdate {
  name?: string;
  description?: string;
  alert_type?: string;
  delivery_method?: string;
  recipient?: string;
  enabled?: boolean;
  threshold_value?: number;
  threshold_window_minutes?: number;
  cooldown_minutes?: number;
  pipeline_filter?: Record<string, any>;
  severity_filter?: Record<string, any>;
}

export interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  scopes?: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
}

export interface ApiKeyCreate {
  name: string;
  expires_in_days?: number;
  scopes?: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface ConnectionListResponse {
  connections: Connection[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  details?: Record<string, any>;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  limit: number;
  offset: number;
}

export interface AssetBulkCreate {
  assets: AssetCreate[];
}

export interface AssetBulkCreateResponse {
  successful_creates: number;
  failed_creates: number;
  total_requested: number;
  failures: any[];
}

export interface SchemaDiscoveryResponse {
  success: boolean;
  schema_version?: number;
  is_breaking_change: boolean;
  message: string;
  discovered_schema?: Record<string, any>;
}

export interface AssetSampleData {
  asset_id: number;
  count: number;
  rows: Record<string, any>[];
}

export interface ConnectionImpact {
  pipeline_count: number;
}

export interface ConnectionUsageStats {
  sync_success_rate: number;
  average_latency_ms?: number;
  data_extracted_gb_24h?: number;
  last_24h_runs: number;
  last_7d_runs: number;
}

export interface ConnectionEnvironmentInfo {
  python_version?: string;
  platform?: string;
  pandas_version?: string;
  numpy_version?: string;
  base_path?: string;
  available_tools: Record<string, string>;
  installed_packages: Record<string, string>;
  node_version?: string;
  npm_packages: Record<string, string>;
  initialized_languages: string[];
  details?: Record<string, any>;
}

export interface QueryResponse {
  results: Record<string, any>[];
  count: number;
  total_count?: number;
  columns: string[];
}

export interface ConnectionSchemaMetadata {
  connector_type: string;
  metadata: Record<string, string[]>;
}

export interface HistoryItem {
  id: number;
  query: string;
  status: string;
  execution_time_ms: number;
  row_count?: number;
  created_at: string;
  connection_name: string;
  created_by?: string;
}

export interface ThroughputDataPoint {
  timestamp: string;
  success_count: number;
  failure_count: number;
  rows_processed: number;
  bytes_processed: number;
}

export interface PipelineDistribution {
  status: string;
  count: number;
}

export interface RecentActivity {
  id: number;
  pipeline_id: number;
  pipeline_name: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  user_avatar?: string;
}

export interface SystemHealth {
  cpu_percent: number;
  memory_usage_mb: number;
  active_workers: number;
}

export interface FailingPipeline {
  id: number;
  name: string;
  failure_count: number;
}

export interface SlowestPipeline {
  id: number;
  name: string;
  avg_duration: number;
}

export interface QualityTrendDataPoint {
  timestamp: string;
  valid_rows: number;
  failed_rows: number;
  compliance_score: number;
}

export interface QualityViolation {
  rule_type: string;
  column_name: string;
  count: number;
}

export interface DashboardAlert {
  id: number;
  message: string;
  level: string;
  created_at: string;
  pipeline_id?: number;
}
export interface AuditLog {
  id: number;
  workspace_id: number;
  user_id: number;
  event_type: AuditEvent | string;
  target_type?: string;
  target_id?: number;
  details?: Record<string, any>;
  status: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ConnectorHealth {
  status: string;
  count: number;
}

export interface AgentGroupStats {
  name: string;
  count: number;
  status: string;
}

export interface DashboardStats {
  total_pipelines: number;
  active_pipelines: number;
  total_connections: number;
  connector_health: ConnectorHealth[];
  // Agent Stats
  total_agents: number;
  active_agents: number;
  agent_groups: AgentGroupStats[];
  // Inventory Stats
  total_users: number;
  total_assets: number;
  total_jobs: number;
  success_rate: number;
  avg_duration: number;
  total_rows: number;
  total_rejected_rows: number;
  active_issues: number;
  resolution_rate: number;
  total_bytes: number;
  throughput: ThroughputDataPoint[];
  pipeline_distribution: PipelineDistribution[];
  recent_activity: RecentActivity[];
  system_health: SystemHealth;
  top_failing_pipelines: FailingPipeline[];
  slowest_pipelines: SlowestPipeline[];
  quality_trend: QualityTrendDataPoint[];
  top_violations: QualityViolation[];
  recent_alerts: DashboardAlert[];
  recent_audit_logs: AuditLog[];
  recent_ephemeral_jobs: EphemeralJobResponse[];
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface PipelineListResponse {
  pipelines: Pipeline[];
  total: number;
  limit: number;
  offset: number;
}

export interface PipelineVersionSummary {
  id: number;
  version: number;
  is_published: boolean;
  published_at?: string;
  version_notes?: string;
  node_count: number;
  edge_count: number;
  created_at: string;
}

export interface PipelineDetailRead extends Pipeline {
  latest_version?: PipelineVersionRead;
  published_version?: PipelineVersionRead;
  versions: PipelineVersionSummary[];
}

export interface PipelineStatsResponse {
  pipeline_id: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  total_quarantined: number;
  total_records_processed: number;
  average_duration_seconds?: number;
  last_run_at?: string;
  next_scheduled_run?: string;
}

export interface PipelineTriggerRequest {
  version_id?: number;
  run_params?: Record<string, any>;
  async_execution?: boolean;
  is_backfill?: boolean;
  backfill_config?: Record<string, any>;
}

export interface PipelineBackfillRequest {
  start_date: string;
  end_date: string;
  version_id?: number;
}

export interface PipelineTriggerResponse {
  status: string;
  message: string;
  job_id: number;
  task_id?: string;
  pipeline_id: number;
  version_id: number;
}

export interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobLogRead {
  id: number;
  job_id: number;
  level: string;
  message: string;
  metadata_payload?: Record<string, any>;
  timestamp: string;
  source?: string;
}

export interface StepLogRead {
  id: number;
  step_run_id: number;
  level: string;
  message: string;
  metadata_payload?: Record<string, any>;
  timestamp: string;
  source?: string;
}

export interface UnifiedLogRead {
  id: number;
  level: string;
  message: string;
  metadata_payload?: Record<string, any>;
  timestamp: string;
  source?: string;
  job_id?: number;
  step_run_id?: number;
  type: string;
}

export interface LineageNode {
  id: string;
  type: string;
  label: string;
  data: {
    asset_id: number;
    type: string;
    connection_type: string;
    row_count?: number;
    size_bytes?: number;
    fqn?: string;
    schema_version?: number;
    schema_metadata?: any;
    last_updated?: string;
    health_score?: number;
    last_run_status?: string;
  };
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data: {
    pipeline_id: number;
    pipeline_name: string;
    status: string;
    stats?: {
      total_runs: number;
      avg_duration: number;
      last_run_at: string | null;
      success_rate: number;
    };
  };
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    orphaned_assets: number;
  };
}

export interface ImpactAnalysis {
  asset_id: number;
  downstream_pipelines: Array<{
    id: number;
    name: string;
    status: string;
  }>;
  downstream_assets: Array<{
    id: number;
    name: string;
    type: string;
    schema_metadata?: any;
  }>;
}

export interface ColumnFlow {
  source_column: string;
  target_column: string;
  transformation_type: string;
  node_id: string;
  pipeline_id: number;
}

export interface ColumnLineage {
  column_name: string;
  asset_id: number;
  origin_asset_id: number;
  origin_column_name: string;
  path: ColumnFlow[];
}

export interface ColumnImpact {
  column_name: string;
  asset_id: number;
  asset_name: string;
  pipeline_id: number;
  pipeline_name: string;
  node_id: string;
  transformation_type: string;
}

export interface ColumnImpactAnalysis {
  column_name: string;
  asset_id: number;
  impacts: ColumnImpact[];
}
