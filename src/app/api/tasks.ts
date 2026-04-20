import { api } from "./http";
import type { Task, TaskPriority, TaskStatus } from "./types";

type TasksPage = { items: Task[]; page: number; limit: number; total: number };

export async function getTasks(assignedToId?: string | null): Promise<Task[]> {
  const res = await api.get<Task[] | TasksPage>("/tasks", {
    params: assignedToId ? { assignedToId } : undefined,
  });
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function createTask(input: {
  title: string;
  assignedToId: string | null;
  priority: TaskPriority;
  deadline: string;
  description: string;
  dependentTaskIds?: string[];
  recurrence?: string;
}): Promise<Task> {
  const res = await api.post<Task>("/tasks", {
    title: input.title,
    assignedToId: input.assignedToId,
    priority: input.priority,
    deadline: input.deadline,
    description: input.description,
    dependentTaskIds: input.dependentTaskIds || [],
    status: "Pending",
    recurrence: input.recurrence || "none",
  });
  return res.data;
}

export async function getSmartSuggestions(): Promise<{
  items: {
    id: string;
    title: string;
    assignedToId: string | null;
    assignedTo: string;
    priorityScore: number;
    suggestedSubstitutes: { id: string; name: string }[];
  }[];
}> {
  const res = await api.get("/tasks/smart-suggestions");
  return res.data;
}

export async function reassignTask(taskId: string, newAssignedToId: string): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${taskId}/reassign`, { newAssignedToId });
  return res.data;
}

export async function updateTaskStatus(input: {
  id: string;
  status: TaskStatus;
}): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${input.id}/status`, { status: input.status });
  return res.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}

export async function addTaskComment(taskId: string, text: string): Promise<Task> {
  const res = await api.post<Task>(`/tasks/${taskId}/comments`, { text });
  return res.data;
}

export async function addTaskChecklist(taskId: string, text: string): Promise<Task> {
  const res = await api.post<Task>(`/tasks/${taskId}/checklists`, { text });
  return res.data;
}

export async function toggleTaskChecklist(taskId: string, itemId: string, isCompleted: boolean): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${taskId}/checklists/${itemId}`, { isCompleted });
  return res.data;
}

