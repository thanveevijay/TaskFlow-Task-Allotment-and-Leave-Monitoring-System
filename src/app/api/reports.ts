import { api } from "./http";
import type { AccessRole, Employee, LeaveRequest, Task } from "./types";

export type ReportsResponse = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  employeesOnLeave: number;
  tasks: Task[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
};

export async function getReports(params: { role: AccessRole; employeeId?: string | null }): Promise<ReportsResponse> {
  const res = await api.get<ReportsResponse>("/reports", {
    params: {
      role: params.role,
      employeeId: params.employeeId || undefined,
    },
  });
  return res.data;
}

export type DepartmentMetric = {
  department: string;
  headcount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  avgTaskCompletionRate: number;
  totalApprovedLeaveDays: number;
  leaveUtilisationPercent: number;
  totalPayrollCost: number;
};

export async function getDepartmentAnalytics(
  month: number,
  year: number,
  includeAll?: boolean
): Promise<{ month: number; year: number; rows: DepartmentMetric[] }> {
  const res = await api.get<{ month: number; year: number; rows: DepartmentMetric[] }>("/reports/departments", {
    params: { month, year, includeAll: includeAll ? "1" : undefined },
  });
  return res.data;
}

