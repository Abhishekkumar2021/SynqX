export const ConnectorType = {
    // Relational
    POSTGRESQL: "postgresql",
    MYSQL: "mysql",
    MARIADB: "mariadb",
    MSSQL: "mssql",
    ORACLE: "oracle",
    SQLITE: "sqlite",
    DUCKDB: "duckdb",
    // NoSQL
    MONGODB: "mongodb",
    REDIS: "redis",
    ELASTICSEARCH: "elasticsearch",
    CASSANDRA: "cassandra",
    DYNAMODB: "dynamodb",
    // Warehouses
    SNOWFLAKE: "snowflake",
    BIGQUERY: "bigquery",
    REDSHIFT: "redshift",
    DATABRICKS: "databricks",
    // File & Object Storage
    LOCAL_FILE: "local_file",
    S3: "s3",
    GCS: "gcs",
    AZURE_BLOB: "azure_blob",
    FTP: "ftp",
    SFTP: "sftp",
    // APIs & Streams
    REST_API: "rest_api",
    GRAPHQL: "graphql",
    KAFKA: "kafka",
    RABBITMQ: "rabbitmq",
    // SaaS
    GOOGLE_SHEETS: "google_sheets",
    AIRTABLE: "airtable",
    SALESFORCE: "salesforce",
    HUBSPOT: "hubspot",
    STRIPE: "stripe",
    // Generic
    CUSTOM_SCRIPT: "custom_script",
    SINGER_TAP: "singer_tap"
} as const;
export type ConnectorType = typeof ConnectorType[keyof typeof ConnectorType];

export const AssetType = {
    TABLE: "table",
    VIEW: "view",
    COLLECTION: "collection",
    FILE: "file",
    KEY_PATTERN: "key_pattern",
    API_ENDPOINT: "endpoint",
    STREAM: "stream",
    SQL_QUERY: "sql_query",
    NOSQL_QUERY: "nosql_query",
    PYTHON_SCRIPT: "python",
    SHELL_SCRIPT: "shell",
    JAVASCRIPT_SCRIPT: "javascript"
} as const;
export type AssetType = typeof AssetType[keyof typeof AssetType];

export const PipelineStatus = {
    DRAFT: "draft",
    ACTIVE: "active",
    PAUSED: "paused",
    ARCHIVED: "archived",
    BROKEN: "broken"
} as const;
export type PipelineStatus = typeof PipelineStatus[keyof typeof PipelineStatus];

export const PipelineRunStatus = {
    PENDING: "pending",
    INITIALIZING: "initializing",
    RUNNING: "running",
    COMPLETED: "completed",
    PARTIAL_SUCCESS: "partial_success",
    FAILED: "failed",
    CANCELLED: "cancelled",
    SKIPPED: "skipped"
} as const;
export type PipelineRunStatus = typeof PipelineRunStatus[keyof typeof PipelineRunStatus];

export const OperatorType = {
    EXTRACT: "extract",
    TRANSFORM: "transform",
    LOAD: "load",
    VALIDATE: "validate",
    NOOP: "noop",
    MERGE: "merge",
    UNION: "union",
    JOIN: "join"
} as const;
export type OperatorType = typeof OperatorType[keyof typeof OperatorType];

export const OperatorRunStatus = {
    PENDING: "pending",
    RUNNING: "running",
    SUCCESS: "success",
    WARNING: "warning",
    FAILED: "failed",
    SKIPPED: "skipped"
} as const;
export type OperatorRunStatus = typeof OperatorRunStatus[keyof typeof OperatorRunStatus];

export const JobStatus = {
    PENDING: "pending",
    QUEUED: "queued",
    RUNNING: "running",
    SUCCESS: "success",
    FAILED: "failed",
    RETRYING: "retrying",
    CANCELLED: "cancelled"
} as const;
export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

export const RetryStrategy = {
    NONE: "none",
    FIXED: "fixed",
    EXPONENTIAL_BACKOFF: "exponential_backoff",
    LINEAR_BACKOFF: "linear_backoff"
} as const;
export type RetryStrategy = typeof RetryStrategy[keyof typeof RetryStrategy];

export const DataDirection = {
    SOURCE: "source",
    DESTINATION: "destination",
    INTERMEDIATE: "intermediate"
} as const;
export type DataDirection = typeof DataDirection[keyof typeof DataDirection];

export const AlertLevel = {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error",
    CRITICAL: "critical"
} as const;
export type AlertLevel = typeof AlertLevel[keyof typeof AlertLevel];

export const AlertStatus = {
    PENDING: "pending",
    SENDING: "sending",
    SENT: "sent",
    FAILED: "failed",
    ACKNOWLEDGED: "acknowledged",
    SKIPPED: "skipped"
} as const;
export type AlertStatus = typeof AlertStatus[keyof typeof AlertStatus];

export const AlertType = {
    JOB_FAILURE: "job_failure",
    JOB_SUCCESS: "job_success",
    DATA_QUALITY_FAILURE: "data_quality_failure",
    SCHEMA_CHANGE_DETECTED: "schema_change_detected",
    SLA_BREACH: "sla_breach",
    MANUAL: "manual"
} as const;
export type AlertType = typeof AlertType[keyof typeof AlertType];

export const AlertDeliveryMethod = {
    EMAIL: "email",
    SLACK: "slack",
    WEBHOOK: "webhook",
    PAGERDUTY: "pagerduty",
    IN_APP: "in_app"
} as const;
export type AlertDeliveryMethod = typeof AlertDeliveryMethod[keyof typeof AlertDeliveryMethod];