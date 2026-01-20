 
import { api } from './base'
import {
  type DashboardStats,
  type ThroughputDataPoint,
  type PipelineDistribution,
  type RecentActivity,
  type SystemHealth,
  type FailingPipeline,
  type SlowestPipeline,
  type DashboardAlert,
  type ConnectorHealth,
} from './types'

export const getDashboardStats = async (
  timeRange: string = '24h',
  startDate?: string,
  endDate?: string
) => {
  const params: any = { time_range: timeRange }
  if (timeRange === 'custom' && startDate) {
    params.start_date = startDate
    if (endDate) params.end_date = endDate
  }
  const { data } = await api.get<DashboardStats>('/dashboard/stats', {
    params,
  })
  return data
}

// Also export types needed for dashboard charts
export type {
  ThroughputDataPoint,
  PipelineDistribution,
  RecentActivity,
  SystemHealth,
  FailingPipeline,
  SlowestPipeline,
  DashboardAlert,
  ConnectorHealth,
}
