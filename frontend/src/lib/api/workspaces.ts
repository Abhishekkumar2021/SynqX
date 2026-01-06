import { api } from "./base";
import { 
  type WorkspaceRead, 
  type WorkspaceMember 
} from "./types";

export const getWorkspaces = async () => {
  const { data } = await api.get<WorkspaceRead[]>("/workspaces");
  return data;
};

export const createWorkspace = async (payload: { name: string; description?: string; default_agent_group?: string; git_config?: Record<string, unknown> }) => {
  const { data } = await api.post<WorkspaceRead>("/workspaces", payload);
  return data;
};

export const updateWorkspace = async (workspaceId: number, payload: { name?: string; description?: string; default_agent_group?: string; git_config?: Record<string, unknown>; clear_all_pipelines?: boolean }) => {
  const { data } = await api.patch<WorkspaceRead>(`/workspaces/${workspaceId}`, payload);
  return data;
};

export const deleteWorkspace = async (workspaceId: number) => {
  await api.delete(`/workspaces/${workspaceId}`);
};

export const switchWorkspace = async (workspaceId: number) => {
  const { data } = await api.post(`/workspaces/${workspaceId}/switch`);
  return data;
};

export const getWorkspaceMembers = async (workspaceId: number) => {
  const { data } = await api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  return data;
};

export const inviteWorkspaceMember = async (workspaceId: number, email: string, role: string) => {
  const { data } = await api.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, { email, role });
  return data;
};

export const updateWorkspaceMemberRole = async (workspaceId: number, userId: number, role: string) => {
  const { data } = await api.patch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, { role });
  return data;
};

export const removeWorkspaceMember = async (workspaceId: number, userId: number) => {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
};

export const exportWorkspace = async (workspaceId: number) => {
  const { data } = await api.get(`/workspaces/${workspaceId}/export`, {
    responseType: 'blob'
  });
  return data;
};
