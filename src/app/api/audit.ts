import { api } from "./http";

export type AuditLogItem = {
  id: string;
  timestamp: string | null;
  actor: string;
  actionType: string;
  targetType: string;
  targetId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string;
};

export type AuditLogsResponse = {
  page: number;
  limit: number;
  total: number;
  items: AuditLogItem[];
};

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  actionType?: string;
  actor?: string;
}): Promise<AuditLogsResponse> {
  const res = await api.get<AuditLogsResponse>("/audit-logs", { params });
  return res.data;
}
