/**
 * Monthly salary & leave-based deduction policy (calendar month, approved leave only).
 * Overlapping approved requests count each calendar day once.
 */

const DEFAULT_MONTHLY_SALARY = 80000;
const FREE_LEAVE_DAYS_PER_MONTH = 5;
const DEDUCTION_PERCENT_PER_EXCESS_DAY = 2;
const MAX_SALARY_DEDUCTION_PERCENT = 24;

function localDateKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addApprovedLeaveDaysInMonthToSet(fromDate, toDate, year, monthIndex0, set) {
  const rangeStart = new Date(fromDate);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(toDate);
  rangeEnd.setHours(0, 0, 0, 0);
  const ms = new Date(year, monthIndex0, 1);
  ms.setHours(0, 0, 0, 0);
  const me = new Date(year, monthIndex0 + 1, 0);
  me.setHours(0, 0, 0, 0);
  let cur = new Date(Math.max(rangeStart.getTime(), ms.getTime()));
  const last = new Date(Math.min(rangeEnd.getTime(), me.getTime()));
  if (cur > last) return;
  while (cur <= last) {
    set.add(localDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
}

function approvedLeaveDayCountForMonth(employeeId, year, monthIndex0, leaveRequests) {
  const set = new Set();
  const eid = String(employeeId);
  for (const lr of leaveRequests) {
    if (String(lr.employeeId) !== eid) continue;
    if (lr.status !== "Approved") continue;
    addApprovedLeaveDaysInMonthToSet(lr.fromDate, lr.toDate, year, monthIndex0, set);
  }
  return set.size;
}

function resolveMonthlySalary(employee) {
  const explicit = Number(employee?.monthlySalary || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);

  const role = String(employee?.accessRole || "").toLowerCase();
  const jobRole = String(employee?.jobRole || "").toLowerCase();
  const dept = String(employee?.department || "").toLowerCase();

  if (role === "manager") return 125000;
  if (jobRole.includes("software")) return 92000;
  if (jobRole.includes("finance")) return 76000;
  if (jobRole.includes("hr")) return 70000;
  if (jobRole.includes("operations")) return 68000;
  if (dept.includes("engineering")) return 90000;
  if (dept.includes("finance")) return 75000;
  if (dept.includes("hr")) return 69000;
  if (dept.includes("operations")) return 67000;
  return DEFAULT_MONTHLY_SALARY;
}

function computePayrollRow(employee, leaveRequests, year, month1to12) {
  const monthIndex0 = month1to12 - 1;
  const monthlySalary = resolveMonthlySalary(employee);
  const leaveDaysInMonth = approvedLeaveDayCountForMonth(employee._id, year, monthIndex0, leaveRequests);
  const excessLeaveDays = Math.max(0, leaveDaysInMonth - FREE_LEAVE_DAYS_PER_MONTH);
  const rawPercent = excessLeaveDays * DEDUCTION_PERCENT_PER_EXCESS_DAY;
  const deductionPercentApplied = Math.min(MAX_SALARY_DEDUCTION_PERCENT, rawPercent);
  const deductionAmount = Math.round((monthlySalary * deductionPercentApplied) / 100);
  const netSalary = monthlySalary - deductionAmount;
  const totalWorkingDays = 22;
  const unpaidLeaveDays = 0;
  const paidLeaveDays = Math.min(leaveDaysInMonth, FREE_LEAVE_DAYS_PER_MONTH);
  const daysPresent = Math.max(0, totalWorkingDays - leaveDaysInMonth);
  return {
    employeeId: String(employee._id),
    employeeName: employee.name,
    department: employee.department || "",
    monthlySalary,
    leaveDaysInMonth,
    totalWorkingDays,
    daysPresent,
    paidLeaveDays,
    unpaidLeaveDays,
    freeLeaveDaysBeforeDeduction: FREE_LEAVE_DAYS_PER_MONTH,
    excessLeaveDays,
    deductionPercentApplied,
    deductionAmount,
    deductionFormula: `(${excessLeaveDays} excess days / ${totalWorkingDays} working days) × ₹${monthlySalary.toLocaleString("en-IN")}`,
    netSalary,
  };
}

function getSalaryPolicyDTO() {
  return {
    defaultMonthlySalary: DEFAULT_MONTHLY_SALARY,
    freeLeaveDaysPerMonth: FREE_LEAVE_DAYS_PER_MONTH,
    deductionPercentPerExcessDay: DEDUCTION_PERCENT_PER_EXCESS_DAY,
    maxDeductionPercentPerMonth: MAX_SALARY_DEDUCTION_PERCENT,
    description:
      `Gross salary is role-based (manager and department/job-role bands), with ${DEFAULT_MONTHLY_SALARY.toLocaleString("en-IN")} as default fallback. ` +
      `Up to ${FREE_LEAVE_DAYS_PER_MONTH} approved leave days in a calendar month do not reduce pay. ` +
      `Each additional day in that month reduces gross by ${DEDUCTION_PERCENT_PER_EXCESS_DAY}% ` +
      `(maximum ${MAX_SALARY_DEDUCTION_PERCENT}% per month). ` +
      `Overlapping approved leave counts each calendar day once.`,
  };
}

module.exports = {
  DEFAULT_MONTHLY_SALARY,
  FREE_LEAVE_DAYS_PER_MONTH,
  DEDUCTION_PERCENT_PER_EXCESS_DAY,
  MAX_SALARY_DEDUCTION_PERCENT,
  computePayrollRow,
  getSalaryPolicyDTO,
  approvedLeaveDayCountForMonth,
  resolveMonthlySalary,
};
