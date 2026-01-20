import { Layers, Database, Shield, Globe } from 'lucide-react'

export interface DomainConfig {
  connectorType: string
  displayName: string // e.g. "Seabed Catalog"
  grouping: {
    field: (item: any) => string // Function to extract group
    label: string // e.g. "Module" or "Domain Group"
    icon?: any
  }
  filters: {
    id: string
    label: string
    getValue: (item: any) => string | undefined
    icon?: any
  }[]
  card: {
    getTitle: (item: any) => string
    getSubtitle: (item: any) => string
    badges: {
      getValue: (item: any) => string | undefined
      label?: string // If static label needed, otherwise value is used
      color?: string // Optional override
    }[]
    stats: {
      getValue: (item: any) => string | number | undefined
      label: string
      icon?: any
    }[]
  }
  registration: {
    assetType: string
    getFqn: (item: any) => string
    getSchemaMetadata: (item: any) => any
    getName: (item: any) => string
  }
}

export const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  osdu: {
    connectorType: 'osdu',
    displayName: 'OSDU Registry',
    grouping: {
      field: (item) => item.metadata?.group || 'Other',
      label: 'Domain Group',
      icon: Layers,
    },
    filters: [
      { id: 'source', label: 'Source', getValue: (i) => i.metadata?.source, icon: Globe },
      { id: 'authority', label: 'Authority', getValue: (i) => i.metadata?.authority, icon: Shield },
      {
        id: 'entity_type',
        label: 'Entity Type',
        getValue: (i) => i.metadata?.entity_type,
        icon: Database,
      },
    ],
    card: {
      getTitle: (i) => i.metadata?.entity_name || i.name,
      getSubtitle: (i) => i.name,
      badges: [
        { getValue: (i) => (i.metadata?.version ? `v${i.metadata.version}` : undefined) },
        { getValue: (i) => i.metadata?.entity_type },
      ],
      stats: [{ getValue: (i) => i.rows?.toLocaleString(), label: 'Records', icon: Database }],
    },
    registration: {
      assetType: 'osdu_kind',
      getName: (i) => i.name,
      getFqn: (i) => i.name,
      getSchemaMetadata: (i) => ({
        osdu_kind: i.name,
        entity_name: i.metadata?.entity_name,
        group: i.metadata?.group,
        version: i.metadata?.version,
        source: i.metadata?.source,
        authority: i.metadata?.authority,
        entity_type: i.metadata?.entity_type,
        acl: i.metadata?.acl,
        legal: i.metadata?.legal,
      }),
    },
  },
  prosource: {
    connectorType: 'prosource',
    displayName: 'Seabed Catalog',
    grouping: {
      field: (item) => item.metadata?.module || 'General',
      label: 'Logical Module',
      icon: Database,
    },
    filters: [
      { id: 'module', label: 'Module', getValue: (i) => i.metadata?.module, icon: Layers },
      { id: 'schema', label: 'Schema', getValue: (i) => i.schema, icon: Globe },
    ],
    card: {
      getTitle: (i) => i.name,
      getSubtitle: (i) => `${i.schema}.${i.metadata?.table || ''}`,
      badges: [],
      stats: [{ getValue: (i) => i.rows?.toLocaleString(), label: 'Records', icon: Database }],
    },
    registration: {
      assetType: 'domain_entity',
      getName: (i) => i.name,
      getFqn: (i) => `${i.schema}.${i.metadata?.table}`,
      getSchemaMetadata: (i) => ({
        module: i.metadata?.module,
        table: i.metadata?.table,
        schema: i.schema,
        is_seabed_standard: i.metadata?.is_seabed_standard,
      }),
    },
  },
}
