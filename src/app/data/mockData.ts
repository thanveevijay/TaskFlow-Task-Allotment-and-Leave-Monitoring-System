export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  assignedToId: string;
  priority: 'Low' | 'Medium' | 'High';
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  tasksCompleted: number;
  tasksInProgress: number;
  leaveBalance: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
}

export const employees: Employee[] = [
  {
    id: 'emp1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'Senior Developer',
    department: 'Engineering',
    avatar: 'SJ',
    tasksCompleted: 45,
    tasksInProgress: 3,
    leaveBalance: 12
  },
  {
    id: 'emp2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'UI/UX Designer',
    department: 'Design',
    avatar: 'MC',
    tasksCompleted: 38,
    tasksInProgress: 5,
    leaveBalance: 15
  },
  {
    id: 'emp3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    role: 'Product Manager',
    department: 'Product',
    avatar: 'ER',
    tasksCompleted: 52,
    tasksInProgress: 4,
    leaveBalance: 8
  },
  {
    id: 'emp4',
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'Backend Developer',
    department: 'Engineering',
    avatar: 'DK',
    tasksCompleted: 41,
    tasksInProgress: 6,
    leaveBalance: 18
  },
  {
    id: 'emp5',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@company.com',
    role: 'QA Engineer',
    department: 'Quality',
    avatar: 'LA',
    tasksCompleted: 36,
    tasksInProgress: 2,
    leaveBalance: 10
  }
];

export const tasks: Task[] = [
  {
    id: 'task1',
    title: 'Implement user authentication system',
    assignedTo: 'Sarah Johnson',
    assignedToId: 'emp1',
    priority: 'High',
    deadline: '2026-02-15',
    status: 'In Progress',
    description: 'Set up JWT-based authentication with refresh tokens'
  },
  {
    id: 'task2',
    title: 'Design dashboard mockups',
    assignedTo: 'Michael Chen',
    assignedToId: 'emp2',
    priority: 'High',
    deadline: '2026-02-12',
    status: 'In Progress',
    description: 'Create high-fidelity mockups for the new dashboard'
  },
  {
    id: 'task3',
    title: 'Write API documentation',
    assignedTo: 'Emily Rodriguez',
    assignedToId: 'emp3',
    priority: 'Medium',
    deadline: '2026-02-20',
    status: 'Pending',
    description: 'Document all REST API endpoints with examples'
  },
  {
    id: 'task4',
    title: 'Database optimization',
    assignedTo: 'David Kim',
    assignedToId: 'emp4',
    priority: 'High',
    deadline: '2026-02-14',
    status: 'In Progress',
    description: 'Optimize slow queries and add proper indexing'
  },
  {
    id: 'task5',
    title: 'Test payment integration',
    assignedTo: 'Lisa Anderson',
    assignedToId: 'emp5',
    priority: 'High',
    deadline: '2026-02-18',
    status: 'Pending',
    description: 'End-to-end testing of Stripe payment flow'
  },
  {
    id: 'task6',
    title: 'Update privacy policy',
    assignedTo: 'Emily Rodriguez',
    assignedToId: 'emp3',
    priority: 'Low',
    deadline: '2026-02-25',
    status: 'Pending',
    description: 'Review and update privacy policy for GDPR compliance'
  },
  {
    id: 'task7',
    title: 'Fix mobile responsiveness',
    assignedTo: 'Sarah Johnson',
    assignedToId: 'emp1',
    priority: 'Medium',
    deadline: '2026-02-16',
    status: 'Completed',
    description: 'Resolve layout issues on mobile devices'
  },
  {
    id: 'task8',
    title: 'Create onboarding flow',
    assignedTo: 'Michael Chen',
    assignedToId: 'emp2',
    priority: 'Medium',
    deadline: '2026-02-22',
    status: 'In Progress',
    description: 'Design user onboarding experience'
  },
  {
    id: 'task9',
    title: 'Performance monitoring setup',
    assignedTo: 'David Kim',
    assignedToId: 'emp4',
    priority: 'Low',
    deadline: '2026-03-01',
    status: 'Pending',
    description: 'Integrate New Relic for performance monitoring'
  },
  {
    id: 'task10',
    title: 'Accessibility audit',
    assignedTo: 'Lisa Anderson',
    assignedToId: 'emp5',
    priority: 'Medium',
    deadline: '2026-02-28',
    status: 'Completed',
    description: 'Complete WCAG 2.1 AA compliance audit'
  }
];

export const leaveRequests: LeaveRequest[] = [
  {
    id: 'leave1',
    employeeId: 'emp2',
    employeeName: 'Michael Chen',
    fromDate: '2026-02-17',
    toDate: '2026-02-19',
    reason: 'Family vacation',
    status: 'Pending',
    appliedOn: '2026-02-08'
  },
  {
    id: 'leave2',
    employeeId: 'emp3',
    employeeName: 'Emily Rodriguez',
    fromDate: '2026-02-24',
    toDate: '2026-02-26',
    reason: 'Medical appointment',
    status: 'Approved',
    appliedOn: '2026-02-05'
  },
  {
    id: 'leave3',
    employeeId: 'emp1',
    employeeName: 'Sarah Johnson',
    fromDate: '2026-03-10',
    toDate: '2026-03-15',
    reason: 'Personal leave',
    status: 'Pending',
    appliedOn: '2026-02-09'
  },
  {
    id: 'leave4',
    employeeId: 'emp4',
    employeeName: 'David Kim',
    fromDate: '2026-02-14',
    toDate: '2026-02-14',
    reason: 'Sick leave',
    status: 'Approved',
    appliedOn: '2026-02-13'
  },
  {
    id: 'leave5',
    employeeId: 'emp5',
    employeeName: 'Lisa Anderson',
    fromDate: '2026-02-20',
    toDate: '2026-02-21',
    reason: 'Conference attendance',
    status: 'Rejected',
    appliedOn: '2026-02-07'
  }
];

export const recentActivities = [
  { id: 1, user: 'Sarah Johnson', action: 'completed task', task: 'Fix mobile responsiveness', time: '2 hours ago' },
  { id: 2, user: 'Michael Chen', action: 'updated status', task: 'Design dashboard mockups', time: '4 hours ago' },
  { id: 3, user: 'David Kim', action: 'started working on', task: 'Database optimization', time: '5 hours ago' },
  { id: 4, user: 'Lisa Anderson', action: 'completed task', task: 'Accessibility audit', time: '1 day ago' },
  { id: 5, user: 'Emily Rodriguez', action: 'applied for leave', task: 'Feb 24-26', time: '5 days ago' }
];
