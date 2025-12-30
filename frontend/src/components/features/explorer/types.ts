import { type QueryResponse } from "@/lib/api";

export interface ResultItem {
    id: string;
    timestamp: number;
    statement: string;
    data: QueryResponse;
    duration?: number;
}

export interface QueryTab {
    id: string;
    title: string;
    query: string;
    language: string;
    results: ResultItem[];
    activeResultId?: string;
}

export interface HistoryItem {
    id: string | number;
    query: string;
    timestamp: number | string;
    connectionName: string;
    duration?: number;
    rowCount?: number;
    resultData?: QueryResponse;
}

export const SUPPORTED_EXPLORER_TYPES = [
    'postgresql', 'mysql', 'mariadb', 'mssql', 'oracle', 'sqlite',
    'snowflake', 'bigquery', 'redshift', 'databricks', 'mongodb'
];
