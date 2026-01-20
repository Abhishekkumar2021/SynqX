 
import { api } from './base'
import {
  type Job,
  type JobListResponse,
  type PipelineRunDetailRead,
  type StepRunRead,
} from './types'

export const getJobs = async (pipelineId?: number) => {
  const params = pipelineId ? { pipeline_id: pipelineId } : {}
  const { data } = await api.get<JobListResponse>('/jobs', { params })
  return data.jobs
}

export const getJob = async (id: number) => {
  const { data } = await api.get<Job>(`/jobs/${id}`)
  return data
}

export const getJobRun = async (jobId: number) => {
  const { data } = await api.get<PipelineRunDetailRead>(`/jobs/${jobId}/run`)
  return data
}

export const getRunSteps = async (runId: number) => {
  const { data } = await api.get<StepRunRead[]>(`/runs/${runId}/steps`)
  return data
}

export const getStepData = async (
  runId: number,
  stepId: number,
  direction: 'in' | 'out' | 'quarantine' = 'out',
  limit: number = 100,
  offset: number = 0
) => {
  const { data } = await api.get<any>(`/runs/${runId}/steps/${stepId}/data`, {
    params: { direction, limit, offset },
  })
  return data
}

export const getQuarantineList = async (limit: number = 50, offset: number = 0) => {
  const { data } = await api.get<any[]>('/quarantine', {
    params: { limit, offset },
  })
  return data
}

export const getJobLogs = async (id: number) => {
  const { data } = await api.get<any[]>(`/jobs/${id}/logs`)
  return data
}

export const cancelJob = async (id: number) => {
  const { data } = await api.post<Job>(`/jobs/${id}/cancel`)
  return data
}

export const retryJob = async (id: number) => {
  const { data } = await api.post<Job>(`/jobs/${id}/retry`, { force: true })
  return data
}

export const exportPipelineRun = async (runId: number) => {
  const { data } = await api.get(`/runs/${runId}/export`, {
    responseType: 'blob',
  })
  return data
}
