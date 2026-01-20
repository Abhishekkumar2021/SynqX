import { api } from './base'
import {
  type Connection,
  type ConnectionCreate,
  type ConnectionListResponse,
  type ConnectionTestResult,
  type Asset,
  type AssetCreate,
  type AssetUpdate,
  type AssetListResponse,
  type AssetBulkCreate,
  type AssetBulkCreateResponse,
  type SchemaDiscoveryResponse,
  type SchemaVersion,
  type AssetSampleData,
  type ConnectionImpact,
  type ConnectionUsageStats,
  type ConnectionEnvironmentInfo,
} from './types'

export const getConnections = async () => {
  const { data } = await api.get<ConnectionListResponse>('/connections')
  return data.connections
}

export const getConnection = async (id: number) => {
  const { data } = await api.get<Connection>(`/connections/${id}`)
  return data
}

export const createConnection = async (payload: ConnectionCreate) => {
  const { data } = await api.post<Connection>('/connections', payload)
  return data
}

export const updateConnection = async (id: number, payload: any) => {
  const { data } = await api.patch<Connection>(`/connections/${id}`, payload)
  return data
}

export const deleteConnection = async (id: number) => {
  await api.delete(`/connections/${id}`)
}

export const testConnection = async (id: number, config: any = {}) => {
  const { data } = await api.post<ConnectionTestResult>(`/connections/${id}/test`, { config })
  return data
}

export const testConnectionAdhoc = async (connectorType: string, config: any) => {
  const { data } = await api.post<ConnectionTestResult>('/connections/test-adhoc', {
    connector_type: connectorType,
    config,
  })
  return data
}

export const discoverAssets = async (id: number, includeMetadata: boolean = false) => {
  const { data } = await api.post<any>(`/connections/${id}/discover`, {
    include_metadata: includeMetadata,
  })
  return data
}

export const getConnectionAssets = async (id: number) => {
  const { data } = await api.get<AssetListResponse>(`/connections/${id}/assets`, {
    params: { limit: 1000 },
  })
  return data.assets
}

export const createAsset = async (connectionId: number, payload: AssetCreate) => {
  const { data } = await api.post<Asset>(`/connections/${connectionId}/assets`, payload)
  return data
}

export const bulkCreateAssets = async (connectionId: number, payload: AssetBulkCreate) => {
  const { data } = await api.post<AssetBulkCreateResponse>(
    `/connections/${connectionId}/assets/bulk-create`,
    payload
  )
  return data
}

export const updateAsset = async (connectionId: number, assetId: number, payload: AssetUpdate) => {
  const { data } = await api.patch<Asset>(`/connections/${connectionId}/assets/${assetId}`, payload)
  return data
}

export const deleteAsset = async (connectionId: number, assetId: number) => {
  await api.delete(`/connections/${connectionId}/assets/${assetId}`)
}

export const discoverAssetSchema = async (connectionId: number, assetId: number) => {
  const { data } = await api.post<SchemaDiscoveryResponse>(
    `/connections/${connectionId}/assets/${assetId}/discover-schema`,
    { force_refresh: true }
  )
  return data
}

export const getAssetSchemaVersions = async (connectionId: number, assetId: number) => {
  const { data } = await api.get<SchemaVersion[]>(
    `/connections/${connectionId}/assets/${assetId}/schema-versions`
  )
  return data
}

export const getAssetSampleData = async (
  connectionId: number,
  assetId: number,
  limit: number = 100
) => {
  const { data } = await api.get<AssetSampleData>(
    `/connections/${connectionId}/assets/${assetId}/sample`,
    { params: { limit } }
  )
  return data
}

export const getConnectionImpact = async (connectionId: number) => {
  const { data } = await api.get<ConnectionImpact>(`/connections/${connectionId}/impact`)
  return data
}

export const getConnectionUsageStats = async (connectionId: number) => {
  const { data } = await api.get<ConnectionUsageStats>(`/connections/${connectionId}/usage-stats`)
  return data
}

export const getConnectionEnvironment = async (connectionId: number) => {
  const { data } = await api.get<ConnectionEnvironmentInfo>(
    `/connections/${connectionId}/environment`
  )
  return data
}

export const initializeEnvironment = async (connectionId: number, language: string) => {
  const { data } = await api.post<{ status: string; path: string }>(
    `/connections/${connectionId}/environment/initialize`,
    { language }
  )
  return data
}

export const listDependencies = async (connectionId: number, language: string) => {
  const { data } = await api.get<Record<string, string>>(
    `/connections/${connectionId}/dependencies/${language}`
  )
  return data
}

export const installDependency = async (connectionId: number, language: string, pkg: string) => {
  const { data } = await api.post<{ output: string }>(
    `/connections/${connectionId}/dependencies/${language}/install`,
    { package: pkg }
  )
  return data
}

export const uninstallDependency = async (connectionId: number, language: string, pkg: string) => {
  const { data } = await api.post<{ output: string }>(
    `/connections/${connectionId}/dependencies/${language}/uninstall`,
    { package: pkg }
  )
  return data
}

export const getConnectionMetadata = async (
  connectionId: number,
  method: string,
  params: any = {}
) => {
  const { data } = await api.post<any>(`/connections/${connectionId}/metadata`, { method, params })
  return data
}
