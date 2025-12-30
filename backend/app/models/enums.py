import enum

class ConnectorType(str, enum.Enum):
    """Defines the protocol or system type to instantiate."""
    # Relational
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MARIADB = "mariadb"
    MSSQL = "mssql"
    ORACLE = "oracle"
    SQLITE = "sqlite"
    DUCKDB = "duckdb"
    # NoSQL
    MONGODB = "mongodb"
    REDIS = "redis"
    ELASTICSEARCH = "elasticsearch"
    CASSANDRA = "cassandra"
    DYNAMODB = "dynamodb"
    # Warehouses
    SNOWFLAKE = "snowflake"
    BIGQUERY = "bigquery"
    REDSHIFT = "redshift"
    DATABRICKS = "databricks"
    # File & Object Storage
    LOCAL_FILE = "local_file"
    S3 = "s3"
    GCS = "gcs"
    AZURE_BLOB = "azure_blob"
    FTP = "ftp"
    SFTP = "sftp"
    # APIs & Streams
    REST_API = "rest_api"
    GRAPHQL = "graphql"
    KAFKA = "kafka"
    RABBITMQ = "rabbitmq"
    # SaaS
    GOOGLE_SHEETS = "google_sheets"
    AIRTABLE = "airtable"
    SALESFORCE = "salesforce"
    HUBSPOT = "hubspot"
    STRIPE = "stripe"
    # Generic
    CUSTOM_SCRIPT = "custom_script"
    SINGER_TAP = "singer_tap"

class AssetType(str, enum.Enum):
    TABLE = "table"
    VIEW = "view"
    COLLECTION = "collection"
    FILE = "file"
    KEY_PATTERN = "key_pattern"
    API_ENDPOINT = "endpoint"
    STREAM = "stream"
    SQL_QUERY = "sql_query"
    NOSQL_QUERY = "nosql_query"
    PYTHON_SCRIPT = "python"
    SHELL_SCRIPT = "shell"
    JAVASCRIPT_SCRIPT = "javascript"

class PipelineStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"
    BROKEN = "broken"

class PipelineRunStatus(str, enum.Enum):
    PENDING = "pending"
    INITIALIZING = "initializing"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"

class OperatorType(str, enum.Enum):
    EXTRACT = "extract"
    TRANSFORM = "transform"
    LOAD = "load"
    VALIDATE = "validate"
    NOOP = "noop"

    MERGE = "merge"
    UNION = "union"
    JOIN = "join"

class OperatorRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    WARNING = "warning"
    FAILED = "failed"
    SKIPPED = "skipped"

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"

class RetryStrategy(str, enum.Enum):
    NONE = "none"
    FIXED = "fixed"
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"

class DataDirection(str, enum.Enum):
    SOURCE = "source"
    DESTINATION = "destination"
    INTERMEDIATE = "intermediate"

class AlertLevel(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertStatus(str, enum.Enum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    ACKNOWLEDGED = "acknowledged"
    SKIPPED = "skipped"

class AlertType(str, enum.Enum):
    JOB_STARTED = "job_started"
    JOB_FAILURE = "job_failure"
    JOB_SUCCESS = "job_success"
    DATA_QUALITY_FAILURE = "data_quality_failure"
    SCHEMA_CHANGE_DETECTED = "schema_change_detected"
    SLA_BREACH = "sla_breach"
    MANUAL = "manual"

class AlertDeliveryMethod(str, enum.Enum):
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"
    WEBHOOK = "webhook"
    PAGERDUTY = "pagerduty"
    IN_APP = "in_app"