import { api } from './base'
import { type AuditLogsResponse } from './types'

export const getAuditLogs = async (
  skip: number = 0,
  limit: number = 100,
  userId?: number,
  eventType?: string,
  targetType?: string,
  targetId?: number,
  status?: string,
  startDate?: string,
  endDate?: string,
  sortBy: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  const params: Record<string, string | number | boolean | undefined> = {
    skip,
    limit,
    sort_by: sortBy,
    sort_order: sortOrder,
  }
  if (userId) params.user_id = userId
  if (eventType) params.event_type = eventType
  if (targetType) params.target_type = targetType
  if (targetId) params.target_id = targetId
  if (status) params.status = status
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate

  const { data } = await api.get<AuditLogsResponse>('/audit', { params })

  return data
}

export const exportAuditLogs = async (
  userId?: number,
  eventType?: string,
  status?: string,
  startDate?: string,
  endDate?: string
) => {
  const params: Record<string, string | number | boolean | undefined> = {}
  if (userId) params.user_id = userId
  if (eventType) params.event_type = eventType
  if (status) params.status = status
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate

  const { data } = await api.get('/audit/export', {
    params,
    responseType: 'blob',
  })

  return data
}
