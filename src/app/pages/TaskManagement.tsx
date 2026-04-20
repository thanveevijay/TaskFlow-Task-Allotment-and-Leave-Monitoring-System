import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { ErrorBoundary } from '../components/ui/error-boundary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  Calendar,
  User,
  Zap,
  RefreshCw,
  LayoutGrid,
  Flame,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  ChevronRight,
  Circle,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { getEmployees } from '../api/employees';
import { createTask, deleteTask, getTasks, updateTaskStatus, addTaskComment, addTaskChecklist, toggleTaskChecklist } from '../api/tasks';
import type { Employee, Task, TaskPriority, TaskStatus } from '../api/types';
import { createKudos } from '../api/kudos';
import { toast } from 'sonner';
import { getStoredUserProfile } from '../lib/userProfile';

/* ─────────────────────────────────────────── helpers ─── */

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; accent: string; glow: string; bg: string }[] = [
  {
    status: 'Pending',
    label: 'Pending',
    icon: <Clock className="w-4 h-4" />,
    accent: 'text-slate-300',
    glow: 'shadow-slate-500/20',
    bg: 'from-slate-500/10 to-slate-600/5',
  },
  {
    status: 'In Progress',
    label: 'In Progress',
    icon: <Flame className="w-4 h-4" />,
    accent: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    bg: 'from-amber-500/10 to-amber-600/5',
  },
  {
    status: 'Completed',
    label: 'Completed',
    icon: <CheckCircle2 className="w-4 h-4" />,
    accent: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    bg: 'from-emerald-500/10 to-emerald-600/5',
  },
];

const PRIORITY_CONFIG = {
  High: {
    label: 'High',
    color: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    dot: 'bg-rose-400',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  Medium: {
    label: 'Medium',
    color: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400',
    icon: <Zap className="w-3 h-3" />,
  },
  Low: {
    label: 'Low',
    color: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
    dot: 'bg-slate-400',
    icon: <ChevronRight className="w-3 h-3" />,
  },
};

function formatDeadline(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (diff < 0) return { label, overdue: true };
  if (diff <= 2) return { label, urgent: true };
  return { label };
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ─────────────────────────────────────── Task Card ─── */

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onOpenChat,
  isManager,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onOpenChat: (task: Task) => void;
  isManager: boolean;
}) {
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium;
  const dl = task.deadline ? formatDeadline(task.deadline) : null;
  const commentCount = task.comments?.length ?? 0;

  return (
    <div
      className="group relative rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-sm
                 hover:bg-white/[0.07] hover:border-white/15 hover:shadow-xl
                 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => onOpenChat(task)}
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.35)' }}
    >
      {/* Priority accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl ${
          task.priority === 'High'
            ? 'bg-gradient-to-r from-rose-500 to-rose-400'
            : task.priority === 'Medium'
            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
            : 'bg-gradient-to-r from-slate-500 to-slate-400'
        }`}
      />

      <div className="p-4">
        {/* Title + priority */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-2 flex-1">
            {task.title}
          </h3>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.color}`}
          >
            {p.icon}
            {p.label}
          </span>
        </div>

        {/* AI Strategy Suggestion Snippet */}
        {task.aiStrategySuggestion && (
          <div className="mb-3 p-2 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-2 group/ai transition-all hover:bg-violet-500/10">
            <Sparkles className="w-3 h-3 text-violet-400 mt-0.5 shrink-0 animate-pulse" />
            <p className="text-[10px] text-violet-300/80 leading-relaxed italic">
              {task.aiStrategySuggestion}
            </p>
          </div>
        )}

        {/* Description snippet */}
        {task.description && (
          <p className="text-xs text-white/40 line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Assignee */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            {initials(task.assignedTo || 'UN')}
          </div>
          <span className="text-xs text-white/50 truncate">{task.assignedTo || 'Unassigned'}</span>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            {dl && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  dl.overdue
                    ? 'text-rose-400'
                    : dl.urgent
                    ? 'text-amber-400'
                    : 'text-white/40'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {dl.overdue ? 'Overdue' : dl.label}
              </span>
            )}
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="inline-flex items-center gap-1 text-[10px] text-violet-400">
                <RefreshCw className="w-3 h-3" />
                {task.recurrence}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                <MessageSquare className="w-3 h-3" />
                {commentCount}
              </span>
            )}

            {/* Status change select — stop propagation so card click doesn't open chat */}
            <div onClick={(e) => e.stopPropagation()}>
              <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
                <SelectTrigger className="h-6 px-2 text-[10px] bg-white/5 border-white/10 text-white/60 rounded-lg hover:bg-white/10 w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141a2e] border-white/10 text-white text-xs">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isManager && (
              <div onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="p-1 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#141a2e] border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/50">
                        Are you sure you want to delete "{task.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/10 text-white/70 hover:bg-white/5">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white border-0"
                        onClick={() => onDelete(task.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Kanban Column ─── */

function KanbanColumn({
  column,
  tasks,
  onStatusChange,
  onDelete,
  onOpenChat,
  isManager,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onOpenChat: (task: Task) => void;
  isManager: boolean;
}) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl mb-3 bg-gradient-to-br ${column.bg} border border-white/5`}
      >
        <span className={column.accent}>{column.icon}</span>
        <span className={`text-sm font-semibold ${column.accent}`}>{column.label}</span>
        <span className="ml-auto text-xs font-bold bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-white/8 text-white/20 text-xs gap-2">
            <LayoutGrid className="w-6 h-6 opacity-40" />
            No tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onOpenChat={onOpenChat}
              isManager={isManager}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────── Main Component ─── */

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [smartSort, setSmartSort] = useState(false);

  const [kudosDialogOpen, setKudosDialogOpen] = useState(false);
  const [kudosTaskId, setKudosTaskId] = useState<string | null>(null);
  const [kudosReceiverId, setKudosReceiverId] = useState('');
  const [kudosCategory, setKudosCategory] = useState('Great collaboration');
  const [kudosMessage, setKudosMessage] = useState('');

  const [selectedTaskForChat, setSelectedTaskForChat] = useState<Task | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [checklistInput, setChecklistInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const accessRole = localStorage.getItem('accessRole') as 'manager' | 'employee' | null;
  const employeeId = localStorage.getItem('employeeId');
  const isManager = accessRole === 'manager';
  const myDepartment = getStoredUserProfile()?.department || '';
  const departmentEmployees = employees.filter(
    (e) => (!myDepartment || e.department === myDepartment) && e.accessRole === 'employee',
  );
  const kudosEligibleEmployees = employees.filter(
    (e) => !myDepartment || e.department === myDepartment,
  );

  const [newTask, setNewTask] = useState({
    title: '',
    assignedToId: '',
    priority: 'Medium' as TaskPriority,
    deadline: '',
    description: '',
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [empList, taskList] = await Promise.all([
          getEmployees(),
          getTasks(isManager ? null : employeeId),
        ]);
        setEmployees(empList);
        setTasks(taskList);
      } catch {
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isManager, employeeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTaskForChat?.comments]);

  const filteredTasks = tasks
    .filter((task) => {
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPriority && matchesSearch;
    })
    .sort((a, b) =>
      smartSort ? Number(b.priorityScore || 0) - Number(a.priorityScore || 0) : 0,
    );

  const tasksByStatus = (status: TaskStatus) => filteredTasks.filter((t) => t.status === status);

  const handleCreateTask = async () => {
    if (!isManager) return;
    try {
      const created = await createTask({
        title: newTask.title,
        assignedToId: newTask.assignedToId || null,
        priority: newTask.priority,
        deadline: newTask.deadline,
        description: newTask.description,
        recurrence: newTask.recurrence,
      });
      setTasks([...tasks, created]);
      setIsDialogOpen(false);
      setNewTask({ title: '', assignedToId: '', priority: 'Medium', deadline: '', description: '', recurrence: 'none' });
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updated = await updateTaskStatus({ id: taskId, status: newStatus as Task['status'] });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
      toast.success(`Moved to ${newStatus}`);
      if (newStatus === 'Completed' && employeeId) {
        setKudosTaskId(taskId);
        setKudosReceiverId('');
        setKudosCategory('Great collaboration');
        setKudosMessage('');
        setKudosDialogOpen(true);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((x) => x.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Could not delete task');
    }
  };

  const submitKudos = async () => {
    if (!kudosTaskId || !kudosReceiverId) {
      toast.error('Select a colleague to send kudos');
      return;
    }
    try {
      await createKudos({ receiverId: kudosReceiverId, taskId: kudosTaskId, category: kudosCategory, message: kudosMessage });
      toast.success('Kudos sent! 🎉');
      setKudosDialogOpen(false);
      setKudosTaskId(null);
      setKudosReceiverId('');
      setKudosMessage('');
    } catch {
      toast.error('Failed to send kudos');
    }
  };

  const handleSendComment = async () => {
    if (!selectedTaskForChat || !chatInput.trim()) return;
    try {
      const updated = await addTaskComment(selectedTaskForChat.id, chatInput);
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTaskForChat(updated);
      setChatInput('');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleSendChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForChat || !checklistInput.trim()) return;
    try {
      const updated = await addTaskChecklist(selectedTaskForChat.id, checklistInput);
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTaskForChat(updated);
      setChecklistInput('');
    } catch {
      toast.error('Failed to add checklist item');
    }
  };

  const handleToggleChecklist = async (itemId: string, isCompleted: boolean) => {
    if (!selectedTaskForChat) return;
    try {
      // Optimistic UI update
      const updatedMockType = { ...selectedTaskForChat, checklists: (selectedTaskForChat.checklists||[]).map((c:any) => c.id === itemId ? { ...c, isCompleted } : c) };
      setSelectedTaskForChat(updatedMockType as any);
      setTasks(tasks.map(t => t.id === selectedTaskForChat.id ? (updatedMockType as any) : t));

      const updated = await toggleTaskChecklist(selectedTaskForChat.id, itemId, isCompleted);
      setSelectedTaskForChat(updated);
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      toast.error('Failed to toggle checklist');
    }
  };

  const totalTasks = filteredTasks.length;
  const completedCount = tasksByStatus('Completed').length;
  const completionPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <ErrorBoundary>
      {/* Page background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden>
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="lg" text="Loading tasks…" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-rose-400">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                  Task Board
                </h1>
                <p className="text-sm text-white/40">
                  {totalTasks} tasks · {completionPct}% complete
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {isManager && (
                  <Button
                    variant={smartSort ? 'default' : 'outline'}
                    onClick={() => setSmartSort((v) => !v)}
                    className={`rounded-xl text-sm gap-2 transition-all ${
                      smartSort
                        ? 'bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-500/25'
                        : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white bg-transparent'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Smart Sort
                  </Button>
                )}

                {isManager && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/30 gap-2 transition-all">
                        <Plus className="w-4 h-4" />
                        Create Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px] bg-[#0f1117] border border-white/10 text-white rounded-2xl shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold">New Task</DialogTitle>
                        <DialogDescription className="text-white/40 text-sm">
                          Add and assign a task to your team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-xs uppercase tracking-wide">Title</Label>
                          <Input
                            placeholder="Enter task title…"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-violet-500/60"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-xs uppercase tracking-wide">
                            Assign to
                            {myDepartment && (
                              <span className="normal-case font-normal ml-2 text-white/30">
                                — {myDepartment} dept.
                              </span>
                            )}
                          </Label>
                          <Select
                            value={newTask.assignedToId}
                            onValueChange={(v) => setNewTask({ ...newTask, assignedToId: v })}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white/80 rounded-xl focus:border-violet-500/60">
                              <User className="w-4 h-4 mr-2 text-white/30" />
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                              {departmentEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name} – {emp.role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wide">Priority</Label>
                            <Select
                              value={newTask.priority}
                              onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10 text-white/80 rounded-xl focus:border-violet-500/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wide">Recurrence</Label>
                            <Select
                              value={newTask.recurrence}
                              onValueChange={(v: any) => setNewTask({ ...newTask, recurrence: v })}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10 text-white/80 rounded-xl focus:border-violet-500/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                                <SelectItem value="none">One-time</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs uppercase tracking-wide">Deadline</Label>
                            <Input
                              type="date"
                              value={newTask.deadline}
                              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                              className="bg-white/5 border-white/10 text-white/80 rounded-xl focus:border-violet-500/60"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-xs uppercase tracking-wide">Description</Label>
                          <Textarea
                            placeholder="Describe the task…"
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            rows={3}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-violet-500/60 resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="border-white/10 text-white/60 hover:bg-white/5 rounded-xl bg-transparent"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateTask}
                          disabled={!newTask.title.trim()}
                          className="bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg shadow-violet-500/20"
                        >
                          Create Task
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* ── Progress bar ── */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-5">
              <div className="flex-1">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/40 font-medium">Overall Progress</span>
                  <span className="text-xs text-white/60 font-bold">{completionPct}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-6 text-center shrink-0">
                {COLUMNS.map((col) => (
                  <div key={col.status}>
                    <p className={`text-xl font-bold ${col.accent}`}>
                      {tasksByStatus(col.status).length}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{col.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search tasks or assignees…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-violet-500/50"
                />
              </div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white/70 rounded-xl hover:bg-white/8">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Kanban Board ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.status}
                  column={col}
                  tasks={tasksByStatus(col.status)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onOpenChat={setSelectedTaskForChat}
                  isManager={isManager}
                />
              ))}
            </div>

            {/* ── Kudos Dialog ── */}
            <Dialog open={kudosDialogOpen} onOpenChange={setKudosDialogOpen}>
              <DialogContent className="bg-[#0f1117] border border-white/10 text-white rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg">🎉 Give Kudos?</DialogTitle>
                  <DialogDescription className="text-white/40 text-sm">
                    Recognize a colleague who helped you close this task.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Colleague</Label>
                    <Select value={kudosReceiverId} onValueChange={setKudosReceiverId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white/80 rounded-xl">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                        {kudosEligibleEmployees
                          .filter((e) => e.id !== employeeId)
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} ({e.accessRole === 'manager' ? 'Manager' : e.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Category</Label>
                    <Select value={kudosCategory} onValueChange={setKudosCategory}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white/80 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                        <SelectItem value="Great collaboration">Great collaboration</SelectItem>
                        <SelectItem value="Fast turnaround">Fast turnaround</SelectItem>
                        <SelectItem value="Saved the day">Saved the day</SelectItem>
                        <SelectItem value="Above and beyond">Above and beyond</SelectItem>
                        <SelectItem value="Mentorship">Mentorship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">Message (optional)</Label>
                    <Textarea
                      placeholder="Add a personal note…"
                      value={kudosMessage}
                      onChange={(e) => setKudosMessage(e.target.value)}
                      rows={2}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl resize-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setKudosDialogOpen(false)}
                    className="border-white/10 text-white/60 hover:bg-white/5 rounded-xl bg-transparent"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={submitKudos}
                    className="bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl"
                  >
                    Send Kudos
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* ── Task Chat/Details Dialog ── */}
            <Dialog
              open={!!selectedTaskForChat}
              onOpenChange={(open) => !open && setSelectedTaskForChat(null)}
            >
              <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col bg-[#0f1117] border border-white/10 text-white rounded-2xl p-0 overflow-hidden">
                {/* Dialog header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/8 shrink-0">
                  <div className="flex items-start gap-3">
                    <div>
                      <DialogTitle className="text-white text-base font-bold leading-snug">
                        {selectedTaskForChat?.title}
                      </DialogTitle>
                      <DialogDescription className="text-white/40 text-xs mt-1">
                        {selectedTaskForChat?.assignedTo
                          ? `Assigned to ${selectedTaskForChat.assignedTo}`
                          : 'Unassigned'}
                        {selectedTaskForChat?.deadline && (
                          <> · Due {new Date(selectedTaskForChat.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                      </DialogDescription>
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {selectedTaskForChat && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_CONFIG[selectedTaskForChat.priority]?.color ?? ''}`}
                        >
                          {PRIORITY_CONFIG[selectedTaskForChat.priority]?.label}
                        </span>
                      )}
                      {selectedTaskForChat?.recurrence && selectedTaskForChat.recurrence !== 'none' && (
                        <Badge className="bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] rounded-full gap-1">
                          <RefreshCw className="w-2.5 h-2.5" />
                          {selectedTaskForChat.recurrence}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {selectedTaskForChat?.description && (
                    <p className="mt-3 text-xs text-white/40 leading-relaxed bg-white/5 rounded-xl px-3 py-2.5">
                      {selectedTaskForChat.description}
                    </p>
                  )}
                </div>

                {/* Checklists area */}
                <div className="px-6 py-4 border-b border-white/8 space-y-3">
                  <h3 className="text-sm font-bold text-white/90 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    Definition of Done
                  </h3>
                  <div className="space-y-2">
                    {(!selectedTaskForChat?.checklists || selectedTaskForChat.checklists.length === 0) && (
                      <p className="text-xs text-white/30 italic">No checklist items.</p>
                    )}
                    {selectedTaskForChat?.checklists && selectedTaskForChat.checklists.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-3 p-2 rounded-xl border border-white/10 bg-white/5">
                        <button onClick={() => handleToggleChecklist(c.id, !c.isCompleted)} className="mt-0.5 shrink-0 focus:outline-none">
                          {c.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-white/30 hover:text-white/50" />}
                        </button>
                        <span className={`text-sm ${c.isCompleted ? 'text-white/30 line-through' : 'text-white/80'} font-medium`}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendChecklist} className="relative mt-3">
                    <input type="text" placeholder="Add checklist item..." value={checklistInput} onChange={e => setChecklistInput(e.target.value)}
                      className="w-full text-sm rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 pr-12" />
                    <button type="submit" disabled={!checklistInput.trim()} className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50">
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Comments area */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 bg-black/10">
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                    Comments & Activity
                  </p>
                  {(selectedTaskForChat?.comments?.length ?? 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-white/20 text-xs gap-2">
                      <MessageSquare className="w-8 h-8 opacity-40" />
                      No comments yet. Start the discussion!
                    </div>
                  ) : (
                    selectedTaskForChat?.comments?.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {initials(c.authorName)}
                        </div>
                        <div className="flex-1 bg-white/[0.04] border border-white/8 rounded-2xl rounded-tl-none px-3 py-2.5">
                          <div className="flex justify-between items-baseline mb-1 gap-2">
                            <span className="text-xs font-semibold text-white/80">{c.authorName}</span>
                            <span className="text-[10px] text-white/25 shrink-0">
                              {new Date(c.createdAt).toLocaleString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="px-6 pb-5 pt-3 border-t border-white/8 flex gap-2 shrink-0">
                  <Input
                    placeholder="Write a comment…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-violet-500/50 flex-1"
                  />
                  <Button
                    onClick={handleSendComment}
                    disabled={!chatInput.trim()}
                    className="bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl px-4 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
