/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./base";
import { 
  type Pipeline,
  type PipelineCreate, 
  type PipelineListResponse, 
  type PipelineDetailRead,
  type PipelineStatsResponse,
  type PipelineVersionCreate,
  type PipelineVersionRead,
  type PipelineVersionSummary,
  type PipelineTriggerResponse
} from "./types";

export const getPipelines = async () => {
  const { data } = await api.get<PipelineListResponse>("/pipelines");
  return data.pipelines;
};

export const getPipeline = async (id: number) => {
  const { data } = await api.get<PipelineDetailRead>(`/pipelines/${id}`);
  return data;
};

export const getPipelineStats = async (id: number) => {
  const { data } = await api.get<PipelineStatsResponse>(
    `/pipelines/${id}/stats`
  );
  return data;
};

export const createPipeline = async (payload: PipelineCreate) => {
  const { data } = await api.post<PipelineDetailRead>("/pipelines", payload);
  return data;
};

export const updatePipeline = async (id: number, payload: any) => {
  const { data } = await api.patch<PipelineDetailRead>(
    `/pipelines/${id}`,
    payload
  );
  return data;
};

export const deletePipeline = async (id: number) => {
  await api.delete(`/pipelines/${id}`);
};

export const createPipelineVersion = async (
  id: number,
  payload: PipelineVersionCreate
) => {
  const { data } = await api.post<PipelineVersionRead>(
    `/pipelines/${id}/versions`,
    payload
  );
  return data;
};

export const getPipelineVersions = async (id: number) => {
  const { data } = await api.get<PipelineVersionSummary[]>(
    `/pipelines/${id}/versions`
  );
  return data;
};

export const getPipelineVersion = async (pipelineId: number, versionId: number) => {
  const { data } = await api.get<PipelineVersionRead>(
    `/pipelines/${pipelineId}/versions/${versionId}`
  );
  return data;
};

export const getPipelineDiff = async (pipelineId: number, baseV: number, targetV: number) => {
  const { data } = await api.get<any>(`/pipelines/${pipelineId}/diff`, {
    params: { base_v: baseV, target_v: targetV }
  });
  return data;
};

export const publishPipelineVersion = async (
  pipelineId: number,
  versionId: number
) => {
  const { data } = await api.post<any>(
    `/pipelines/${pipelineId}/versions/${versionId}/publish`,
    {}
  );
  return data;
};

export const triggerPipeline = async (id: number, versionId?: number) => {
  const { data } = await api.post<PipelineTriggerResponse>(
    `/pipelines/${id}/trigger`,
    {
      version_id: versionId,
    }
  );
  return data;
};

export const exportPipelineYAML = async (id: number, versionId?: number) => {
  const { data } = await api.get(`/pipelines/${id}/export`, {
    params: { version_id: versionId },
    responseType: 'blob'
  });
  return data;
};

export const importPipelineYAML = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<Pipeline>("/pipelines/import", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};
