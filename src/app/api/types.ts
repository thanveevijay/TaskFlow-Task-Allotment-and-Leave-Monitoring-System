export type AccessRole = "manager" | "employee";

export type Employee = {
  id: string;
  name: string;
  email: string;
  accessRole?: "manager" | "employee";
  role: string;
  department: string;
  avatar: string;
  avatarUrl?: string;
  leaveBalance: number;
  /** Gross monthly salary (INR) before leave-based deductions. */
  monthlySalary?: number;
  tasksCompleted?: number;
  tasksInProgress?: number;
};

export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  assignedToId: string | null;
  assignedTo: string;
  priority: TaskPriority;
  deadline: string;
  description: string;
  status: TaskStatus;
  priorityScore?: number;
  smartPriorityLabel?: "Low" | "Medium" | "High" | "Critical";
  dependentTaskIds?: string[];
  closedAt?: string | null;
  originalAssigneeId?: string | null;
  originalAssigneeName?: string;
  reassignmentNote?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  comments?: { id: string; text: string; authorId: string; authorName: string; createdAt: string }[];
  checklists?: { id: string; text: string; isCompleted: boolean }[];
  recurrence?: string;
  aiStrategySuggestion?: string;
};

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveRequest = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  leaveType?: "Casual" | "Sick" | "Earned";
  isPaid?: boolean;
  handovers?: { taskId: string; substituteEmployeeId: string }[];
  appliedOn: string;
  conflictWarning?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

