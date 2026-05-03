import { api } from "./http";

export type SalaryPolicy = {
  defaultMonthlySalary: number;
  freeLeaveDaysPerMonth: number;
  deductionPercentPerExcessDay: number;
  maxDeductionPercentPerMonth: number;
  description: string;
};

export type PayrollRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  monthlySalary: number;
  leaveDaysInMonth: number;
  totalWorkingDays?: number;
  daysPresent?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  freeLeaveDaysBeforeDeduction: number;
  excessLeaveDays: number;
  deductionPercentApplied: number;
  deductionAmount: number;
  deductionFormula?: string;
  netSalary: number;
};

export type MonthlyPayrollResponse = {
  year: number;
  month: number;
  policy: SalaryPolicy;
  rows: PayrollRow[];
};

export async function getMonthlyPayroll(year: number, month: number): Promise<MonthlyPayrollResponse> {
  const res = await api.get<MonthlyPayrollResponse>("/payroll/monthly", {
    params: { year, month },
  });
  return res.data;
}

export async function requestPayslip(month: number, year: number): Promise<void> {
  await api.post("/payroll/request-slip", { month, year });
}

export async function sendPayslip(employeeId: string, month: number, year: number): Promise<void> {
  await api.post("/payroll/send-slip", { employeeId, month, year });
}
