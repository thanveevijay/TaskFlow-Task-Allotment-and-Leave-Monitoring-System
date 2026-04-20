import { api } from "./http";

export type KudosItem = {
  id: string;
  senderName?: string;
  receiverName?: string;
  category: string;
  message: string;
  createdAt: string | null;
};

export async function createKudos(input: {
  receiverId: string;
  taskId: string;
  category: string;
  message?: string;
}): Promise<KudosItem> {
  const res = await api.post<KudosItem>("/kudos", input);
  return res.data;
}

export async function getRecentKudos(): Promise<KudosItem[]> {
  const res = await api.get<KudosItem[]>("/kudos/recent");
  return res.data;
}

export async function getKudosLeaderboard(): Promise<{ items: { employeeId: string; employeeName: string; count: number }[] }> {
  const res = await api.get<{ items: { employeeId: string; employeeName: string; count: number }[] }>("/kudos/leaderboard");
  return res.data;
}
