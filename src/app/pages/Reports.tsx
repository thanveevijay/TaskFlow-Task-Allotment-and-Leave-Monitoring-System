import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getReports, getDepartmentAnalytics, type ReportsResponse, type DepartmentMetric } from '../api/reports';
import { getMonthlyPayroll, sendPayslip, type MonthlyPayrollResponse } from '../api/payroll';
import { formatINR } from '../lib/formatMoney';
import { openExport } from '../api/export';
import { getStoredUserProfile } from '../lib/userProfile';
import { toast } from 'sonner';
import {
  TrendingUp, Users, CheckSquare, Wallet, AlertCircle,
  Download, BarChart3, PieChart as PieIcon, Activity,
} from 'lucide-react';

/* ── helpers ── */
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 40));
    const t = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

const CHART_COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const tooltipStyle = {
  background: 'rgba(10,15,30,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#e2e8f0',
  fontSize: '12px',
};

/* ── KPI card ── */
function KpiCard({ label, value, sub, icon: Icon, color, prefix = '', suffix = '' }: {
  label: string; value: number; sub: string; icon: React.ElementType;
  color: string; prefix?: string; suffix?: string;
}) {
  return (
    <div className="relative rounded-2xl p-5 overflow-hidden"
      style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-20`}
        style={{ background: color }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="text-2xl font-black text-white tabular-nums">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      <p className="text-xs font-semibold text-white/60 mt-1">{label}</p>
      <p className="text-xs text-white/25 mt-0.5">{sub}</p>
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <h2 className="text-white font-bold text-base">{title}</h2>
        {sub && <p className="text-white/30 text-xs">{sub}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [departmentRows, setDepartmentRows] = useState<DepartmentMetric[]>([]);
  const [payroll, setPayroll] = useState<MonthlyPayrollResponse | null>(null);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const profile = getStoredUserProfile();
  const managerDept = profile?.department || '';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getReports({ role: 'manager' }),
      getDepartmentAnalytics(payMonth, payYear),
      getMonthlyPayroll(payYear, payMonth),
    ]).then(([r, d, p]) => {
      setReports(r);
      setDepartmentRows(d.rows);
      setPayroll(p);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [payYear, payMonth]);

  /* ── Derived data ── */
  const allEmployees = reports?.employees ?? [];
  const employees = managerDept ? allEmployees.filter(e => e.department === managerDept) : allEmployees;
  const allTasks = reports?.tasks ?? [];
  const empIds = new Set(employees.map(e => e.id));
  const tasks = allTasks.filter(t => !t.assignedToId || empIds.has(t.assignedToId));

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const overdue = tasks.filter(t => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date()).length;
  const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const pieData = [
    { name: 'Completed', value: completed, color: '#10b981' },
    { name: 'In Progress', value: inProgress, color: '#f59e0b' },
    { name: 'Pending', value: pending, color: '#6366f1' },
    { name: 'Overdue', value: overdue, color: '#ef4444' },
  ].filter(d => d.value > 0);

  /* Tasks per employee bar chart */
  const tasksPerEmp = employees
    .map(emp => ({
      name: emp.name.split(' ')[0],
      Completed: tasks.filter(t => t.assignedToId === emp.id && t.status === 'Completed').length,
      Active: tasks.filter(t => t.assignedToId === emp.id && t.status !== 'Completed').length,
    }))
    .filter(e => e.Completed + e.Active > 0)
    .slice(0, 12);

  /* Monthly trend */
  const monthlyTrend = (() => {
    const buckets = new Map<string, { month: string; Completed: number; Assigned: number; key: number }>();
    for (const t of tasks) {
      const d = t.createdAt ? new Date(t.createdAt) : null;
      if (!d || isNaN(d.getTime())) continue;
      const key = d.getFullYear() * 100 + d.getMonth();
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const existing = buckets.get(String(key)) ?? { month: label, Completed: 0, Assigned: 0, key };
      existing.Assigned += 1;
      if (t.status === 'Completed') existing.Completed += 1;
      buckets.set(String(key), existing);
    }
    return Array.from(buckets.values()).sort((a, b) => a.key - b.key).slice(-6);
  })();

  /* Leave usage */
  const leaveData = employees
    .map(e => ({ name: e.name.split(' ')[0], Used: 20 - (e.leaveBalance ?? 20), Remaining: e.leaveBalance ?? 20 }))
    .filter(e => e.Used + e.Remaining > 0)
    .slice(0, 10);

  const myDeptRows = departmentRows.filter(r => !managerDept || r.department === managerDept);
  const payrollRows = (payroll?.rows ?? []).filter(r => !managerDept || r.department === managerDept);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto" />
          <p className="text-white/40 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Reports &amp; Analytics
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {managerDept ? `${managerDept} department` : 'All departments'} · Real-time performance insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Tasks" value={tasks.length} sub="Department scope" icon={CheckSquare} color="#8b5cf6" />
        <KpiCard label="Completion Rate" value={completionRate} sub={`${completed} done`} icon={TrendingUp} color="#10b981" suffix="%" />
        <KpiCard label="Team Members" value={employees.length} sub="Active employees" icon={Users} color="#0ea5e9" />
        <KpiCard label="Overdue Tasks" value={overdue} sub="Action required" icon={AlertCircle} color="#ef4444" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionHeader icon={PieIcon} title="Task Breakdown" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: `${d.color}12` }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-white/60 truncate">{d.name}</span>
                <span className="ml-auto text-xs font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionHeader icon={Activity} title="Completion Trend" sub="Last 6 months" />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <YAxis stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
              <Area type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} fill="url(#gc)" dot={{ r: 3, fill: '#10b981' }} />
              <Area type="monotone" dataKey="Assigned" stroke="#8b5cf6" strokeWidth={2} fill="url(#ga)" dot={{ r: 3, fill: '#8b5cf6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Per Employee */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionHeader icon={BarChart3} title="Tasks per Employee" sub="Top contributors" />
          {tasksPerEmp.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No task data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tasksPerEmp} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Bar dataKey="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Active" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leave Usage */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionHeader icon={Users} title="Leave Usage" sub="Used vs remaining" />
          {leaveData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">No leave data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leaveData} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={65} stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                <Bar dataKey="Used" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Remaining" fill="#10b981" stackId="a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Dept Analytics */}
      {myDeptRows.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionHeader icon={BarChart3} title="Department Analytics" sub="Performance breakdown" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Department', 'Headcount', 'Total Tasks', 'Done', 'In Progress', 'Completion %', 'Leave Days', 'Payroll Cost'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myDeptRows.map(d => (
                  <tr key={d.department} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-3 font-semibold text-white">{d.department}</td>
                    <td className="py-4 px-3 text-white/60">{d.headcount}</td>
                    <td className="py-4 px-3 text-white/60">{d.totalTasks}</td>
                    <td className="py-4 px-3 text-emerald-400 font-semibold">{d.completedTasks}</td>
                    <td className="py-4 px-3 text-amber-400 font-semibold">{d.inProgressTasks}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full max-w-[80px]">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.avgTaskCompletionRate}%` }} />
                        </div>
                        <span className="text-white/60 text-xs font-bold">{d.avgTaskCompletionRate}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-white/60">{d.totalApprovedLeaveDays}d</td>
                    <td className="py-4 px-3 text-white/60 tabular-nums">{formatINR(d.totalPayrollCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <SectionHeader icon={Wallet} title="Payroll Register" sub="Leave-adjusted net salaries" />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>Year</span>
              <input type="number" value={payYear} min={2020} max={2100}
                onChange={e => setPayYear(Number(e.target.value))}
                className="w-20 h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs focus:outline-none focus:border-violet-500/50" />
              <span>Month</span>
              <input type="number" value={payMonth} min={1} max={12}
                onChange={e => { const m = Number(e.target.value); if (m >= 1 && m <= 12) setPayMonth(m); }}
                className="w-16 h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-white text-xs focus:outline-none focus:border-violet-500/50" />
            </div>
            <button
              onClick={() => openExport('payroll-summary', { month: String(payMonth), year: String(payYear) })}
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:bg-violet-500/25 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                {['Employee', 'Department', 'Gross', 'Leave Days', 'Excess', 'Deduction', 'Net Salary', 'Payslip'].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payrollRows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-white/20">No payroll data for this period</td></tr>
              ) : payrollRows.map(row => (
                <tr key={row.employeeId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">{row.employeeName}</td>
                  <td className="py-3 px-3 text-white/40">{row.department || '—'}</td>
                  <td className="py-3 px-3 text-white/60 tabular-nums">{formatINR(row.monthlySalary)}</td>
                  <td className="py-3 px-3 text-white/60">{row.leaveDaysInMonth}d</td>
                  <td className="py-3 px-3 text-rose-400/80">{row.excessLeaveDays > 0 ? `${row.excessLeaveDays}d` : '—'}</td>
                  <td className="py-3 px-3 text-amber-400 font-semibold tabular-nums">
                    {row.deductionAmount > 0 ? `−${formatINR(row.deductionAmount)}` : '—'}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-400 tabular-nums">{formatINR(row.netSalary)}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openExport('payslip', { employeeId: row.employeeId, month: String(payMonth), year: String(payYear) })}
                        className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-xs font-semibold">
                        <Download className="w-3 h-3" /> PDF
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await sendPayslip(row.employeeId, payMonth, payYear);
                            toast.success(`Slip sent to ${row.employeeName}`);
                          } catch (e) {
                            toast.error('Failed to send slip');
                          }
                        }}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs font-semibold">
                        Send
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payroll?.policy.description && (
          <p className="text-xs text-white/20 mt-4 border-t border-white/5 pt-4">{payroll.policy.description}</p>
        )}
      </div>
    </div>
  );
}
