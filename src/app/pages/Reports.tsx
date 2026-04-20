import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { getReports, type ReportsResponse } from '../api/reports';
import { getDepartmentAnalytics, type DepartmentMetric } from '../api/reports';
import { getMonthlyPayroll, type MonthlyPayrollResponse } from '../api/payroll';
import { formatINR } from '../lib/formatMoney';
import { TrendingUp, Users, CheckSquare, Wallet } from 'lucide-react';
import { useChartTheme } from '../lib/chartTheme';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { openExport } from '../api/export';
import { getStoredUserProfile } from '../lib/userProfile';

export default function Reports() {
  const chart = useChartTheme();
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const now = new Date();
  const [payYear, setPayYear] = useState(now.getFullYear());
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1);
  const [payroll, setPayroll] = useState<MonthlyPayrollResponse | null>(null);
  const [departmentRows, setDepartmentRows] = useState<DepartmentMetric[]>([]);

  useEffect(() => {
    getReports({ role: 'manager' })
      .then(setReports)
      .catch(console.error);
  }, []);

  useEffect(() => {
    getMonthlyPayroll(payYear, payMonth)
      .then(setPayroll)
      .catch(() => setPayroll(null));
  }, [payYear, payMonth]);

  useEffect(() => {
    getDepartmentAnalytics(payMonth, payYear)
      .then((r) => setDepartmentRows(r.rows))
      .catch(() => setDepartmentRows([]));
  }, [payMonth, payYear]);

  const profile = getStoredUserProfile();
  const managerDept = profile?.department || 'Engineering';

  const employees = (reports?.employees ?? []).filter(emp => emp.department === managerDept);
  const tasks = (reports?.tasks ?? []).filter(task => employees.some(emp => emp.id === task.assignedToId));

  // Task status distribution
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;

  const taskStatusData = [
    { name: 'Completed', value: completedTasks, color: '#10B981' },
    { name: 'In Progress', value: inProgressTasks, color: '#F59E0B' },
    { name: 'Pending', value: pendingTasks, color: '#EF4444' },
  ];

  // Tasks per employee
  const tasksPerEmployee = employees.map(emp => {
    const empTasks = tasks.filter(t => t.assignedToId === (emp.id || emp._id));
    return {
      name: emp.name.split(' ')[0],
      completed: empTasks.filter(t => t.status === 'Completed').length,
      inProgress: empTasks.filter(t => t.status === 'In Progress').length,
      total: empTasks.length
    };
  });

  // Leave usage by employee
  const leaveUsageData = employees.map(emp => ({
    name: emp.name.split(' ')[0],
    used: 20 - emp.leaveBalance,
    remaining: emp.leaveBalance,
  }));

  // Department performance
  const departmentData = (() => {
    const stats = new Map<string, { tasks: number; completed: number }>();
    for (const t of tasks) {
      const emp = employees.find(e => e.id === t.assignedToId);
      const dept = emp?.department || 'Unknown';
      const existing = stats.get(dept) || { tasks: 0, completed: 0 };
      existing.tasks += 1;
      if (t.status === 'Completed') existing.completed += 1;
      stats.set(dept, existing);
    }

    return Array.from(stats.entries()).map(([department, v]) => {
      const efficiency = v.tasks ? Math.round((v.completed / v.tasks) * 100) : 0;
      return { department, tasks: v.tasks, efficiency };
    });
  })();

  // Monthly trend
  const monthlyTrendData = (() => {
    const buckets = new Map<string, { key: number; month: string; assigned: number; completed: number }>();
    for (const t of tasks) {
      const d = t.createdAt ? new Date(t.createdAt) : (t.updatedAt ? new Date(t.updatedAt) : null);
      if (!d || Number.isNaN(d.getTime())) continue;

      const key = d.getFullYear() * 100 + d.getMonth();
      const label = d.toLocaleString('en-US', { month: 'short' });
      const existing = buckets.get(String(key)) || { key, month: label, assigned: 0, completed: 0 };
      existing.assigned += 1;
      if (t.status === 'Completed') existing.completed += 1;
      buckets.set(String(key), existing);
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.key - b.key)
      .slice(-6)
      .map((b) => ({ month: b.month, completed: b.completed, assigned: b.assigned }));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-foreground mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into team performance and productivity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-[#2563EB]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Tasks</CardTitle>
            <CheckSquare className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-foreground">{tasks.length}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completion Rate</CardTitle>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-foreground">
              {(tasks.length ? ((completedTasks / tasks.length) * 100) : 0).toFixed(0)}%
            </div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Employees</CardTitle>
            <Users className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-foreground">{employees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across 4 departments</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Tasks/Employee</CardTitle>
            <CheckSquare className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-foreground">
              {(employees.length
                ? (tasksPerEmployee.reduce((sum, emp) => sum + emp.total, 0) / employees.length)
                : 0
              ).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently assigned</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Payroll & leave deductions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {payroll?.policy.description ??
                  "Standard gross is ₹80,000/mo for everyone (automatic). Deductions are applied from approved leave over 5 days in a month."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="grid gap-1">
              <Label htmlFor="pay-year" className="text-xs">
                Year
              </Label>
              <Input
                id="pay-year"
                type="number"
                min={2000}
                max={2100}
                className="w-28 h-9"
                value={payYear}
                onChange={(e) => setPayYear(Math.max(2000, parseInt(e.target.value, 10) || payYear))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pay-month" className="text-xs">
                Month
              </Label>
              <Input
                id="pay-month"
                type="number"
                min={1}
                max={12}
                className="w-20 h-9"
                value={payMonth}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  if (m >= 1 && m <= 12) setPayMonth(m);
                }}
              />
            </div>
            <button
              className="text-xs text-primary underline"
              onClick={() => openExport("payroll-summary", { month: String(payMonth), year: String(payYear) })}
            >
              Download payroll PDF
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end pb-2">
            <button className="text-xs text-primary underline" onClick={() => openExport("tasks")}>Download tasks CSV</button>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Dept</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Gross</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Working days</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Present</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Paid leave</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Unpaid leave</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Leave days</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Excess</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Formula</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Deduction</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Net (est.)</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Payslip</th>
                </tr>
              </thead>
              <tbody>
                {(payroll?.rows ?? []).filter(r => r.department === managerDept).map((row) => (
                  <tr key={row.employeeId} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-3 text-foreground">{row.employeeName}</td>
                    <td className="py-3 px-3 text-muted-foreground">{row.department || "—"}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatINR(row.monthlySalary)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{row.totalWorkingDays ?? 22}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{row.daysPresent ?? Math.max(0, (row.totalWorkingDays ?? 22) - row.leaveDaysInMonth)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{row.paidLeaveDays ?? Math.min(row.leaveDaysInMonth, row.freeLeaveDaysBeforeDeduction)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{row.unpaidLeaveDays ?? 0}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{row.leaveDaysInMonth}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{row.excessLeaveDays}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground max-w-sm">
                      <details>
                        <summary className="cursor-pointer text-foreground">View</summary>
                        <div className="mt-1" title="(excess leave days / total working days) × gross salary">
                          {row.deductionFormula || `${row.excessLeaveDays}/${row.totalWorkingDays ?? 22} × ${formatINR(row.monthlySalary)}`}
                        </div>
                      </details>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                      {row.deductionAmount > 0
                        ? `−${formatINR(row.deductionAmount)} (${row.deductionPercentApplied}%)`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-medium tabular-nums">{formatINR(row.netSalary)}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        className="text-xs text-primary underline"
                        onClick={() =>
                          openExport("payslip", { employeeId: row.employeeId, month: String(payMonth), year: String(payYear) })
                        }
                      >
                        Payslip PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={300}
              className="[&_.recharts-pie-label-text]:fill-[var(--color-foreground)]"
            >
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chart.tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {taskStatusData.map((item) => (
                <div key={item.name} className="text-center">
                  <div className="text-2xl text-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Task Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month" stroke={chart.axis} tick={{ fill: chart.label }} />
                <YAxis stroke={chart.axis} tick={{ fill: chart.label }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Completed"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="assigned" 
                  stroke="#1e40af" 
                  strokeWidth={2}
                  name="Assigned"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Per Employee */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks Per Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tasksPerEmployee}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="name" stroke={chart.axis} tick={{ fill: chart.label }} />
                <YAxis stroke={chart.axis} tick={{ fill: chart.label }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="inProgress" fill="#F59E0B" name="In Progress" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leave Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Usage by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leaveUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis type="number" stroke={chart.axis} tick={{ fill: chart.label }} />
                <YAxis dataKey="name" type="category" stroke={chart.axis} width={80} tick={{ fill: chart.label }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend />
                <Bar dataKey="used" fill="#EF4444" name="Used" stackId="a" radius={[0, 8, 8, 0]} />
                <Bar dataKey="remaining" fill="#10B981" name="Remaining" stackId="a" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Department</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Total Tasks</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Efficiency Rate</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground">Performance</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.filter(d => d.department === managerDept).map((dept) => (
                  <tr key={dept.department} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="py-4 px-4 text-sm text-foreground">{dept.department}</td>
                    <td className="py-4 px-4 text-sm text-foreground/90">{dept.tasks}</td>
                    <td className="py-4 px-4 text-sm text-foreground/90">{dept.efficiency}%</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 max-w-[200px]">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${dept.efficiency}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{dept.efficiency}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2">Department</th>
                  <th className="text-right py-2 px-2">Headcount</th>
                  <th className="text-right py-2 px-2">Completion %</th>
                  <th className="text-right py-2 px-2">Approved Leave Days</th>
                  <th className="text-right py-2 px-2">Leave Util %</th>
                  <th className="text-right py-2 px-2">Payroll Cost</th>
                </tr>
              </thead>
              <tbody>
                {departmentRows.filter(d => d.department === managerDept).map((d) => (
                  <tr key={d.department} className="border-b border-border/60">
                    <td className="py-2 px-2">{d.department}</td>
                    <td className="py-2 px-2 text-right">{d.headcount}</td>
                    <td className="py-2 px-2 text-right">{d.avgTaskCompletionRate}%</td>
                    <td className="py-2 px-2 text-right">{d.totalApprovedLeaveDays}</td>
                    <td className="py-2 px-2 text-right">{d.leaveUtilisationPercent}%</td>
                    <td className="py-2 px-2 text-right">{formatINR(d.totalPayrollCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
