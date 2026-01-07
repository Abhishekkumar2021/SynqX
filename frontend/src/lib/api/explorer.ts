import { api } from "./base";
import { 
  type ConnectionSchemaMetadata,
  type HistoryItem
} from "./types";

export const getConnectionSchemaMetadata = async (connectionId: number) => {
  const { data } = await api.get<ConnectionSchemaMetadata>(
    `/explorer/${connectionId}/schema-metadata`
  );
  return data;
};

export const getHistory = async (limit: number = 50, offset: number = 0) => {
  const { data } = await api.get<HistoryItem[]>("/explorer/history", {
    params: { limit, offset },
  });
  return data;
};

export const clearHistory = async () => {
  const { data } = await api.delete<{ status: string }>("/explorer/history");
  return data;
};
