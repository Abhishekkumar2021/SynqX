/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
    Database, Cloud, HardDrive, Globe, FileJson, Server, Code, FileSpreadsheet
} from 'lucide-react';

export interface ConnectorMetadata {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'Database' | 'Warehouse' | 'File' | 'API' | 'Generic';
    color: string;
    popular?: boolean;
}

export const SafeIcon = ({ icon, className }: { icon: React.ReactNode, className?: string }) => {
    if (React.isValidElement(icon)) {
        return React.cloneElement(icon as React.ReactElement<any>, { className });
    }
    return <Server className={className} />;
};

export const CONNECTOR_META: Record<string, ConnectorMetadata> = {
    postgresql: { 
        id: 'postgresql', name: 'PostgreSQL', description: 'Advanced open-source relational database.', 
        icon: <Database />, category: 'Database', color: "text-blue-500 bg-blue-500/10 border-blue-500/20", popular: true 
    },
    mysql: { 
        id: 'mysql', name: 'MySQL', description: 'The world\'s most popular open-source database.', 
        icon: <Database />, category: 'Database', color: "text-sky-500 bg-sky-500/10 border-sky-500/20"
    },
    mariadb: { 
        id: 'mariadb', name: 'MariaDB', description: 'High performance open-source database.', 
        icon: <Database />, category: 'Database', color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
    },
    mssql: { 
        id: 'mssql', name: 'SQL Server', description: 'Microsoft relational database management system.', 
        icon: <Database />, category: 'Database', color: "text-red-500 bg-red-500/10 border-red-500/20"
    },
    oracle: { 
        id: 'oracle', name: 'Oracle DB', description: 'Multi-model database management system.', 
        icon: <Database />, category: 'Database', color: "text-red-600 bg-red-600/10 border-red-600/20"
    },
    sqlite: { 
        id: 'sqlite', name: 'SQLite', description: 'C-language library embedded database.', 
        icon: <Database />, category: 'Database', color: "text-blue-400 bg-blue-400/10 border-blue-400/20"
    },
    duckdb: { 
        id: 'duckdb', name: 'DuckDB', description: 'Embeddable analytical database (OLAP).', 
        icon: <Database />, category: 'Database', color: "text-yellow-600 bg-yellow-600/10 border-yellow-600/20"
    },
    snowflake: { 
        id: 'snowflake', name: 'Snowflake', description: 'Cloud-native data warehousing platform.', 
        icon: <Cloud />, category: 'Warehouse', color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20", popular: true 
    },
    databricks: { 
        id: 'databricks', name: 'Databricks', description: 'Unified data analytics platform (Lakehouse).', 
        icon: <Cloud />, category: 'Warehouse', color: "text-orange-600 bg-orange-600/10 border-orange-600/20"
    },
    redshift: { 
        id: 'redshift', name: 'Redshift', description: 'Fast, simple, cost-effective data warehousing.', 
        icon: <Cloud />, category: 'Warehouse', color: "text-purple-600 bg-purple-600/10 border-purple-600/20"
    },
    bigquery: { 
        id: 'bigquery', name: 'Google BigQuery', description: 'Serverless enterprise data warehouse.', 
        icon: <Cloud />, category: 'Warehouse', color: "text-blue-600 bg-blue-600/10 border-blue-600/20"
    },
    google_sheets: { 
        id: 'google_sheets', name: 'Google Sheets', description: 'Spreadsheets as a real-time data source.', 
        icon: <FileSpreadsheet />, category: 'API', color: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20", popular: true 
    },
    mongodb: { 
        id: 'mongodb', name: 'MongoDB', description: 'Source-available document database.', 
        icon: <FileJson />, category: 'Database', color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    },
    cassandra: { 
        id: 'cassandra', name: 'Apache Cassandra', description: 'Highly scalable distributed NoSQL database.', 
        icon: <Database />, category: 'Database', color: "text-blue-400 bg-blue-400/10 border-blue-400/20"
    },
    dynamodb: { 
        id: 'dynamodb', name: 'DynamoDB', description: 'Serverless key-value NoSQL database.', 
        icon: <Database />, category: 'Database', color: "text-blue-700 bg-blue-700/10 border-blue-700/20"
    },
    redis: { 
        id: 'redis', name: 'Redis', description: 'In-memory key-value store.', 
        icon: <Database />, category: 'Database', color: "text-red-600 bg-red-600/10 border-red-600/20"
    },
    elasticsearch: { 
        id: 'elasticsearch', name: 'Elasticsearch', description: 'Distributed search and analytics engine.', 
        icon: <Database />, category: 'Database', color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    },
    local_file: { 
        id: 'local_file', name: 'Local File', description: 'Read CSV, JSON, and Parquet from disk.', 
        icon: <HardDrive />, category: 'File', color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
    },
    s3: { 
        id: 's3', name: 'Amazon S3', description: 'Scalable object storage in AWS.', 
        icon: <Cloud />, category: 'File', color: "text-orange-500 bg-orange-500/10 border-orange-500/20", popular: true 
    },
    gcs: { 
        id: 'gcs', name: 'Google Cloud Storage', description: 'Unified object storage from Google Cloud.', 
        icon: <Cloud />, category: 'File', color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
    },
    azure_blob: { 
        id: 'azure_blob', name: 'Azure Blob Storage', description: 'Massively scalable object storage for unstructured data.', 
        icon: <Cloud />, category: 'File', color: "text-blue-600 bg-blue-600/10 border-blue-600/20"
    },
    sftp: { 
        id: 'sftp', name: 'SFTP', description: 'Secure File Transfer Protocol.', 
        icon: <HardDrive />, category: 'File', color: "text-slate-500 bg-slate-500/10 border-slate-500/20"
    },
    ftp: { 
        id: 'ftp', name: 'FTP', description: 'File Transfer Protocol.', 
        icon: <HardDrive />, category: 'File', color: "text-slate-400 bg-slate-400/10 border-slate-400/20"
    },
    kafka: { 
        id: 'kafka', name: 'Apache Kafka', description: 'Distributed event streaming platform.', 
        icon: <Server />, category: 'Generic', color: "text-neutral-800 dark:text-neutral-200 bg-neutral-500/10 border-neutral-500/20"
    },
    rabbitmq: { 
        id: 'rabbitmq', name: 'RabbitMQ', description: 'Open source message broker.', 
        icon: <Server />, category: 'Generic', color: "text-orange-600 bg-orange-600/10 border-orange-600/20"
    },
    rest_api: { 
        id: 'rest_api', name: 'REST API', description: 'Connect to generic HTTP endpoints.', 
        icon: <Globe />, category: 'API', color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
    },
    graphql: { 
        id: 'graphql', name: 'GraphQL', description: 'Query and fetch data from GraphQL APIs.', 
        icon: <Globe />, category: 'API', color: "text-pink-500 bg-pink-500/10 border-pink-500/20"
    },
    airtable: { 
        id: 'airtable', name: 'Airtable', description: 'Cloud collaboration service (spreadsheet-database hybrid).', 
        icon: <FileSpreadsheet />, category: 'API', color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
    },
    custom_script: {
        id: 'custom_script', name: 'Custom Script', description: 'Execute Python or Shell scripts to extract data.',
        icon: <Code />, category: 'Generic', color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
    },
    singer_tap: {
        id: 'singer_tap', name: 'Singer Tap', description: 'Run any Singer-compliant Tap to ingest data.',
        icon: <Code />, category: 'Generic', color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20"
    },
};

export const CONNECTOR_CONFIG_SCHEMAS: Record<string, any> = {
    postgresql: {
        fields: [
            { name: "host", label: "Host Address", type: "text", required: true, placeholder: "e.g. db.example.com" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 5432 },
            { name: "database", label: "Database Name", type: "text", required: true },
            { name: "db_schema", label: "Schema", type: "text", defaultValue: "public" },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
        ]
    },
    mysql: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 3306 },
            { name: "database", label: "Database Name", type: "text", required: true },
            { name: "db_schema", label: "Schema", type: "text", defaultValue: "public" },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
        ]
    },
    mariadb: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 3306 },
            { name: "database", label: "Database Name", type: "text", required: true },
            { name: "db_schema", label: "Schema", type: "text", defaultValue: "public" },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
        ]
    },
    mssql: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, placeholder: "sqlserver.example.com" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 1433 },
            { name: "database", label: "Database Name", type: "text", required: true },
            { name: "db_schema", label: "Schema", type: "text", defaultValue: "dbo" },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
        ]
    },
    oracle: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, placeholder: "oracle.example.com" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 1521 },
            { name: "database", label: "Service Name / SID", type: "text", required: true },
            { name: "db_schema", label: "Schema", type: "text" },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
        ]
    },
    redshift: {
        fields: [
            { name: "host", label: "Host Address", type: "text", required: true, placeholder: "cluster.abc.region.redshift.amazonaws.com" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 5439 },
            { name: "database", label: "Database Name", type: "text", required: true },
            { name: "db_schema", label: "Schema", type: "text", defaultValue: "public" },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
        ]
    },
    sqlite: {
        fields: [
            { name: "database_path", label: "Database Path", type: "text", required: true, placeholder: "/path/to/database.db" }
        ]
    },
    duckdb: {
        fields: [
            { name: "path", label: "Database Path", type: "text", placeholder: "/path/to/duck.db (Leave empty for in-memory)" },
            { name: "memory", label: "In-Memory Mode", type: "select", options: [{label: "True", value: true}, {label: "False", value: false}], defaultValue: true }
        ]
    },
    snowflake: {
        fields: [
            { name: "user", label: "User", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
            { name: "account", label: "Account", type: "text", required: true, placeholder: "xy12345.us-east-1" },
            { name: "warehouse", label: "Warehouse", type: "text", required: true },
            { name: "database", label: "Database", type: "text", required: true },
            { name: "schema_name", label: "Schema", type: "text", defaultValue: "PUBLIC" },
            { name: "role", label: "Role", type: "text" },
        ]
    },
    bigquery: {
        fields: [
            { name: "project_id", label: "Project ID", type: "text", required: true },
            { name: "dataset_id", label: "Dataset ID", type: "text", required: true },
            { name: "credentials_json", label: "Service Account JSON", type: "textarea", placeholder: "{ ... }" },
            { name: "credentials_path", label: "Key File Path", type: "text" },
        ]
    },
    databricks: {
        fields: [
            { name: "server_hostname", label: "Server Hostname", type: "text", required: true },
            { name: "http_path", label: "HTTP Path", type: "text", required: true },
            { name: "access_token", label: "Access Token", type: "password", required: true },
            { name: "catalog", label: "Catalog", type: "text", defaultValue: "hive_metastore" },
            { name: "schema_name", label: "Schema", type: "text", defaultValue: "default" },
        ]
    },
    mongodb: {
        fields: [
            { name: "connection_string", label: "Connection String (URI)", type: "text", placeholder: "mongodb://user:pass@host:27017/db" },
            { name: "host", label: "Host", type: "text", placeholder: "localhost", defaultValue: "localhost" },
            { name: "port", label: "Port", type: "number", defaultValue: 27017 },
            { name: "database", label: "Database Name", type: "text", required: true },
            { name: "username", label: "Username", type: "text" },
            { name: "password", label: "Password", type: "password" },
            { name: "auth_source", label: "Auth Source", type: "text", defaultValue: "admin" },
        ]
    },
    dynamodb: {
        fields: [
            { name: "region_name", label: "AWS Region", type: "text", required: true, defaultValue: "us-east-1" },
            { name: "aws_access_key_id", label: "Access Key ID", type: "text" },
            { name: "aws_secret_access_key", label: "Secret Access Key", type: "password" },
            { name: "endpoint_url", label: "Custom Endpoint URL", type: "text" },
        ]
    },
    elasticsearch: {
        fields: [
            { name: "hosts", label: "Hosts", type: "text", required: true, placeholder: "http://localhost:9200" },
            { name: "username", label: "Username", type: "text" },
            { name: "password", label: "Password", type: "password" },
            { name: "api_key", label: "API Key", type: "password" },
            { name: "verify_certs", label: "Verify SSL", type: "select", options: [{label: "True", value: true}, {label: "False", value: false}], defaultValue: true },
        ]
    },
    cassandra: {
        fields: [
            { name: "contact_points", label: "Contact Points (IPs)", type: "text", required: true, placeholder: "127.0.0.1, 10.0.0.5" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 9042 },
            { name: "keyspace", label: "Keyspace", type: "text", required: true },
            { name: "username", label: "Username", type: "text" },
            { name: "password", label: "Password", type: "password" },
        ]
    },
    s3: {
        fields: [
            { name: "bucket", label: "Bucket Name", type: "text", required: true },
            { name: "region_name", label: "AWS Region", type: "text", defaultValue: "us-east-1" },
            { name: "aws_access_key_id", label: "Access Key ID", type: "text" },
            { name: "aws_secret_access_key", label: "Secret Access Key", type: "password" },
            { name: "endpoint_url", label: "Custom Endpoint URL", type: "text", placeholder: "https://s3.amazonaws.com" },
            { name: "recursive", label: "Recursive Search", type: "select", options: [{label: "Yes", value: true}, {label: "No", value: false}], defaultValue: true },
            { name: "max_depth", label: "Max Depth (None for unlimited)", type: "number", min: 0, dependency: { field: "recursive", value: true } },
            { name: "exclude_patterns", label: "Exclude Patterns", type: "text", placeholder: "e.g. logs, temp, backup" }
        ]
    },
    gcs: {
        fields: [
            { name: "bucket", label: "Bucket Name", type: "text", required: true },
            { name: "project_id", label: "GCP Project ID", type: "text" },
            { name: "credentials_json", label: "Service Account JSON", type: "textarea", placeholder: "{ ... }" },
            { name: "credentials_path", label: "Key File Path", type: "text" },
            { name: "recursive", label: "Recursive Search", type: "select", options: [{label: "Yes", value: true}, {label: "No", value: false}], defaultValue: true },
            { name: "max_depth", label: "Max Depth (None for unlimited)", type: "number", dependency: { field: "recursive", value: true } },
            { name: "exclude_patterns", label: "Exclude Patterns", type: "text", placeholder: "e.g. cache, tmp" }
        ]
    },
    azure_blob: {
        fields: [
            { name: "container_name", label: "Container Name", type: "text", required: true },
            { name: "account_name", label: "Storage Account Name", type: "text" },
            { name: "account_key", label: "Storage Account Key", type: "password" },
            { name: "connection_string", label: "Connection String (Optional override)", type: "password" },
            { name: "recursive", label: "Recursive Search", type: "select", options: [{label: "Yes", value: true}, {label: "No", value: false}], defaultValue: true },
            { name: "max_depth", label: "Max Depth (None for unlimited)", type: "number", dependency: { field: "recursive", value: true } },
            { name: "exclude_patterns", label: "Exclude Patterns", type: "text", placeholder: "e.g. archive, hidden" }
        ]
    },
    sftp: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, placeholder: "sftp.example.com" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 22 },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password" },
            { name: "private_key", label: "Private Key (PEM)", type: "textarea", placeholder: "-----BEGIN RSA PRIVATE KEY-----\n..." },
            { name: "private_key_passphrase", label: "Key Passphrase", type: "password" },
            { name: "base_path", label: "Base Path", type: "text", defaultValue: "/" },
            { name: "recursive", label: "Recursive Search", type: "select", options: [{label: "Yes", value: true}, {label: "No", value: false}], defaultValue: true },
            { name: "max_depth", label: "Max Depth (None for unlimited)", type: "number", dependency: { field: "recursive", value: true } },
            { name: "exclude_patterns", label: "Exclude Patterns", type: "text", placeholder: "e.g. .git, node_modules" }
        ]
    },
    ftp: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, placeholder: "ftp.example.com" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 21 },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
            { name: "base_path", label: "Base Path", type: "text", defaultValue: "/" },
            { name: "recursive", label: "Recursive Search", type: "select", options: [{label: "Yes", value: true}, {label: "No", value: false}], defaultValue: true },
            { name: "exclude_patterns", label: "Exclude Patterns", type: "text", placeholder: "e.g. logs, tmp" }
        ]
    },
    kafka: {
        fields: [
            { name: "bootstrap_servers", label: "Bootstrap Servers", type: "text", required: true, placeholder: "localhost:9092, broker2:9092" },
            { name: "security_protocol", label: "Security Protocol", type: "select", options: [{label: "PLAINTEXT", value: "PLAINTEXT"}, {label: "SASL_PLAINTEXT", value: "SASL_PLAINTEXT"}, {label: "SASL_SSL", value: "SASL_SSL"}, {label: "SSL", value: "SSL"}], defaultValue: "PLAINTEXT" },
            { name: "sasl_mechanism", label: "SASL Mechanism", type: "select", options: [{label: "PLAIN", value: "PLAIN"}, {label: "SCRAM-SHA-256", value: "SCRAM-SHA-256"}, {label: "SCRAM-SHA-512", value: "SCRAM-SHA-512"}], dependency: { field: "security_protocol", value: ["SASL_PLAINTEXT", "SASL_SSL"] } },
            { name: "sasl_plain_username", label: "SASL Username", type: "text", dependency: { field: "security_protocol", value: ["SASL_PLAINTEXT", "SASL_SSL"] } },
            { name: "sasl_plain_password", label: "SASL Password", type: "password", dependency: { field: "security_protocol", value: ["SASL_PLAINTEXT", "SASL_SSL"] } },
            { name: "group_id", label: "Consumer Group ID", type: "text", placeholder: "synqx-group" },
        ]
    },
    graphql: {
        fields: [
            { name: "url", label: "GraphQL Endpoint URL", type: "text", required: true, placeholder: "https://api.example.com/graphql" },
            { name: "auth_token", label: "Bearer Token", type: "password" },
            { name: "headers", label: "Custom Headers (JSON)", type: "textarea", placeholder: '{"X-Header": "value"}' },
        ]
    },
    google_sheets: {
        fields: [
            { name: "spreadsheet_id", label: "Spreadsheet ID", type: "text", required: true, placeholder: "e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" },
            {
                name: "auth_type", label: "Authentication Type", type: "select", required: true, defaultValue: "service_account",
                options: [
                    { label: "Service Account JSON", value: "service_account" },
                    { label: "API Key (Public Sheets Only)", value: "api_key" }
                ]
            },
            { name: "service_account_json", label: "Service Account Credentials (JSON)", type: "textarea", required: true, dependency: { field: "auth_type", value: "service_account" }, placeholder: "{ ... }" },
            { name: "api_key", label: "Google API Key", type: "password", required: true, dependency: { field: "auth_type", value: "api_key" } }
        ]
    },
    airtable: {
        fields: [
            { name: "api_key", label: "Airtable API Key / PAT", type: "password", required: true },
            { name: "base_id", label: "Base ID", type: "text", required: true },
        ]
    },
    salesforce: {
        fields: [
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
            { name: "security_token", label: "Security Token", type: "password", required: true },
            { name: "domain", label: "Domain", type: "select", options: [{label: "Production (login)", value: "login"}, {label: "Sandbox (test)", value: "test"}], defaultValue: "login" },
        ]
    },
    hubspot: {
        fields: [
            { name: "access_token", label: "Private App Access Token", type: "password", required: true },
        ]
    },
    stripe: {
        fields: [
            { name: "api_key", label: "Secret API Key", type: "password", required: true },
        ]
    },
    rabbitmq: {
        fields: [
            { name: "host", label: "Host", type: "text", required: true, defaultValue: "localhost" },
            { name: "port", label: "Port", type: "number", required: true, defaultValue: 5672 },
            { name: "username", label: "Username", type: "text" },
            { name: "password", label: "Password", type: "password" },
            { name: "virtual_host", label: "Virtual Host", type: "text", defaultValue: "/" },
        ]
    },
    rest_api: {
        fields: [
            { name: "base_url", label: "Base URL", type: "text", required: true, placeholder: "https://api.example.com/v1" },
            {
                name: "auth_type", label: "Authentication Method", type: "select", required: true, defaultValue: "none",
                options: [
                    { label: "No Auth", value: "none" },
                    { label: "Bearer Token", value: "bearer" },
                    { label: "Basic Auth", value: "basic" },
                    { label: "API Key", value: "api_key" },
                ]
            },
            { name: "auth_token", label: "Bearer Token", type: "password", required: true, dependency: { field: "auth_type", value: "bearer" } },
            { name: "auth_username", label: "Username", type: "text", required: true, dependency: { field: "auth_type", value: "basic" } },
            { name: "auth_password", label: "Password", type: "password", required: true, dependency: { field: "auth_type", value: "basic" } },
            { name: "api_key_name", label: "API Key Name", type: "text", defaultValue: "X-API-Key", dependency: { field: "auth_type", value: "api_key" } },
            { name: "api_key_value", label: "API Key Value", type: "password", dependency: { field: "auth_type", value: "api_key" } },
            { 
                name: "api_key_in", label: "API Key Location", type: "select", defaultValue: "header",
                options: [{label: "Header", value: "header"}, {label: "Query Param", value: "query"}],
                dependency: { field: "auth_type", value: "api_key" } 
            },
            
            // Advanced Data Mapping
            { name: "data_key", label: "JSON Data Path", type: "text", placeholder: "e.g. data.items or results (leave empty for root array)" },
            
            // Pagination
            {
                name: "pagination_type", label: "Pagination Strategy", type: "select", defaultValue: "none",
                options: [
                    { label: "None / No Pagination", value: "none" },
                    { label: "Limit & Offset", value: "limit_offset" },
                    { label: "Page Number", value: "page_number" },
                ]
            },
            { name: "page_size", label: "Default Page Size", type: "number", defaultValue: 100, dependency: { field: "pagination_type", value: ["limit_offset", "page_number"] } },
            { name: "limit_param", label: "Limit Parameter Name", type: "text", defaultValue: "limit", dependency: { field: "pagination_type", value: "limit_offset" } },
            { name: "offset_param", label: "Offset Parameter Name", type: "text", defaultValue: "offset", dependency: { field: "pagination_type", value: "limit_offset" } },
            { name: "page_param", label: "Page Parameter Name", type: "text", defaultValue: "page", dependency: { field: "pagination_type", value: "page_number" } },
            { name: "page_size_param", label: "Page Size Parameter Name", type: "text", defaultValue: "page_size", dependency: { field: "pagination_type", value: "page_number" } },

            // Headers & Parameters
            { name: "headers", label: "Custom Headers (JSON)", type: "textarea", placeholder: '{"X-Custom-Header": "value"}' },
            { name: "default_params", label: "Default Query Params (JSON)", type: "textarea", placeholder: '{"version": "v2"}' },

            // Performance & Reliability
            { name: "timeout", label: "Timeout (seconds)", type: "number", defaultValue: 30.0 },
            { name: "max_retries", label: "Max Retries", type: "number", defaultValue: 3 },
        ]
    },
    local_file: { 
        fields: [
            { name: "base_path", label: "Base Path", type: "text", required: true, placeholder: "/data/files" },
            { name: "recursive", label: "Recursive Search", type: "select", options: [{label: "Yes", value: true}, {label: "No", value: false}], defaultValue: true },
            { name: "max_depth", label: "Max Depth (None for unlimited)", type: "number", min: 0, dependency: { field: "recursive", value: true } },
            { name: "exclude_patterns", label: "Exclude Patterns", type: "text", placeholder: "e.g. node_modules, logs, .git" }
        ] 
    },
    custom_script: {
        fields: [
            { name: "base_path", label: "Base Script Path (Optional)", type: "text", placeholder: "/opt/scripts" },
            { name: "env_vars", label: "Global Env Vars (JSON)", type: "textarea", placeholder: "{\"API_KEY\": \"...\"}" }
        ]
    },
    singer_tap: {
        fields: [
            { name: "tap_name", label: "Tap Name", type: "text", required: true, placeholder: "e.g. tap-adwords" },
            { name: "config", label: "Tap Config (JSON)", type: "textarea", required: true, placeholder: "{ \"api_key\": \"...\" }" },
            { name: "catalog", label: "Catalog/Properties (Optional JSON)", type: "textarea" },
            { name: "state", label: "Initial State (Optional JSON)", type: "textarea" },
        ]
    }
};
