import { api } from "./http";

export type WorkloadTask = { id: string; title: string; status: string };
export type WorkloadDay = { date: string; count: number; tasks: WorkloadTask[] };
export type WorkloadRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  days: WorkloadDay[];
};

export type WorkloadResponse = {
  week: "current" | "next";
  range: { start: string; end: string };
  rows: WorkloadRow[];
};

export async function getTeamWorkload(week: "current" | "next"): Promise<WorkloadResponse> {
  const res = await api.get<WorkloadResponse>("/reports/workload", { params: { week } });
  return res.data;
}
