import { api } from "./base";

export const listRemoteFiles = async (connectionId: number, path: string = "") => {
  const { data } = await api.get(`/files/${connectionId}/list`, {
    params: { path },
  });
  return data;
};

export const downloadRemoteFile = async (connectionId: number, path: string) => {
  const { data } = await api.get(`/files/${connectionId}/download`, {
    params: { path },
    responseType: "blob",
  });
  return data;
};

export const downloadRemoteDirectory = async (connectionId: number, path: string) => {
  const { data } = await api.get(`/files/${connectionId}/zip`, {
    params: { path },
    responseType: "blob",
  });
  return data;
};

export const uploadRemoteFile = async (connectionId: number, path: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/files/${connectionId}/upload`, formData, {
    params: { path },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const saveRemoteFile = async (connectionId: number, path: string, content: string) => {
  const { data } = await api.post(`/files/${connectionId}/save`, {
    path,
    content,
  });
  return data;
};

export const deleteRemoteFile = async (connectionId: number, path: string) => {
  const { data } = await api.delete(`/files/${connectionId}/delete`, {
    params: { path },
  });
  return data;
};

export const createRemoteDirectory = async (connectionId: number, path: string) => {
  const { data } = await api.post(`/files/${connectionId}/mkdir`, null, {
    params: { path },
  });
  return data;
};