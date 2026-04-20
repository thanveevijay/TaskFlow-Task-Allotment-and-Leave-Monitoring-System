import { api } from "./http";

export type ActivityNotification = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: string;
  createdAt: string | null;
};

export async function getNotifications(limit = 12): Promise<ActivityNotification[]> {
  const res = await api.get<ActivityNotification[]>("/notifications", {
    params: { limit },
  });
  return res.data;
}

export type InAppNotification = {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string;
  createdAt: string | null;
};

export async function getInAppNotifications(limit = 10): Promise<InAppNotification[]> {
  const res = await api.get<InAppNotification[]>("/notifications/in-app", { params: { limit } });
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{ unread: number }>("/notifications/unread-count");
  return Number(res.data.unread || 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}

export type NotificationPrefs = {
  leaveApprovedEmail: boolean;
  leaveRejectedEmail: boolean;
  taskAssignedEmail: boolean;
  deadlineSoonEmail: boolean;
  newLeaveSubmittedEmail: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await api.get<NotificationPrefs>("/notification-prefs");
  return res.data;
}

export async function patchNotificationPrefs(payload: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const res = await api.patch<NotificationPrefs>("/notification-prefs", payload);
  return res.data;
}
