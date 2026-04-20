import { api } from "./http";
import type { Employee } from "./types";

export async function getEmployees(): Promise<Employee[]> {
  const res = await api.get<Employee[]>("/employees");
  return res.data;
}

export type CreateEmployeePayload = {
  name: string;
  email: string;
  password: string;
  jobRole?: string;
  department?: string;
  accessRole: "employee" | "manager";
  leaveAllowance?: number;
  leaveBalance?: number;
};

export async function createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
  const res = await api.post<Employee>("/employees", payload);
  return res.data;
}

export async function uploadEmployeeAvatar(employeeId: string, file: File): Promise<Employee> {
  const fd = new FormData();
  fd.append("avatar", file);
  const res = await api.post<Employee>(`/employees/${employeeId}/avatar`, fd);
  return res.data;
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  await api.delete(`/employees/${employeeId}`);
}

