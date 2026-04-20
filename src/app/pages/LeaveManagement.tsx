import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { getMonthlyPayroll } from '../api/payroll';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Plus, Check, X, Calendar, Info } from 'lucide-react';
import { createLeaveRequest, getLeaveRequests, updateLeaveStatus } from '../api/leave';
import type { LeaveRequest, Task, Employee } from '../api/types';
import { getTasks } from '../api/tasks';
import { getEmployees } from '../api/employees';
import { toast } from 'sonner';
import { getStoredUserProfile } from '../lib/userProfile';
import { openExport } from '../api/export';

export default function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    fromDate: '',
    toDate: '',
    reason: '',
    leaveType: 'Casual' as 'Casual' | 'Sick' | 'Earned',
  });
  const [myOpenTasks, setMyOpenTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [handoverMap, setHandoverMap] = useState<Record<string, string>>({});
  const [managerConflict, setManagerConflict] = useState<{ id: string; start: string; end: string; status: string }[] | null>(null);
  const [managerInsufficient, setManagerInsufficient] = useState<{ id: string; requested: number; remaining: number } | null>(null);
  const [exhaustedEmployees, setExhaustedEmployees] = useState<Employee[]>([]);

  const accessRole = localStorage.getItem('accessRole') as "manager" | "employee" | null;
  const employeeId = localStorage.getItem('employeeId');
  const isManager = accessRole === 'manager';
  const myDepartment = getStoredUserProfile()?.department || '';

  useEffect(() => {
    const load = async () => {
      const list = await getLeaveRequests(isManager ? null : employeeId);
      setLeaveRequests(list);
    };
    load().catch(console.error);
  }, [isManager, employeeId]);

  useEffect(() => {
    if (isManager || !employeeId) return;
    getTasks(employeeId)
      .then((list) => setMyOpenTasks(list.filter((t) => t.status !== 'Completed')))
      .catch(() => setMyOpenTasks([]));
    getEmployees()
      .then((list) => setAllEmployees(list))
      .catch(() => setAllEmployees([]));
  }, [isManager, employeeId]);

  useEffect(() => {
    if (!isManager) return;
    getEmployees()
      .then((rows) => setExhaustedEmployees(rows.filter((e) => Number(e.leaveBalance || 0) <= 0)))
      .catch(() => setExhaustedEmployees([]));
  }, [isManager, leaveRequests]);

  const handleApprove = async (id: string) => {
    try {
      const updated = await updateLeaveStatus({ id, status: "Approved" });
      setLeaveRequests(leaveRequests.map((req) => (req.id === id ? updated : req)));
      toast.success('Leave approved');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error === 'overlap') {
        setManagerConflict(data.conflicts || []);
        return;
      }
      if (data?.error === 'insufficient_balance') {
        setManagerInsufficient({ id, requested: data.requested, remaining: data.remaining });
        return;
      }
      toast.error(data?.message || 'Could not approve leave');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await updateLeaveStatus({ id, status: "Rejected" });
      setLeaveRequests(leaveRequests.map((req) => (req.id === id ? updated : req)));
      toast.success('Leave rejected');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not reject leave');
    }
  };

  const handleApproveWithPartial = async () => {
    if (!managerInsufficient) return;
    try {
      const updated = await updateLeaveStatus({ id: managerInsufficient.id, status: 'Approved', allowPartialUnpaid: true });
      setLeaveRequests(leaveRequests.map((req) => (req.id === managerInsufficient.id ? updated : req)));
      toast.success('Leave approved with unpaid overflow');
      setManagerInsufficient(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not apply partial approval');
    }
  };

  const handleApplyLeave = async () => {
    if (!employeeId) return;
    if (!newLeave.fromDate || !newLeave.toDate) {
      toast.error('Please choose from and to dates');
      return;
    }
    if (new Date(newLeave.toDate) < new Date(newLeave.fromDate)) {
      toast.error('To date cannot be before from date');
      return;
    }

    const handovers = Object.entries(handoverMap)
      .filter(([, substituteEmployeeId]) => !!substituteEmployeeId)
      .map(([taskId, substituteEmployeeId]) => ({ taskId, substituteEmployeeId }));
    const created = await createLeaveRequest({
      employeeId,
      fromDate: newLeave.fromDate,
      toDate: newLeave.toDate,
      reason: newLeave.reason,
      leaveType: newLeave.leaveType,
      handovers,
    });

    setLeaveRequests([created, ...leaveRequests]);
    setIsDialogOpen(false);
    setNewLeave({ fromDate: '', toDate: '', reason: '', leaveType: 'Casual' });
    setHandoverMap({});
    
    if (created.conflictWarning) {
      toast.warning('Conflict Detected', {
        description: created.conflictWarning,
        duration: 8000,
      });
    } else {
      toast.success('Leave request submitted');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;
  const [payrollPolicyLine, setPayrollPolicyLine] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date();
    getMonthlyPayroll(d.getFullYear(), d.getMonth() + 1)
      .then((p) => setPayrollPolicyLine(p.policy.description))
      .catch(() =>
        setPayrollPolicyLine(
          'Approved leave is counted per calendar day. More than 5 such days in one month reduces gross salary under company policy—see Settings for your estimate.'
        )
      );
  }, []);

  return (
    <div className="space-y-8 relative z-0">
      {/* Page background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden>
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 page-enter">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>Leave Portal</h1>
          <p className="text-sm text-white/40">
            {isManager
              ? "Review and approve team leave requests"
              : "Request time off and track your leave history"}
          </p>
        </div>
        {!isManager && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/30 gap-2 transition-all">
                <Plus className="w-4 h-4" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] bg-[#0f1117] border border-white/10 text-white rounded-2xl shadow-2xl p-0 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <DialogTitle className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>Apply for Leave</DialogTitle>
                <DialogDescription className="text-white/40 text-sm mt-1">
                  Submit a new leave request for manager approval.
                </DialogDescription>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">From Date</Label>
                    <input
                      type="date"
                      value={newLeave.fromDate}
                      onChange={(e) => setNewLeave(prev => ({ ...prev, fromDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-violet-500/60 transition-all custom-calendar-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs uppercase tracking-wide">To Date</Label>
                    <input
                      type="date"
                      value={newLeave.toDate}
                      onChange={(e) => setNewLeave(prev => ({ ...prev, toDate: e.target.value }))}
                      min={newLeave.fromDate || new Date().toISOString().split('T')[0]}
                      className="w-full text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-violet-500/60 transition-all custom-calendar-input"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Leave type</Label>
                  <Select value={newLeave.leaveType} onValueChange={(v: 'Casual' | 'Sick' | 'Earned') => setNewLeave({ ...newLeave, leaveType: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl focus:border-violet-500/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141a2e] border-white/10 text-white">
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Sick">Sick</SelectItem>
                      <SelectItem value="Earned">Earned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Reason</Label>
                  <Textarea
                    placeholder="Enter reason for leave..."
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-violet-500/60 resize-none"
                  />
                </div>
                
                {myOpenTasks.length > 0 && (
                  <div className="space-y-3 bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                    <div>
                      <p className="text-sm font-semibold text-white/90">Task Coverages</p>
                      <p className="text-[11px] text-white/40">Optional: select substitutes for pending tasks</p>
                    </div>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {myOpenTasks.map((task) => (
                        <div key={task.id} className="flex flex-col gap-1.5">
                          <div className="text-xs text-white/70 truncate">{task.title}</div>
                          <Select value={handoverMap[task.id] || "none"} onValueChange={(v) => setHandoverMap(prev => ({ ...prev, [task.id]: v === "none" ? "" : v }))}>
                            <SelectTrigger className="h-8 bg-black/20 border-white/5 text-white/80 rounded-lg text-xs">
                              <SelectValue placeholder="No substitute" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141a2e] border-white/10 text-white text-xs">
                              <SelectItem value="none">No substitute</SelectItem>
                              {allEmployees
                                .filter((emp) => emp.id !== employeeId)
                                .filter((emp) => !myDepartment || !emp.department || emp.department === myDepartment)
                                .map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name} ({emp.department || 'General'})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-white/60 hover:text-white hover:bg-white/5">Cancel</Button>
                <Button onClick={handleApplyLeave} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium">
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {payrollPolicyLine ? (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="text-primary" />
          <AlertTitle>Salary and leave policy</AlertTitle>
          <AlertDescription className="text-muted-foreground">{payrollPolicyLine}</AlertDescription>
        </Alert>
      ) : null}

      {managerConflict ? (
        <Alert className="border-amber-400/40 bg-amber-50 dark:bg-amber-950/30">
          <AlertTitle>Approval blocked: overlapping leave</AlertTitle>
          <AlertDescription>
            Conflicting requests:
            <ul className="list-disc pl-5 mt-1">
              {managerConflict.map((c) => (
                <li key={c.id}>
                  {c.start} to {c.end} ({c.status})
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setManagerConflict(null)}>
              Close
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {managerInsufficient ? (
        <Alert className="border-rose-400/40 bg-rose-50 dark:bg-rose-950/20">
          <AlertTitle>Insufficient balance</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Requested {managerInsufficient.requested} days, only {managerInsufficient.remaining} paid days remain.
              Approve paid days and convert remaining to unpaid leave?
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleApproveWithPartial()}>
                Confirm split
              </Button>
              <Button size="sm" variant="outline" onClick={() => setManagerInsufficient(null)}>
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 page-enter" style={{ animationDelay: '100ms' }}>
        <Card className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md overflow-hidden relative group p-6 card-lift">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-amber-600" />
          <div className="absolute -right-4 -top-4 bg-amber-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Pending</h3>
            <Calendar className="w-5 h-5 text-amber-500 opacity-80" />
          </div>
          <div className="text-4xl font-black text-white">{pendingCount}</div>
          <p className="text-xs text-amber-400/80 mt-1 font-medium">Awaiting approval</p>
        </Card>

        <Card className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md overflow-hidden relative group p-6 card-lift">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
          <div className="absolute -right-4 -top-4 bg-emerald-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Approved</h3>
            <Check className="w-5 h-5 text-emerald-500 opacity-80" />
          </div>
          <div className="text-4xl font-black text-white">{approvedCount}</div>
          <p className="text-xs text-emerald-400/80 mt-1 font-medium">This month</p>
        </Card>

        <Card className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md overflow-hidden relative group p-6 card-lift">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-400 to-rose-600" />
          <div className="absolute -right-4 -top-4 bg-rose-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Rejected</h3>
            <X className="w-5 h-5 text-rose-500 opacity-80" />
          </div>
          <div className="text-4xl font-black text-white">{rejectedCount}</div>
          <p className="text-xs text-rose-400/80 mt-1 font-medium">This month</p>
        </Card>
      </div>

      {isManager ? (
        <Card className="border-border bg-card/95">
          <CardHeader>
            <CardTitle className="text-base">Employees with exhausted leave balance</CardTitle>
          </CardHeader>
          <CardContent>
            {exhaustedEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everyone in your department can still apply for leave.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {exhaustedEmployees.map((e) => (
                  <div key={e.id} className="rounded-md border border-border p-2 text-sm flex items-center justify-between">
                    <span className="font-medium text-foreground">{e.name}</span>
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">No balance</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Leave Requests Table */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden page-enter" style={{ animationDelay: '150ms' }}>
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-3 bg-white/[0.01]">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            All Leave Requests
          </h2>
          <Button variant="ghost" size="sm" onClick={() => openExport("leave")} className="text-xs text-violet-400 hover:bg-violet-500/10 hover:text-violet-300">
            Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest bg-transparent">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest bg-transparent">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest bg-transparent">Reason</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest bg-transparent">Applied On</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest bg-transparent">Status</th>
                {isManager && <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-widest bg-transparent">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaveRequests.map((request) => (
                <tr key={request.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-inner">
                        {request.employeeName.split(' ').map(n=>n[0]).join('').substring(0,2)}
                      </div>
                      <div className="text-sm font-semibold text-white/90">{request.employeeName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white/80 font-medium">
                      {new Date(request.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(request.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/50 max-w-[200px] truncate group-hover:text-white/80 transition-colors">
                    {request.reason}
                  </td>
                  <td className="px-6 py-4 text-xs text-white/40 font-medium">
                    {new Date(request.appliedOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`bg-transparent border ${getStatusColor(request.status)} tracking-wide px-2 py-0.5 rounded-full text-[10px]`}>
                      {request.status}
                    </Badge>
                  </td>
                  {isManager && (
                    <td className="px-6 py-4">
                      {request.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(request.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-7 px-3 text-xs">
                            Approve
                          </Button>
                          <Button size="sm" onClick={() => handleReject(request.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 h-7 px-3 text-xs">
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/20 italic">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {leaveRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/30 text-sm">No leave requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden p-6 page-enter" style={{ animationDelay: '200ms' }}>
        <h2 className="text-base font-bold text-white tracking-wide mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Leave Balance Tracker (30 Days)
        </h2>
        <LeaveCalendar requests={leaveRequests} isManager={isManager} />
      </div>
    </div>
  );
}

function LeaveCalendar({ requests, isManager }: { requests: LeaveRequest[]; isManager: boolean }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const offset = (first.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  const days = Array.from({ length: 42 }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    return d;
  });
  const colorFor = (status: string) =>
    status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' : status === 'Pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 border' : 'bg-white/5 text-white/30 line-through';
  
  const calculateDays = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    return Math.round(Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))) + 1;
  };

  const types: Array<'Casual' | 'Sick' | 'Earned'> = ['Casual', 'Sick', 'Earned'];
  const summary = types.map((t) => {
    const approved = requests
      .filter((r) => (r.leaveType || 'Casual') === t && r.status === 'Approved')
      .reduce((sum, r) => sum + calculateDays(r.fromDate, r.toDate), 0);
      
    const pending = requests
      .filter((r) => (r.leaveType || 'Casual') === t && r.status === 'Pending')
      .reduce((sum, r) => sum + calculateDays(r.fromDate, r.toDate), 0);
      
    const totalAllowed = 20;
    return { type: t, allowed: totalAllowed, used: approved, pending, remaining: Math.max(0, totalAllowed - approved) };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.type} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs flex justify-between items-center">
            <span className="font-bold text-white/70">{s.type}</span>
            <div className="text-white/40 font-medium">
              <span className="text-white/80">{s.used}</span> used <span className="mx-1">•</span> <span className="text-white/80">{s.remaining}</span> left
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <Button variant="ghost" size="sm" className="hidden sm:flex hover:bg-white/5 text-white/40" onClick={() => setViewDate(new Date(year, month - 1, 1))}>Previous</Button>
        <div className="font-black text-white/60 tracking-wider uppercase text-sm flex-1 text-center">{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <Button variant="ghost" size="sm" className="hidden sm:flex hover:bg-white/5 text-white/40" onClick={() => setViewDate(new Date(year, month + 1, 1))}>Next</Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-white/30 text-[10px] font-bold uppercase tracking-widest text-center py-2">{d}</div>
        ))}
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const dayRequests = requests.filter((r) => key >= r.fromDate && key <= r.toDate);
          return (
            <div key={key} className={`min-h-[80px] rounded-xl border border-white/5 p-2 transition-all ${d.getMonth() === month ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'bg-transparent opacity-30'}`}>
              <div className="text-xs font-bold text-white/50 mb-1.5">{d.getDate()}</div>
              <div className="space-y-1">
                {dayRequests.slice(0, 2).map((r) => (
                  <div
                    key={`${r.id}-${key}`}
                    className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 truncate ${colorFor(r.status)}`}
                    title={`${r.employeeName} • ${r.leaveType || 'Casual'} • ${r.status}`}
                  >
                    {isManager ? r.employeeName.split(' ')[0] : r.leaveType || 'Leave'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
