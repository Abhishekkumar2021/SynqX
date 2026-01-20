import { api } from './base'
import { type EphemeralJobResponse } from './types'

export const executeQuery = async (
  connectionId: number,
  payload: {
    query: string
    limit?: number
    offset?: number
    params?: Record<string, unknown>
    agent_group?: string
  }
) => {
  const { data } = await api.post<EphemeralJobResponse>(
    `/explorer/${connectionId}/execute`,
    payload
  )
  return data
}

export const getEphemeralJob = async (jobId: number) => {
  const { data } = await api.get<EphemeralJobResponse>(`/explorer/jobs/${jobId}`)
  return data
}

export const getEphemeralActivity = async (params?: { job_type?: string; limit?: number }) => {
  const { data } = await api.get<EphemeralJobResponse[]>('/explorer/activity', { params })
  return data
}

export const clearEphemeralActivity = async () => {
  await api.delete('/explorer/activity')
}
