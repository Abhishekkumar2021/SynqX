/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OSDUKind {
    name: string;
    type: string;
    rows: number;
    schema: string;
    metadata?: {
        authority: string;
        source: string;
        entity_type: string;
        group: string;
        entity_name: string;
        version: string;
        acl?: any;
        legal?: any;
    };
}

export type ViewMode = 'list' | 'grid' | 'domain';
