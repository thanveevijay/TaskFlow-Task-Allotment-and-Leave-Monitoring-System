import { useEffect, useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import {
  TrendingDown, TrendingUp, UserX,
  AlertCircle, Trophy, Zap, Activity, Layers, ChevronRight, Bell, RefreshCw, Heart,
} from 'lucide-react';
import { getInAppNotifications, markAllNotificationsRead, type InAppNotification } from '../api/notifications';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getReports, type ReportsResponse } from '../api/reports';
import { getTeamWorkload, type WorkloadDay, type WorkloadResponse } from '../api/workload';
import { getStockQuote } from '../api/stock';
import { getDepartmentAnalytics, type DepartmentMetric } from '../api/reports';
import { getKudosLeaderboard, getRecentKudos, type KudosItem } from '../api/kudos';
import { getSmartSuggestions, reassignTask } from '../api/tasks';
import { ActivityFeed } from '../components/ActivityFeed';
import { TeamHeatmap } from '../components/TeamHeatmap';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

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

/* ─── Sparkline SVG ─── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const w = 80; const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="sparkline-svg opacity-70">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      {(() => { const [lx, ly] = pts[pts.length-1].split(',').map(Number); return (
        <circle cx={lx} cy={ly} r="2.5" fill={color} />
      ); })()}
    </svg>
  );
}

/* ─── Dept Completion Ring ─── */
function DeptRing({ label, pct, color }: { label: string; pct: number; color: string }) {
  const r = 22; const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r={r} className="dept-ring-track" />
          <circle cx="30" cy="30" r={r}
            className="dept-ring-fill"
            stroke={color}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset="0"
            style={{ transformOrigin: '30px 30px', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-400 text-center leading-tight max-w-[60px] truncate">{label}</span>
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({
  title, value, subtitle, icon: Icon, gradient, trend, trendLabel, sparkData, sparkColor,
}: {
  title: string; value: number; subtitle: string; icon: React.ElementType;
  gradient: string; trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
  sparkData?: number[]; sparkColor?: string;
}) {
  return (
    <div className="kpi-card relative rounded-2xl p-5 overflow-hidden card-lift"
      style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none bg-gradient-to-br ${gradient}`} />

      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        {trend && trendLabel && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-emerald-500/15 text-emerald-400'
            : trend === 'down' ? 'bg-rose-500/15 text-rose-400'
            : 'bg-slate-500/15 text-slate-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {trendLabel}
          </div>
        )}
      </div>

      <div className="kpi-value">
        <AnimatedNumber value={value} className="text-3xl font-black text-white" />
      </div>
      <p className="text-slate-400 text-xs font-medium mt-1">{title}</p>
      <p className="text-slate-600 text-xs mt-0.5">{subtitle}</p>

      {sparkData && sparkData.length > 1 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <Sparkline values={sparkData} color={sparkColor ?? '#0ea5e9'} />
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 p-3 shadow-xl text-xs"
      style={{ background: '#0d1526', backdropFilter: 'blur(20px)' }}>
      {label && <p className="text-slate-400 mb-2 font-medium">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-slate-200 font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ManagerDashboard() {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [workload, setWorkload] = useState<WorkloadResponse | null>(null);
  const [week, setWeek] = useState<'current' | 'next'>('current');
  const [selectedCell, setSelectedCell] = useState<{ employee: string; day: WorkloadDay } | null>(null);
  const [stock, setStock] = useState<{ symbol: string; currentPrice: number; changePct: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ employeeId: string; employeeName: string; count: number }[]>([]);
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; suggestedSubstitutes: { id: string; name: string }[] }[]>([]);
  const [departmentRows, setDepartmentRows] = useState<DepartmentMetric[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifShownRef = useRef(false);

  useEffect(() => {
    getReports({ role: 'manager' }).then(setReports).catch(console.error);
    const d = new Date();
    getDepartmentAnalytics(d.getMonth() + 1, d.getFullYear(), true)
      .then((r) => setDepartmentRows(r.rows)).catch(() => setDepartmentRows([]));

    // Login-time notification pop-ups
    if (!notifShownRef.current) {
      notifShownRef.current = true;
      getInAppNotifications(20).then(notifs => {
        const unread = notifs.filter(n => !n.isRead);
        setNotifications(notifs);
        if (unread.length === 0) return;

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

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;


  useEffect(() => { getTeamWorkload(week).then(setWorkload).catch(() => setWorkload(null)); }, [week]);

  const [recentKudos, setRecentKudos] = useState<KudosItem[]>([]);

  useEffect(() => {
    getStockQuote(7).then((q) => setStock({ symbol: q.symbol, currentPrice: q.currentPrice, changePct: q.changePct })).catch(() => setStock(null));
    getKudosLeaderboard().then((r) => setLeaderboard(r.items)).catch(() => setLeaderboard([]));
    getRecentKudos().then(setRecentKudos).catch(() => setRecentKudos([]));
    getSmartSuggestions().then((r) => setSuggestions(r.items as any)).catch(() => setSuggestions([]));
  }, []);

  const tasks = reports?.tasks ?? [];
  const leaveRequests = reports?.leaveRequests ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline).getTime() < Date.now()).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date();

  return (
    <div className="space-y-7 stagger-children">
      {/* ── Header ── */}
      <div className="page-enter">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Welcome to operations 👋</p>
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Manager Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
              completionRate >= 70 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
              <Activity className="w-4 h-4" />
              {completionRate}% Completion
            </div>

            {/* Notification Bell */}
            <div className="relative z-50">
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
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 page-enter" style={{ animationDelay: '60ms' }}>
        <KpiCard title="Total Tasks" value={totalTasks} subtitle="All assigned"
          icon={Layers} gradient="from-sky-500 to-blue-600"
          sparkData={[40, 55, 45, 60, 50, 65]} sparkColor="#38bdf8" />
        <KpiCard title="In Progress" value={inProgressTasks} subtitle="Current sprint"
          icon={Zap} gradient="from-amber-500 to-orange-600" trend="up" trendLabel="+12%" />
        <KpiCard title="Overdue" value={overdueTasks} subtitle="Action required"
          icon={AlertCircle} gradient="from-rose-500 to-pink-600" trend="down" trendLabel="-4%" />
        <KpiCard title="Leave Requests" value={leaveRequests.filter(r => r.status === 'Pending').length} subtitle="Pending review"
          icon={UserX} gradient="from-emerald-500 to-teal-600" />
      </div>

      {/* ── Main Analytics Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 page-enter" style={{ animationDelay: '120ms' }}>
        {/* Status Breakdown (Doughnut) */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-white font-bold text-base mb-6" style={{ fontFamily: 'var(--font-display)' }}>Task Breakdown</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                    { name: 'Completed', value: completedTasks, color: '#10b981' },
                    { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
                    { name: 'Pending', value: pendingTasks, color: '#ef4444' },
                  ]} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {[0,1,2].map((_, i) => (
                    <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">{completionRate}%</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Done</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {['Done', 'Active', 'Queue'].map((l, i) => (
              <div key={l}>
                <div className="text-sm font-bold text-white">{[completedTasks, inProgressTasks, pendingTasks][i]}</div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Filter / List */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>Priority Tasks</h3>
              <p className="text-slate-500 text-xs mt-0.5">Overdue & high-priority items</p>
            </div>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="space-y-2">
            {tasks
              .filter(t => t.status !== 'Completed' && (t.priority === 'High' || new Date(t.deadline).getTime() < Date.now()))
              .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
              .slice(0, 5)
              .map(t => {
                const isOverdue = new Date(t.deadline).getTime() < Date.now();
                return (
                  <div key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors hover:bg-white/[0.04]"
                    style={{
                      borderColor: isOverdue ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.2)',
                      borderLeft: `3px solid ${isOverdue ? '#f87171' : '#fbbf24'}`,
                    }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{t.title}</p>
                      <p className="text-xs text-slate-500 truncate">{t.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${
                      isOverdue ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {isOverdue ? 'Overdue' : t.priority}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Dept Matrix */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-white font-bold text-base mb-6" style={{ fontFamily: 'var(--font-display)' }}>Dept. Performance</h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 h-full content-start">
            {departmentRows.slice(0, 4).map((r, i) => (
              <DeptRing key={r.department} label={r.department} pct={Math.round((r.completedTasks / (r.completedTasks + r.inProgressTasks + r.pendingTasks || 1)) * 100)}
                color={i % 2 === 0 ? '#8b5cf6' : '#0ea5e9'} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Visual Analytics & Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 page-enter" style={{ animationDelay: '180ms' }}>
        <div className="lg:col-span-5 h-[500px]">
          <ActivityFeed />
        </div>

        <div className="lg:col-span-7 space-y-8">
          <TeamHeatmap />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Team Health Score — replaces stock ticker */}
              {(() => {
                const healthScore = Math.min(100, Math.max(0,
                  Math.round(completionRate * 0.5 + (overdueTasks === 0 ? 25 : Math.max(0, 25 - overdueTasks * 4)) + (inProgressTasks > 0 ? 25 : 10))
                ));
                const trend = healthScore >= 75 ? 'up' : healthScore >= 50 ? 'neutral' : 'down';
                const trendColor = trend === 'up' ? '#10b981' : trend === 'neutral' ? '#f59e0b' : '#f43f5e';
                const label = trend === 'up' ? 'Healthy' : trend === 'neutral' ? 'At Risk' : 'Critical';
                return (
                  <div className="glass-card rounded-2xl p-5 hover:bg-white/[0.05] transition-colors cursor-default">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs tracking-widest text-white/30 font-bold uppercase">Team Health</div>
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold`}
                        style={{ background: `${trendColor}20`, color: trendColor }}>
                        {label}
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-black text-white">{healthScore}<span className="text-lg text-white/30">/100</span></div>
                        <div className="text-[10px] text-white/30 mt-1">{overdueTasks > 0 ? `${overdueTasks} overdue tasks` : 'No overdue tasks 🎉'}</div>
                      </div>
                      <Sparkline values={[40, 55, healthScore - 10, healthScore - 5, healthScore, healthScore + 2, healthScore]} color={trendColor} />
                    </div>
                    <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${healthScore}%`, background: `linear-gradient(90deg, ${trendColor}88, ${trendColor})` }} />
                    </div>
                  </div>
                );
              })()}

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Top Recognition</h3>
              </div>
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <div className="text-white/20 text-xs text-center py-4">No recognition data yet</div>
                ) : leaderboard.slice(0, 3).map((x) => (
                  <div key={x.employeeId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/40">
                        {x.employeeName ? x.employeeName.charAt(0) : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{x.employeeName || 'Unknown'}</div>
                        <div className="text-[10px] text-white/30">{x.count} points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-pink-400" />
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Recent Kudos</h3>
              </div>
              <div className="space-y-4">
                {recentKudos.length === 0 ? (
                  <div className="text-white/20 text-xs text-center py-4">No kudos given yet</div>
                ) : recentKudos.slice(0, 3).map((k) => (
                  <div key={k.id} className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Heart className="w-3 h-3 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/80"><span className="font-semibold text-white">{k.senderName}</span> gave kudos to <span className="font-semibold text-white">{k.receiverName}</span></p>
                      <p className="text-[10px] text-pink-300/70 mt-0.5">{k.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Smart Suggestions ── */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl p-5 page-enter" style={{ animationDelay: '240ms', background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-violet-400" />
            <h3 className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>Smart Suggestions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.slice(0, 6).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-slate-300 text-sm truncate">{s.title}</span>
                {s.suggestedSubstitutes?.[0] && (
                  <Button size="sm" variant="outline"
                    className="shrink-0 h-7 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 rounded-xl"
                    onClick={() => reassignTask(s.id, s.suggestedSubstitutes[0].id)
                      .then(() => toast.success('Task reassigned'))
                      .catch(() => toast.error('Could not reassign'))}>
                    → {s.suggestedSubstitutes[0].name}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Team Workload Grid ── */}
      <div className="rounded-2xl p-5 page-enter" style={{ animationDelay: '300ms', background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
           <h3 className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>Workload Distribution</h3>
           <div className="flex gap-2">
            {(['current', 'next'] as const).map(w => (
              <button key={w}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  week === w ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 border border-white/10 hover:bg-white/5'
                }`}
                onClick={() => setWeek(w)}>
                {w === 'current' ? 'This week' : 'Next week'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 font-bold uppercase tracking-widest border-b border-white/5">
                <th className="py-3 px-2">Manager / Lead</th>
                {(workload?.rows[0]?.days || []).map(d => (
                  <th key={d.date} className="py-3 px-2 text-center">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(workload?.rows || []).map(row => (
                <tr key={row.employeeId}>
                  <td className="py-4 px-2 text-slate-200 font-semibold">{row.employeeName}</td>
                  {row.days.map(day => (
                    <td key={day.date} className="py-4 px-2 text-center">
                      <button 
                        onClick={() => setSelectedCell({ employee: row.employeeName, day })}
                        className={`w-8 h-8 rounded-lg font-bold transition-all hover:scale-110 ${
                          day.count === 0 ? 'bg-white/5 text-white/20' : 
                          day.count <= 2 ? 'bg-emerald-500/20 text-emerald-400' :
                          day.count <= 4 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                        {day.count}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {selectedCell && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 border-t border-white/5 pt-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white">
                  {selectedCell.employee} <span className="text-white/30 ml-2 font-normal">{new Date(selectedCell.day.date).toLocaleDateString()}</span>
                </h4>
                <button onClick={() => setSelectedCell(null)} className="text-xs text-white/20 hover:text-white">Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCell.day.tasks.length === 0 ? (
                  <p className="text-xs text-white/20 italic">No tasks assigned for this day.</p>
                ) : (
                  selectedCell.day.tasks.map(t => (
                    <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                      <span className="text-xs text-white/70">{t.title}</span>
                      <ChevronRight className="w-3 h-3 text-white/20" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
