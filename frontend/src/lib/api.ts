/* eslint-disable @typescript-eslint/no-explicit-any */
// API Definitions
import axios from "axios";
import { toast } from "sonner";
import {
  ConnectorType,
  PipelineStatus,
  JobStatus,
  OperatorType,
  RetryStrategy,
} from "./enums";

// --- Configuration ---
export const API_BASE_URL = "http://localhost:8000/api/v1"; // Adjust as needed

// Renaming for consistency with request
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    // Handle 401 Unauthorized (Session Expired)
    if (response && response.status === 401) {
      const publicRoutes = ["/login", "/register", "/", "/docs"];
      const isPublicRoute = publicRoutes.some(
        (route) =>
          window.location.pathname === route ||
          window.location.pathname.startsWith("/docs/")
      );

      if (!isPublicRoute) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }
    } else if (response && response.status === 403) {
      toast.error("You do not have permission to perform this action.");
    } else if (response && response.status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (error.message === "Network Error") {
      toast.error("Network error. Please check your connection.");
    }

    return Promise.reject(error);
  }
);

// --- Auth Types ---
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

// --- Auth Functions ---

export const loginUser = async (credentials: LoginRequest) => {
  const params = new URLSearchParams();
  params.append("username", credentials.username);
  params.append("password", credentials.password);

  const { data } = await api.post<AuthToken>("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
};

export const registerUser = async (payload: RegisterRequest) => {
  const { data } = await api.post<User>("/auth/register", payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get<User>("/auth/me");
  return data;
};

export const updateUser = async (
  payload: Partial<User> & { password?: string }
) => {
  const { data } = await api.patch<User>("/auth/me", payload);
  return data;
};

export const deleteUser = async () => {
  await api.delete("/auth/me");
};

// --- Types ---

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
  node_id: number; // The backend integer ID (pipeline_nodes.id)
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

export interface StepRun {
  id: number;
  step_id: number;
  job_id: number;
  status: "pending" | "running" | "completed" | "failed";
  started_at?: string;
  finished_at?: string;
  row_count?: number;
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

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  limit: number;
  offset: number;
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

export const getConnections = async () => {
  const { data } = await api.get<ConnectionListResponse>("/connections");
  return data.connections;
};

export const getConnection = async (id: number) => {
  const { data } = await api.get<Connection>(`/connections/${id}`);
  return data;
};

export const createConnection = async (payload: ConnectionCreate) => {
  const { data } = await api.post<Connection>("/connections", payload);
  return data;
};

export const updateConnection = async (id: number, payload: any) => {
  const { data } = await api.patch<Connection>(`/connections/${id}`, payload);
  return data;
};

export const deleteConnection = async (id: number) => {
  await api.delete(`/connections/${id}`);
};

export const testConnection = async (id: number, config: any = {}) => {
  const { data } = await api.post<ConnectionTestResult>(
    `/connections/${id}/test`,
    { config }
  );
  return data;
};

export interface SchemaDiscoveryResponse {
  success: boolean;
  schema_version?: number;
  is_breaking_change: boolean;
  message: string;
  discovered_schema?: Record<string, any>;
}

export const discoverAssets = async (id: number) => {
  const { data } = await api.post<any>(`/connections/${id}/discover`, {
    include_metadata: false,
  });

  return data;
};

// --- Live File Management ---

export const listRemoteFiles = async (
  connectionId: number,
  path: string = ""
) => {
  const { data } = await api.get<any>(`/connections/${connectionId}/list`, {
    params: { path },
  });

  return data;
};

export const downloadRemoteFile = async (
  connectionId: number,
  path: string
) => {
  const response = await api.get(`/connections/${connectionId}/download`, {
    params: { path },
    responseType: "blob",
  });

  // Extract filename from Content-Disposition if possible
  const contentDisposition = response.headers["content-disposition"];
  let filename = path.split("/").pop() || "download";
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"\\]+)"?/);
    if (filenameMatch?.[1]) filename = filenameMatch[1];
  }

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadRemoteDirectory = async (
  connectionId: number,
  path: string
) => {
  const response = await api.get(`/connections/${connectionId}/zip`, {
    params: { path },
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  let filename = (path.split("/").pop() || "root") + ".zip";
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"\\]+)"?/);
    if (filenameMatch?.[1]) filename = filenameMatch[1];
  }

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getRemoteFileBlob = async (connectionId: number, path: string) => {
  const response = await api.get(`/connections/${connectionId}/download`, {
    params: { path },

    responseType: "blob",
  });

  return response.data;
};

export const uploadRemoteFile = async (
  connectionId: number,
  path: string,
  file: File
) => {
  const formData = new FormData();

  formData.append("file", file);

  const { data } = await api.post(
    `/connections/${connectionId}/upload`,
    formData,
    {
      params: { path },

      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return data;
};

export const deleteRemoteFile = async (connectionId: number, path: string) => {
  const { data } = await api.delete(`/connections/${connectionId}/delete`, {
    params: { path },
  });

  return data;
};

export const createRemoteDirectory = async (
  connectionId: number,
  path: string
) => {
  const { data } = await api.post(`/connections/${connectionId}/mkdir`, null, {
    params: { path },
  });
  return data;
};

export const saveRemoteFile = async (
  connectionId: number,
  path: string,
  content: string
) => {
  const { data } = await api.post(`/connections/${connectionId}/save`, {
    path,
    content,
  });
  return data;
};

export const getConnectionAssets = async (id: number) => {
  const { data } = await api.get<AssetListResponse>(
    `/connections/${id}/assets`
  );
  return data.assets;
};

export interface AssetBulkCreateItem {
  name: string;
  asset_type: string;
  is_source: boolean;
  is_destination: boolean;
  fully_qualified_name?: string;
  config?: Record<string, any>;
}

export interface AssetBulkCreate {
  assets: AssetBulkCreateItem[];
}

export interface AssetBulkCreateResponse {
  successful_creates: number;
  failed_creates: number;
  total_requested: number;
  failures: { name: string; reason: string }[];
}

export const createAsset = async (
  connectionId: number,
  payload: AssetCreate
) => {
  const { data } = await api.post<Asset>(
    `/connections/${connectionId}/assets`,
    payload
  );
  return data;
};

export const bulkCreateAssets = async (
  connectionId: number,
  payload: AssetBulkCreate
) => {
  const { data } = await api.post<AssetBulkCreateResponse>(
    `/connections/${connectionId}/assets/bulk-create`,
    payload
  );
  return data;
};

export const updateAsset = async (
  connectionId: number,
  assetId: number,
  payload: AssetUpdate
) => {
  const { data } = await api.patch<Asset>(
    `/connections/${connectionId}/assets/${assetId}`,
    payload
  );
  return data;
};

export const deleteAsset = async (connectionId: number, assetId: number) => {
  await api.delete(`/connections/${connectionId}/assets/${assetId}`);
};

export const discoverAssetSchema = async (
  connectionId: number,
  assetId: number
) => {
  const { data } = await api.post<SchemaDiscoveryResponse>(
    `/connections/${connectionId}/assets/${assetId}/discover-schema`,
    { force_refresh: true }
  );
  return data;
};

export const getAssetSchemaVersions = async (
  connectionId: number,
  assetId: number
) => {
  const { data } = await api.get<SchemaVersion[]>(
    `/connections/${connectionId}/assets/${assetId}/schema-versions`
  );
  return data;
};

export interface AssetSampleData {
  asset_id: number;
  rows: any[];
  count: number;
}

export const getAssetSampleData = async (
  connectionId: number,
  assetId: number,
  limit: number = 100
) => {
  const { data } = await api.get<AssetSampleData>(
    `/connections/${connectionId}/assets/${assetId}/sample`,
    { params: { limit } }
  );
  return data;
};

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

export const getConnectionImpact = async (connectionId: number) => {
  const { data } = await api.get<ConnectionImpact>(
    `/connections/${connectionId}/impact`
  );
  return data;
};

export const getConnectionUsageStats = async (connectionId: number) => {
  const { data } = await api.get<ConnectionUsageStats>(
    `/connections/${connectionId}/usage-stats`
  );
  return data;
};

export interface ConnectionEnvironmentInfo {
  python_version?: string;
  platform?: string;
  pandas_version?: string;
  numpy_version?: string;
  base_path?: string;
  available_tools?: Record<string, string>;
  installed_packages?: Record<string, string>;
  node_version?: string;
  npm_packages?: Record<string, string>;
  initialized_languages?: string[];
  ruby_version?: string;
  powershell_version?: string;
  perl_version?: string;
  gcc_version?: string;
  details?: Record<string, any>;
}

export const getConnectionEnvironment = async (connectionId: number) => {
  const { data } = await api.get<ConnectionEnvironmentInfo>(
    `/connections/${connectionId}/environment`
  );
  return data;
};

export const initializeEnvironment = async (
  connectionId: number,
  language: string
) => {
  const { data } = await api.post<{ status: string; path: string }>(
    `/connections/${connectionId}/environment/initialize`,
    { language }
  );
  return data;
};

// Dependency Management
export const listDependencies = async (
  connectionId: number,
  language: string
) => {
  const { data } = await api.get<Record<string, string>>(
    `/connections/${connectionId}/dependencies/${language}`
  );
  return data;
};

export const installDependency = async (
  connectionId: number,
  language: string,
  pkg: string
) => {
  const { data } = await api.post<{ output: string }>(
    `/connections/${connectionId}/dependencies/${language}/install`,
    { package: pkg }
  );
  return data;
};

export const uninstallDependency = async (
  connectionId: number,
  language: string,
  pkg: string
) => {
  const { data } = await api.post<{ output: string }>(
    `/connections/${connectionId}/dependencies/${language}/uninstall`,
    { package: pkg }
  );
  return data;
};

// Pipelines
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

export interface PipelineVersionRead {
  id: number;
  pipeline_id: number;
  version: number;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface PipelineDetailRead extends Pipeline {
  published_version?: PipelineVersionRead;
  latest_version?: PipelineVersionRead;
}

export interface PipelineListResponse {
  pipelines: Pipeline[];
  total: number;
  limit: number;
  offset: number;
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

export const getPipelines = async () => {
  const { data } = await api.get<PipelineListResponse>("/pipelines");
  return data.pipelines;
};

export const getPipeline = async (id: number) => {
  const { data } = await api.get<PipelineDetailRead>(`/pipelines/${id}`);
  return data;
};

export const getPipelineStats = async (id: number) => {
  const { data } = await api.get<PipelineStatsResponse>(
    `/pipelines/${id}/stats`
  );
  return data;
};

// Dashboard
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
  active_pipelines: number;
  total_connections: number;
  connector_health: ConnectorHealth[];

  total_jobs: number;
  success_rate: number;
  avg_duration: number;
  total_rows: number;
  total_bytes: number;

  throughput: ThroughputDataPoint[];
  pipeline_distribution: PipelineDistribution[];
  recent_activity: RecentActivity[];

  system_health?: SystemHealth;
  top_failing_pipelines: FailingPipeline[];
  slowest_pipelines: SlowestPipeline[];
  recent_alerts: DashboardAlert[];
}

export const getDashboardStats = async (
  timeRange: string = "24h",
  startDate?: string,
  endDate?: string
) => {
  const params: any = { time_range: timeRange };
  if (timeRange === "custom" && startDate) {
    params.start_date = startDate;
    if (endDate) params.end_date = endDate;
  }
  const { data } = await api.get<DashboardStats>("/dashboard/stats", {
    params,
  });
  return data;
};

export const createPipeline = async (payload: PipelineCreate) => {
  const { data } = await api.post<PipelineDetailRead>("/pipelines", payload);
  return data;
};

export const updatePipeline = async (id: number, payload: any) => {
  const { data } = await api.patch<PipelineDetailRead>(
    `/pipelines/${id}`,
    payload
  );
  return data;
};

export const deletePipeline = async (id: number) => {
  await api.delete(`/pipelines/${id}`);
};

export interface PipelineVersionCreate {
  config_snapshot?: Record<string, any>;
  change_summary?: Record<string, any>;
  version_notes?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export const createPipelineVersion = async (
  id: number,
  payload: PipelineVersionCreate
) => {
  const { data } = await api.post<PipelineVersionRead>(
    `/pipelines/${id}/versions`,
    payload
  );
  return data;
};

export interface PipelineVersionSummary {
  id: number;
  version: number;
  is_published: boolean;
  published_at?: string;
  node_count: number;
  edge_count: number;
  created_at: string;
}

export const getPipelineVersions = async (id: number) => {
  const { data } = await api.get<PipelineVersionSummary[]>(
    `/pipelines/${id}/versions`
  );
  return data;
};

export const getPipelineVersion = async (
  pipelineId: number,
  versionId: number
) => {
  const { data } = await api.get<PipelineVersionRead>(
    `/pipelines/${pipelineId}/versions/${versionId}`
  );
  return data;
};

export const publishPipelineVersion = async (
  pipelineId: number,
  versionId: number
) => {
  const { data } = await api.post<any>(
    `/pipelines/${pipelineId}/versions/${versionId}/publish`,
    {}
  );
  return data;
};

export interface PipelineTriggerResponse {
  status: string;
  message: string;
  job_id: number;
  task_id?: string;
  pipeline_id: number;
  version_id: number;
}

export const triggerPipeline = async (id: number, versionId?: number) => {
  const { data } = await api.post<PipelineTriggerResponse>(
    `/pipelines/${id}/trigger`,
    {
      version_id: versionId,
    }
  );
  return data;
};

// Jobs
export interface JobListResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export const getJobs = async (pipelineId?: number) => {
  const params = pipelineId ? { pipeline_id: pipelineId } : {};
  const { data } = await api.get<JobListResponse>("/jobs", { params });
  return data.jobs;
};

export const getJob = async (id: number) => {
  const { data } = await api.get<Job>(`/jobs/${id}`);
  return data;
};

export const getJobRun = async (jobId: number) => {
  const { data } = await api.get<PipelineRunDetailRead>(`/jobs/${jobId}/run`);
  return data;
};

export const getRunSteps = async (runId: number) => {
  const { data } = await api.get<StepRunRead[]>(`/runs/${runId}/steps`);
  return data;
};

export const getStepData = async (
  runId: number,
  stepId: number,
  direction: "in" | "out" = "out",
  limit: number = 100,
  offset: number = 0
) => {
  const { data } = await api.get<any>(`/runs/${runId}/steps/${stepId}/data`, {
    params: { direction, limit, offset },
  });
  return data;
};

export const getJobLogs = async (id: number) => {
  const { data } = await api.get<any[]>(`/jobs/${id}/logs`);
  return data;
};

export const cancelJob = async (id: number) => {
  const { data } = await api.post<Job>(`/jobs/${id}/cancel`);
  return data;
};

export const retryJob = async (id: number) => {
  const { data } = await api.post<Job>(`/jobs/${id}/retry`, { force: true });
  return data;
};

// Alerts
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
  enabled?: boolean;
  recipient?: string;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  limit: number;
  offset: number;
}

export const getAlertConfigs = async () => {
  const { data } = await api.get<AlertConfig[]>("/alerts");
  return data;
};

export const updateAlertConfig = async (
  id: number,
  payload: AlertConfigUpdate
) => {
  const { data } = await api.patch<AlertConfig>(`/alerts/${id}`, payload);
  return data;
};

export const getAlertHistory = async (
  skip: number = 0,
  limit: number = 100
) => {
  const { data } = await api.get<AlertListResponse>("/alerts/history", {
    params: { skip, limit },
  });
  return data;
};

export const acknowledgeAlert = async (id: number) => {
  const { data } = await api.patch<Alert>(`/alerts/history/${id}`, {
    status: "acknowledged",
    acknowledged_at: new Date().toISOString(),
  });
  return data;
};

// API Keys
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

export const getApiKeys = async () => {
  const { data } = await api.get<ApiKey[]>("/api-keys");
  return data;
};

export const createApiKey = async (payload: ApiKeyCreate) => {
  const { data } = await api.post<ApiKeyCreated>("/api-keys", payload);
  return data;
};

export const revokeApiKey = async (id: number) => {
  const { data } = await api.delete<ApiKey>(`/api-keys/${id}`);

  return data;
};

// Explorer

export interface QueryResponse {
  results: any[];

  count: number;

  columns: string[];
}

export interface ConnectionSchemaMetadata {
  connector_type: string;

  metadata: Record<string, string[]>;
}

export const executeRawQuery = async (
  connectionId: number,
  query: string,
  limit: number = 100,
  offset: number = 0
) => {
  const { data } = await api.post<QueryResponse>(
    `/explorer/${connectionId}/execute`,
    { query, limit, offset }
  );

  return data;
};

export const getConnectionSchemaMetadata = async (connectionId: number) => {
  const { data } = await api.get<ConnectionSchemaMetadata>(
    `/explorer/${connectionId}/schema-metadata`
  );

  return data;
};

export interface HistoryItem {
  id: number;
  query: string;
  status: string;
  execution_time_ms: number;
  row_count: number | null;
  created_at: string;
  connection_name: string;
  created_by: string | null;
}

export const getHistory = async (limit: number = 50, offset: number = 0) => {
  const { data } = await api.get<HistoryItem[]>("/explorer/history", {
    params: { limit, offset },
  });
  return data;
};

export const clearHistory = async () => {
  const { data } = await api.delete<{ status: string }>("/explorer/history");
  return data;
};
