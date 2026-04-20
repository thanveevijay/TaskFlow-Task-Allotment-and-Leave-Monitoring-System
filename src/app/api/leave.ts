import { api } from "./http";
import type { LeaveRequest, LeaveStatus } from "./types";

export async function getLeaveRequests(employeeId?: string | null): Promise<LeaveRequest[]> {
  const res = await api.get<LeaveRequest[]>("/leave-requests", {
    params: employeeId ? { employeeId } : undefined,
  });
  return res.data;
}

export async function createLeaveRequest(input: {
  employeeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  leaveType?: "Casual" | "Sick" | "Earned";
  handovers?: { taskId: string; substituteEmployeeId: string }[];
}): Promise<LeaveRequest> {
  const res = await api.post<LeaveRequest>("/leave-requests", {
    employeeId: input.employeeId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason,
    leaveType: input.leaveType,
    handovers: input.handovers || [],
  });
  return res.data;
}

export async function updateLeaveStatus(input: {
  id: string;
  status: Exclude<LeaveStatus, "Pending"> | "Approved" | "Rejected";
  allowPartialUnpaid?: boolean;
}): Promise<LeaveRequest> {
  const res = await api.patch<LeaveRequest>(`/leave-requests/${input.id}/status`, {
    status: input.status,
    allowPartialUnpaid: input.allowPartialUnpaid,
  });
  return res.data;
}

