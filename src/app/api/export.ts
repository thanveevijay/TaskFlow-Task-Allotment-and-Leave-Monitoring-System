import { getApiBaseUrl } from "./http";
import { getAuthToken } from "../lib/authToken";

export function openAuditExportCsv(params: { actor?: string; actionType?: string }) {
  const token = getAuthToken();
  const url = new URL(`${getApiBaseUrl()}/audit-logs/export.csv`);
  if (params.actor) url.searchParams.set("actor", params.actor);
  if (params.actionType) url.searchParams.set("actionType", params.actionType);

  fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    })
    .catch(() => {});
}

export function openExport(type: "leave" | "tasks" | "audit" | "payroll-summary" | "payslip", params?: Record<string, string>) {
  const token = getAuthToken();
  const url = new URL(`${getApiBaseUrl()}/export/${type}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      const ext = type === "payroll-summary" || type === "payslip" ? "pdf" : "csv";
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(href);
    })
    .catch(() => {});
}
