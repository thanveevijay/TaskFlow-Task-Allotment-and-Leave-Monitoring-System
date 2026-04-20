import { api } from "./http";

export type LoginResponse = {
  token: string;
  accessRole: "manager" | "employee";
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    avatar: string;
    avatarUrl?: string;
    leaveBalance: number;
    monthlySalary?: number;
  };
};

export async function login(
  email: string,
  password: string,
  role: "manager" | "employee",
  managerAccessCode?: string
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/login", { email, password, role, managerAccessCode });
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}

export async function forgotPassword(email: string, role?: "manager" | "employee"): Promise<{ message: string; devResetCode?: string }> {
  const res = await api.post<{ message: string; devResetCode?: string }>("/auth/forgot-password", { email, role });
  return res.data;
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { email, code, newPassword });
}

export type SessionPayload = {
  accessRole: LoginResponse["accessRole"];
  employee: LoginResponse["employee"];
};

export async function fetchCurrentSession(): Promise<SessionPayload> {
  const res = await api.get<SessionPayload>("/auth/me");
  return res.data;
}

export async function updateMyProfile(payload: { name?: string; email?: string }): Promise<SessionPayload> {
  const res = await api.patch<SessionPayload>("/auth/me", payload);
  return res.data;
}

export async function uploadMyAvatar(file: File): Promise<LoginResponse["employee"]> {
  const fd = new FormData();
  fd.append("avatar", file);
  const res = await api.post<{ employee: LoginResponse["employee"] }>("/auth/avatar", fd);
  return res.data.employee;
}

