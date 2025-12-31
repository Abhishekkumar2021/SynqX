import { api } from "./base";
import { type AuditLogsResponse } from "./types";

export const getAuditLogs = async (
  skip: number = 0,
  limit: number = 100,
  userId?: number,
  eventType?: string,
  targetType?: string,
  targetId?: number
) => {
  const params: Record<string, string | number | boolean | undefined> = { skip, limit };
  if (userId) params.user_id = userId;
  if (eventType) params.event_type = eventType;
  if (targetType) params.target_type = targetType;
  if (targetId) params.target_id = targetId;

  const { data } = await api.get<AuditLogsResponse>("/audit", { params });
  return data;
};