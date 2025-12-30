import React from 'react';
import {
    Code2, Filter, ArrowRightLeft,
    Type, Hash, 
    Copy, FileCode, Sliders, X,
    Database, HardDriveUpload, CheckCircle2,
    PlayCircle, GitMerge, Layers
} from 'lucide-react';

export interface OperatorDef {
    id: string;
    name: string;
    type: 'extract' | 'load' | 'transform' | 'validate' | 'noop' | 'merge' | 'union' | 'join';
    description: string;
    icon: React.ElementType;
    category: 'Sources' | 'Destinations' | 'Transformations' | 'Set Operations' | 'Data Quality' | 'Advanced' | 'Formatting';
    color: string;
    configSchema: Record<string, string>;
    example: string;
}

export const OPERATORS: OperatorDef[] = [
    // --- Sources ---
    {
        id: 'source_connector',
        name: 'Extractor (Source)',
        type: 'extract',
        description: 'Ingest data from a configured source connector (Database, API, File, etc.).',
        icon: Database,
        category: 'Sources',
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        configSchema: {
            "connection_id": "integer (required)",
            "asset_id": "integer (required)",
            "incremental": "boolean (default: false)"
        },
        example: `{ 
  "operator_type": "extract",
  "config": {
    "connection_id": 101,
    "asset_id": 55,
    "incremental": true
  }
}`
    },
    // --- Destinations ---
    {
        id: 'destination_sink',
        name: 'Loader (Sink)',
        type: 'load',
        description: 'Load processed data into a destination target.',
        icon: HardDriveUpload,
        category: 'Destinations',
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        configSchema: {
            "connection_id": "integer (required)",
            "asset_id": "integer (required)",
            "mode": "string ('append', 'replace', 'upsert')"
        },
        example: `{ 
  "operator_type": "load",
  "config": {
    "connection_id": 202,
    "asset_id": 88,
    "mode": "append"
  }
}`
    },
    // --- Set Operations ---
    {
        id: 'join',
        name: 'Join Datasets',
        type: 'join',
        description: 'Merge two datasets horizontally based on a common key.',
        icon: GitMerge,
        category: 'Set Operations',
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        configSchema: {
            "on": "string (column name)",
            "how": "string ('inner', 'left', 'right', 'outer')",
            "right_on": "string (optional, if different)"
        },
        example: `{ 
  "operator_type": "join",
  "operator_class": "join",
  "config": {
    "on": "user_id",
    "how": "inner"
  }
}`
    },
    {
        id: 'union',
        name: 'Union All',
        type: 'union',
        description: 'Combine multiple datasets vertically (stacking rows).',
        icon: Layers,
        category: 'Set Operations',
        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        configSchema: {
            "deduplicate": "boolean (default: false)"
        },
        example: `{ 
  "operator_type": "union",
  "operator_class": "union",
  "config": {
    "deduplicate": false
  }
}`
    },
    // --- Transformations ---
    {
        id: 'filter',
        name: 'Filter Rows',
        type: 'transform',
        description: 'Filter dataset rows based on a condition string (Pandas query syntax).',
        icon: Filter,
        category: 'Transformations',
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        configSchema: {
            "query": "string (e.g. 'age > 18')"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "filter",
  "config": {
    "query": "status == 'active' and score >= 0.8"
  }
}`
    },
    {
        id: 'map',
        name: 'Map Values',
        type: 'transform',
        description: 'Map values in a column using a dictionary or expression.',
        icon: ArrowRightLeft,
        category: 'Transformations',
        color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        configSchema: {
            "column": "string",
            "mapping": "dict",
            "default": "any (optional)"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "map",
  "config": {
    "column": "country_code",
    "mapping": {
      "US": "United States",
      "UK": "United Kingdom"
    },
    "default": "Unknown"
  }
}`
    },
    {
        id: 'rename_columns',
        name: 'Rename Columns',
        type: 'transform',
        description: 'Rename one or more columns in the dataset.',
        icon: Type,
        category: 'Formatting',
        color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
        configSchema: {
            "columns": "dict {old_name: new_name}"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "rename_columns",
  "config": {
    "columns": {
      "id": "user_id",
      "created_at": "timestamp"
    }
  }
}`
    },
    {
        id: 'drop_columns',
        name: 'Drop Columns',
        type: 'transform',
        description: 'Remove specific columns from the dataset.',
        icon: X,
        category: 'Formatting',
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        configSchema: {
            "columns": "list[string]"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "drop_columns",
  "config": {
    "columns": ["internal_id", "temp_flag"]
  }
}`
    },
    {
        id: 'type_cast',
        name: 'Type Cast',
        type: 'transform',
        description: 'Convert column data types (e.g., string to int).',
        icon: Hash,
        category: 'Data Quality',
        color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
        configSchema: {
            "columns": "dict {column: type}"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "type_cast",
  "config": {
    "columns": {
      "price": "float",
      "quantity": "int",
      "is_active": "bool"
    }
  }
}`
    },
    {
        id: 'fill_nulls',
        name: 'Fill Nulls',
        type: 'transform',
        description: 'Replace missing (NaN/Null) values with a specified value.',
        icon: Sliders,
        category: 'Data Quality',
        color: 'text-lime-500 bg-lime-500/10 border-lime-500/20',
        configSchema: {
            "columns": "list[string] (optional)",
            "value": "any",
            "method": "string ('ffill', 'bfill')"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "fill_nulls",
  "config": {
    "value": 0,
    "columns": ["score", "count"]
  }
}`
    },
    {
        id: 'deduplicate',
        name: 'Deduplicate',
        type: 'transform',
        description: 'Remove duplicate rows based on specific columns.',
        icon: Copy,
        category: 'Data Quality',
        color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
        configSchema: {
            "subset": "list[string]",
            "keep": "string ('first', 'last', false)"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "deduplicate",
  "config": {
    "subset": ["email"],
    "keep": "last"
  }
}`
    },
    // --- Advanced ---
    {
        id: 'code',
        name: 'Python Code',
        type: 'transform',
        description: 'Execute arbitrary Python code to transform the DataFrame.',
        icon: Code2,
        category: 'Advanced',
        color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
        configSchema: {
            "code": "string"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "code",
  "config": {
    "code": "def transform(df):\n    df['total'] = df['price'] * df['qty']\n    return df"
  }
}`
    },
    {
        id: 'regex_replace',
        name: 'Regex Replace',
        type: 'transform',
        description: 'Replace string patterns using Regular Expressions.',
        icon: FileCode,
        category: 'Formatting',
        color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
        configSchema: {
            "column": "string",
            "pattern": "string",
            "replacement": "string"
        },
        example: `{ 
  "operator_type": "transform",
  "operator_class": "regex_replace",
  "config": {
    "column": "phone",
    "pattern": "[^0-9]",
    "replacement": ""
  }
}`
    },
    {
        id: 'validate',
        name: 'Validate Schema',
        type: 'validate',
        description: 'Enforce schema rules and data expectations.',
        icon: CheckCircle2,
        category: 'Data Quality',
        color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
        configSchema: {
            "schema": "dict (column: type)",
            "strict": "boolean"
        },
        example: `{ 
  "operator_type": "validate",
  "operator_class": "schema_check",
  "config": {
    "schema": { "id": "int", "email": "string" },
    "strict": true
  }
}`
    },
    {
        id: 'noop',
        name: 'No-Op',
        type: 'noop',
        description: 'Pass-through operator for testing or placeholders.',
        icon: PlayCircle,
        category: 'Advanced',
        color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
        configSchema: {},
        example: `{ 
  "operator_type": "noop",
  "config": {}
}`
    }
];
