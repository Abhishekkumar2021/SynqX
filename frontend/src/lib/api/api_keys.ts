import { api } from "./base";
import { type ApiKey, type ApiKeyCreate, type ApiKeyCreated } from "./types";

export const getApiKeys = async () => {
  const { data } = await api.get<ApiKey[]>("/api-keys/");
  return data;
};

export const createApiKey = async (payload: ApiKeyCreate) => {
  const { data } = await api.post<ApiKeyCreated>("/api-keys/", payload);
  return data;
};

export const revokeApiKey = async (keyId: number) => {
  const { data } = await api.delete<ApiKey>(`/api-keys/${keyId}`);
  return data;
};
