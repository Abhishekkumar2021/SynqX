/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ConnectorType,
  PipelineStatus,
  JobStatus,
  RetryStrategy,
  OperatorType,
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
  role: string;
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
  health_status?: string;
  last_test_at?: string;
  created_at?: string;
  updated_at?: string;
  asset_count?: number;
  max_concurrent_connections?: number;
  connection_timeout_seconds?: number;
  tags?: Record<string, any>;
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

export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  schedule_cron?: string;
  schedule_enabled?: boolean;
  schedule_timezone?: string;
  status: PipelineStatus;
  current_version?: number;
  published_version_id?: number;
  max_parallel_runs?: number;
  max_retries?: number;
  execution_timeout_seconds?: number;
  tags?: Record<string, any>;
  priority?: number;
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
  execution_timeout_seconds?: number;
  tags?: Record<string, any>;
  priority?: number;
  initial_version: PipelineVersionCreate;
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
  execution_timeout_seconds?: number;
  tags?: Record<string, any>;
  priority?: number;
}

export interface Job {
  id: number;
  pipeline_id: number;
  pipeline_version_id: number;
  status: JobStatus;
  retry_count?: number;
  max_retries?: number;
  retry_strategy?: RetryStrategy;
  retry_delay_seconds?: number;
  infra_error?: string;
  worker_id?: string;
  queue_name?: string;
  execution_time_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  celery_task_id?: string;
  correlation_id?: string;
}

export interface StepRunRead {
  id: number;
  pipeline_run_id: number;
  node_id: number;
  operator_type: string;
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
}

export interface PipelineRunDetailRead {
  id: number;
  job_id: number;
  status: string;
  version?: PipelineVersionRead;
  step_runs: StepRunRead[];
  total_nodes: number;
  total_extracted: number;
  total_loaded: number;
  total_failed: number;
  bytes_processed: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
}

export interface PipelineVersionRead {
  id: number;
  pipeline_id: number;
  version: number;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
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
  max_retries?: number;
  timeout_seconds?: number;
  position?: { x: number; y: number };
}

export interface PipelineEdge {
  id?: number;
  from_node_id: string;
  to_node_id: string;
  edge_type?: string;
}

export interface Asset {
  id: number;
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
  tags?: Record<string, any>;
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
  created_at: string;
}

export interface AlertConfigUpdate {
  name?: string;
  description?: string;
  alert_type?: string;
  delivery_method?: string;
  recipient?: string;
  enabled?: boolean;
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
  error_details?: string;
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
  created: number;
  skipped: number;
  errors: string[];
}

export interface SchemaDiscoveryResponse {
  asset_id: number;
  schema_version: number;
  is_new_version: boolean;
  is_breaking_change: boolean;
  diff?: Record<string, any>;
}

export interface AssetSampleData {
  asset_id: number;
  row_count: number;
  columns: string[];
  data: Record<string, any>[];
}

export interface ConnectionImpact {
  connection_id: number;
  pipeline_count: number;
  asset_count: number;
}

export interface ConnectionUsageStats {
  connection_id: number;
  total_runs: number;
  bytes_processed: number;
  avg_duration_seconds?: number;
}

export interface ConnectionEnvironmentInfo {
  connection_id: number;
  connector_type: string;
  environment: Record<string, any>;
}

export interface QueryResponse {
  results: Record<string, any>[];
  count: number;
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

export interface DashboardAlert {
  id: number;
  message: string;
  level: string;
  created_at: string;
  pipeline_id?: number;
}

export interface ConnectorHealth {
  status: string;
  count: number;
}

export interface DashboardStats {
  total_pipelines: number;
  total_connections: number;
  total_assets: number;
  total_jobs: number;
  runs_24h: number;
  failed_runs_24h: number;
  throughput: ThroughputDataPoint[];
  pipeline_distribution: PipelineDistribution[];
  recent_activity: RecentActivity[];
  system_health?: SystemHealth;
  failing_pipelines: FailingPipeline[];
  slowest_pipelines: SlowestPipeline[];
  alerts: DashboardAlert[];
  connector_health: ConnectorHealth[];
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
  node_count: number;
  edge_count: number;
  created_at: string;
}

export interface PipelineDetailRead extends Pipeline {
  latest_version?: PipelineVersionRead;
  published_version?: PipelineVersionRead;
  versions?: PipelineVersionSummary[];
}

export interface PipelineStatsResponse {
  pipeline_id: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  average_duration_seconds?: number;
  last_run_at?: string;
  next_scheduled_run?: string;
}

export interface PipelineTriggerResponse {
  status: string;
  message: string;
  job_id: number;
  task_id?: string;
  pipeline_id: number;
  version_id: number;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  limit: number;
  offset: number;
}
