import React from 'react';
import {
    Table, Eye, Layers, FileText, Key, Globe, 
    Code, Terminal, FileCode, Workflow
} from 'lucide-react';
import { AssetType } from './enums';

export interface AssetMetadata {
    id: AssetType;
    name: string;
    description: string;
    icon: React.ElementType;
    category: 'Relational' | 'NoSQL' | 'File' | 'API' | 'Script' | 'Stream';
}

export const ASSET_META: Record<AssetType, AssetMetadata> = {
    [AssetType.TABLE]: {
        id: AssetType.TABLE, name: 'Table', description: 'Standard database table.',
        icon: Table, category: 'Relational'
    },
    [AssetType.VIEW]: {
        id: AssetType.VIEW, name: 'View', description: 'Virtual table based on a SQL query.',
        icon: Eye, category: 'Relational'
    },
    [AssetType.COLLECTION]: {
        id: AssetType.COLLECTION, name: 'Collection', description: 'NoSQL document collection.',
        icon: Layers, category: 'NoSQL'
    },
    [AssetType.FILE]: {
        id: AssetType.FILE, name: 'File', description: 'Structured file (CSV, JSON, Parquet).',
        icon: FileText, category: 'File'
    },
    [AssetType.KEY_PATTERN]: {
        id: AssetType.KEY_PATTERN, name: 'Key Pattern', description: 'Redis key pattern match.',
        icon: Key, category: 'NoSQL'
    },
    [AssetType.API_ENDPOINT]: {
        id: AssetType.API_ENDPOINT, name: 'API Endpoint', description: 'HTTP REST/GraphQL endpoint.',
        icon: Globe, category: 'API'
    },
    [AssetType.STREAM]: {
        id: AssetType.STREAM, name: 'Stream', description: 'Real-time data stream topic.',
        icon: Workflow, category: 'Stream'
    },
    [AssetType.SQL_QUERY]: {
        id: AssetType.SQL_QUERY, name: 'SQL Query', description: 'Custom SQL extraction query.',
        icon: Code, category: 'Relational'
    },
    [AssetType.NOSQL_QUERY]: {
        id: AssetType.NOSQL_QUERY, name: 'NoSQL Query', description: 'Database-specific query object.',
        icon: Code, category: 'NoSQL'
    },
    [AssetType.PYTHON_SCRIPT]: {
        id: AssetType.PYTHON_SCRIPT, name: 'Python Script', description: 'Python code execution.',
        icon: FileCode, category: 'Script'
    },
    [AssetType.SHELL_SCRIPT]: {
        id: AssetType.SHELL_SCRIPT, name: 'Shell Script', description: 'Bash/Sh command execution.',
        icon: Terminal, category: 'Script'
    },
    [AssetType.JAVASCRIPT_SCRIPT]: {
        id: AssetType.JAVASCRIPT_SCRIPT, name: 'Node.js Script', description: 'JavaScript (Node.js) execution.',
        icon: FileCode, category: 'Script'
    },
};

export const getAssetIcon = (type: string) => {
    const meta = Object.values(ASSET_META).find(m => m.id === type) || ASSET_META[AssetType.TABLE];
    return React.createElement(meta.icon, { className: "h-4 w-4" });
};
