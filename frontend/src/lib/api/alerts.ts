import { api } from "./base";
import { 
  type Alert, 
  type AlertConfig, 
  type AlertConfigUpdate,
  type AlertListResponse
} from "./types";

export const getAlertConfigs = async () => {
  const { data } = await api.get<AlertConfig[]>("/alerts");
  return data;
};

export const createAlertConfig = async (payload: Partial<AlertConfig>) => {
  const { data } = await api.post<AlertConfig>("/alerts", payload);
  return data;
};

export const getAlertConfig = async (id: number) => {
  const { data } = await api.get<AlertConfig>(`/alerts/configs/${id}`);
  return data;
};

export const updateAlertConfig = async (
  id: number,
  payload: AlertConfigUpdate
) => {
  const { data } = await api.patch<AlertConfig>(`/alerts/configs/${id}`, payload);
  return data;
};

export const deleteAlertConfig = async (id: number) => {
  const { data } = await api.delete(`/alerts/configs/${id}`);
  return data;
};

export const getAlertHistory = async (
  skip: number = 0,
  limit: number = 100
) => {
  const { data } = await api.get<AlertListResponse>("/alerts/history", {
    params: { skip, limit },
  });
  return data;
};

export const acknowledgeAlert = async (id: number) => {
  const { data } = await api.patch<Alert>(`/alerts/history/${id}`, {
    status: "acknowledged",
    acknowledged_at: new Date().toISOString(),
  });
  return data;
};
