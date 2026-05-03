import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import {
  CheckSquare, Clock, Calendar, Wallet,
  Download, CheckCircle, AlertTriangle, Bell, RefreshCw, Heart,
} from 'lucide-react';
import { getMonthlyPayroll, requestPayslip, type PayrollRow } from '../api/payroll';
import { formatINR } from '../lib/formatMoney';
import { getReports, type ReportsResponse } from '../api/reports';
import { getRecentKudos } from '../api/kudos';
import { updateTaskStatus, toggleTaskChecklist } from '../api/tasks';
import { getInAppNotifications, markAllNotificationsRead, type InAppNotification } from '../api/notifications';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ActivityFeed } from '../components/ActivityFeed';

/* ─── Animated counter ─── */
function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 40));
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span className={className}>{display}</span>;
}

/* ─── Stat card ─── */
function StatCard({ title, value, subtitle, icon: Icon, gradient }: {
  title: string; value: number | string; subtitle: string; icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="glass-card relative rounded-2xl p-6 overflow-hidden card-lift">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-gradient-to-br ${gradient}`} />
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br ${gradient} shadow-lg shadow-black/20`}>
        <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
      </div>
      <div className="text-3xl font-black text-white">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </div>
      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">{title}</p>
      <p className="text-white/20 text-[10px] mt-0.5 font-medium">{subtitle}</p>
    </div>
  );
}

/* ─── Circular Progress Ring ─── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 26; const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div className="relative flex items-center justify-center">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={r} className="progress-ring-track" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
        <motion.circle cx="35" cy="35" r={r}
          className="progress-ring-fill"
          stroke="url(#ring-grad)"
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ transformOrigin: '35px 35px', transform: 'rotate(-90deg)' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─── Kanban task card ─── */
function TaskCard({ task, getPriorityColor, setLocalTasks }: { 
  task: any; 
  getPriorityColor: (p: string) => { bg: string; text: string; border: string };
  setLocalTasks: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const daysUntil = task.deadline ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000) : 999;
  const colors = getPriorityColor(task.priority);
  const isUrgent = daysUntil >= 0 && daysUntil <= 2 && task.status !== 'Completed';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div 
          draggable
          onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
          className="glass-card mb-4 p-4 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-white/[0.05] transition-all group border-white/5"
        >
          <div className="flex items-start justify-between mb-3">
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${colors.bg.replace('/10', '/20')} ${colors.text} ${colors.border}`}>
              {task.priority || 'Medium'}
            </span>
            {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
          </div>
          <h4 className="text-sm font-bold text-white mb-2 leading-tight group-hover:text-violet-400 transition-colors">{task.title}</h4>
          <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-white/30" />
              <span className={`text-[10px] font-bold ${isUrgent ? 'text-rose-400' : 'text-white/30'}`}>
                {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
              </span>
            </div>
            {task.checklists && task.checklists.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-white/20">
                <CheckCircle className="w-3 h-3" />
                {task.checklists.filter((c: any) => c.isCompleted).length}/{task.checklists.length}
              </div>
            )}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 p-0 overflow-hidden max-w-xl shadow-2xl">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black text-white">{task.title}</DialogTitle>
              <p className="text-sm text-white/40">{task.description || 'No description provided.'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Deadline</span>
              <p className="text-sm font-semibold text-white/80">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                <p className="text-sm font-semibold text-white/80">{task.status}</p>
              </div>
            </div>
          </div>
          {task.checklists && task.checklists.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Checklist</span>
              <div className="space-y-2">
                {task.checklists.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group/item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const updated = await toggleTaskChecklist(task.id, item.id, !item.isCompleted);
                        setLocalTasks(prev => prev.map(t => t.id === task.id ? updated : t));
                        toast.success('Checklist updated');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'Update failed');
                      }
                    }}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${item.isCompleted ? 'bg-violet-500 border-violet-500' : 'border-white/20 group-hover/item:border-white/40'}`}>
                      {item.isCompleted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-sm transition-colors ${item.isCompleted ? 'text-white/40 line-through' : 'text-white/80'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeeDashboard() {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [payrollRow, setPayrollRow] = useState<PayrollRow | null>(null);
  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [recentKudos, setRecentKudos] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifShownRef = useRef(false);

  useEffect(() => {
    const role = localStorage.getItem('accessRole') as any;
    const empId = localStorage.getItem('employeeId');
    getReports({ role, employeeId: empId }).then(setReports).catch(() => {});
    const now = new Date();
    getMonthlyPayroll(now.getFullYear(), now.getMonth() + 1).then(res => {
      if (Array.isArray(res.rows) && res.rows.length > 0) {
        const myRow = res.rows.find((r: any) => r.employeeId === empId) || res.rows[0];
        setPayrollRow(myRow);
      }
    }).catch(() => {});
    getRecentKudos().then(setRecentKudos).catch(() => {});
    const p = localStorage.getItem('userProfile');
    if (p) setProfile(JSON.parse(p));

    // ── Login-time notification pop-ups ──
    if (!notifShownRef.current) {
      notifShownRef.current = true;
      getInAppNotifications(20).then(notifs => {
        const unread = notifs.filter(n => !n.isRead);
        setNotifications(notifs);
        if (unread.length === 0) return;

        // Show first 3 as toasts with a slight delay between each
        const toShow = unread.slice(0, 3);
        toShow.forEach((n, i) => {
          setTimeout(() => {
            const icon = n.type === 'success' ? '🎉' : n.type === 'warning' ? '⚠️' : n.type === 'task' ? '📋' : '🔔';
            const toastFn = n.type === 'success' ? toast.success
              : n.type === 'warning' ? toast.warning
              : toast.info;
            toastFn(`${icon} ${n.message}`, {
              duration: 6000,
              description: n.createdAt ? `${new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : undefined,
            });
          }, i * 800);
        });

        if (unread.length > 3) {
          setTimeout(() => {
            toast.info(`🔔 You have ${unread.length - 3} more unread notifications`, {
              description: 'Click the bell icon to view all',
              duration: 5000,
            });
          }, 3 * 800 + 400);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (reports?.tasks) setLocalTasks(reports.tasks);
  }, [reports]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const tasks = localTasks || [];
  const empId = localStorage.getItem('employeeId');
  const currentEmployee = reports?.employees?.find(e => e.id === empId);
  const currentEmployeeSafe = currentEmployee || { leaveBalance: 0, tasksCompleted: 0, tasksInProgress: 0 };
  
  // Fix: Completion rate handle potentially missing summary
  const compRateRaw = ((currentEmployeeSafe.tasksCompleted || 0) / (((currentEmployeeSafe.tasksCompleted || 0) + (currentEmployeeSafe.tasksInProgress || 0)) || 1)) * 100;
  const completionRate = Math.min(100, Math.max(0, compRateRaw));

  const dueSoonCount = tasks.filter(t => t.status !== 'Completed' && t.deadline && Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000) <= 3).length;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'High': return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
      case 'Medium': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
      default: return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    }
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    const id = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === id);
    if (task && task.status !== status) {
      try {
        const updated = await updateTaskStatus({ id, status: status as any });
        setLocalTasks(prev => prev.map(p => p.id === id ? updated : p));
        toast.success(`Task moved to ${status}`);
      } catch (err: any) { 
        const msg = err?.response?.data?.message || 'Move failed';
        toast.error(msg); 
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back, <span className="bg-gradient-to-r from-violet-400 to-sky-400 text-transparent bg-clip-text truncate">{profile?.name?.split(' ')[0] || 'Team'}</span>
          </h1>
          <p className="text-white/30 text-sm mt-1">Status check: {tasks.filter(t => t.status !== 'Completed').length} tasks remaining.</p>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel(v => !v)}
            className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <Bell className="w-4 h-4 text-white/60" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          <AnimatePresence>
            {showNotifPanel && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 z-50 rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'rgba(13,18,35,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-400" />
                    <span className="text-white font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-violet-500/20 text-violet-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                      <RefreshCw className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-white/20 text-xs">No notifications yet</div>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/[0.03] ${!n.isRead ? 'bg-violet-500/[0.04]' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'success' ? 'bg-emerald-400' :
                        n.type === 'warning' ? 'bg-amber-400' :
                        n.type === 'task' ? 'bg-sky-400' : 'bg-violet-400'
                      } ${!n.isRead ? '' : 'opacity-30'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${!n.isRead ? 'text-white/80' : 'text-white/40'}`}>{n.message}</p>
                        {n.createdAt && (
                          <p className="text-[10px] text-white/20 mt-0.5">
                            {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 page-enter" style={{ animationDelay: '60ms' }}>
        <StatCard title="Open Tasks" value={tasks.filter(t => t.status !== 'Completed').length} subtitle="In your queue" icon={CheckSquare} gradient="from-sky-500 to-blue-600" />
        <StatCard title="Due Soon" value={dueSoonCount} subtitle="Next 72 hours" icon={Clock} gradient="from-amber-500/80 to-orange-600" />
        <StatCard title="Leave Left" value={currentEmployeeSafe.leaveBalance} subtitle="Available days" icon={Calendar} gradient="from-emerald-500 to-green-600" />
        <div className="glass-card relative rounded-2xl p-6 overflow-hidden flex items-center gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-violet-500" />
          <ProgressRing pct={completionRate} />
          <div>
            <div className="text-3xl font-black text-white">{completionRate.toFixed(0)}%</div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">Velocity</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start page-enter" style={{ animationDelay: '120ms' }}>
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Pending', 'In Progress', 'Completed'].map((status) => (
              <div 
                key={status}
                className="flex flex-col min-h-[400px]"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/[0.02]'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('bg-white/[0.02]')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-white/[0.02]'); handleDrop(e, status); }}
              >
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${status === 'Completed' ? 'bg-emerald-500' : status === 'In Progress' ? 'bg-amber-500' : 'bg-white/40'}`} />
                  <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest">{status}</h3>
                  <span className="ml-auto text-[10px] font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {tasks.filter(t => t.status === status).map(t => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <TaskCard task={t} getPriorityColor={getPriorityColor} setLocalTasks={setLocalTasks} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <ActivityFeed />
          
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="text-white font-bold text-lg">Team Recognition</h3>
            </div>
            <div className="space-y-4">
              {recentKudos.length === 0 ? (
                <div className="text-white/20 text-xs text-center py-4">No recent kudos</div>
              ) : recentKudos.slice(0, 3).map((k) => (
                <div key={k.id} className="flex gap-3 items-start group">
                  <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    <Heart className="w-4 h-4 text-pink-400 fill-pink-400/20" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      <span className="font-bold text-white">{k.senderName}</span> appreciated <span className="font-bold text-white">{k.receiverName}</span>
                    </p>
                    <p className="text-[10px] text-pink-300/60 mt-1 font-medium">{k.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="w-5 h-5 text-violet-400" />
              <h3 className="text-white font-bold text-lg">Pay Summary</h3>
            </div>
            {payrollRow && (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold text-white/20 uppercase block mb-1">Estimated Net</span>
                    <div className="text-3xl font-black text-white tabular-nums">{formatINR(payrollRow.netSalary)}</div>
                  </div>
                  <Button onClick={async () => {
                    try {
                      const now = new Date();
                      await requestPayslip(now.getMonth() + 1, now.getFullYear());
                      toast.success('Payslip requested from your manager');
                    } catch (e) {
                      toast.error('Failed to request slip');
                    }
                  }} size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl h-9 px-4">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
