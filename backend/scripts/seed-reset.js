const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const Task = require("../models/Task");
const LeaveRequest = require("../models/LeaveRequest");
const AuditLog = require("../models/AuditLog");
const Kudos = require("../models/Kudos");
const OnboardingChecklist = require("../models/OnboardingChecklist");

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function resetDemoData({ preserveAdminId }) {
  await Task.deleteMany({}, { timeout: 30000 });
  await LeaveRequest.deleteMany({}, { timeout: 30000 });
  await AuditLog.deleteMany({}, { timeout: 30000 });
  await Kudos.deleteMany({}, { timeout: 30000 });
  await OnboardingChecklist.deleteMany({}, { timeout: 30000 });

  const preserveAdmin = preserveAdminId ? await Employee.findById(preserveAdminId) : null;
  if (preserveAdmin) {
    await Employee.deleteMany({ _id: { $ne: preserveAdmin._id } }, { timeout: 30000 });
  } else {
    const first = await Employee.findOne({ accessRole: "manager" }).sort({ createdAt: 1 });
    if (!first) throw new Error("No admin to preserve");
    await Employee.deleteMany({ _id: { $ne: first._id } }, { timeout: 30000 });
  }
  const admin = preserveAdmin || (await Employee.findOne({ accessRole: "manager" }));

  const departments = ["Engineering", "HR", "Operations", "Finance"];
  const managers = [];
  for (let i = 0; i < 4; i++) {
    const m = await Employee.create({
      accessRole: "manager",
      name: `${departments[i]} Manager`,
      email: `manager${i + 1}@company.com`,
      password: await bcrypt.hash("demo", 10),
      jobRole: "Manager",
      department: departments[i],
      leaveAllowance: 20,
      leaveBalance: 20,
    });
    managers.push(m);
  }

  // Get existing employees
  const existingEmployees = await Employee.find({ accessRole: "employee" });
  const existingCount = existingEmployees.length;
  const employees = [...existingEmployees];
  
  const engineeringRoles = ["Software Engineer", "Senior Software Engineer", "DevOps Engineer", "QA Engineer", "Frontend Developer", "Full Stack Developer", "Backend Developer", "Mobile Developer"];
  const hrRoles = ["HR Specialist", "Recruiter", "HR Coordinator", "Training Specialist", "HR Analyst", "HR Business Partner", "Talent Acquisition Specialist", "HR Manager"];
  const operationsRoles = ["Operations Manager", "Logistics Coordinator", "Supply Chain Analyst", "Process Engineer", "Quality Assurance", "Operations Analyst", "Warehouse Manager", "Procurement Specialist"];
  const financeRoles = ["Financial Analyst", "Accountant", "Finance Manager", "Budget Analyst", "Cost Controller", "Tax Specialist", "Financial Planner", "Investment Analyst"];
  
  // Add new employees only if we have less than 50
  const employeesToAdd = Math.max(0, 50 - existingCount);
  console.log(`Existing employees: ${existingCount}, Adding: ${employeesToAdd} new employees`);
  
  for (let i = 0; i < employeesToAdd; i++) {
    const dept = departments[i % departments.length];
    let role;
    
    if (dept === "Engineering") {
      role = engineeringRoles[i % engineeringRoles.length];
    } else if (dept === "HR") {
      role = hrRoles[i % hrRoles.length];
    } else if (dept === "Operations") {
      role = operationsRoles[i % operationsRoles.length];
    } else {
      role = financeRoles[i % financeRoles.length];
    }
    
    const e = await Employee.create({
      accessRole: "employee",
      name: `Employee ${existingCount + i + 1}`,
      email: `employee${existingCount + i + 1}@company.com`,
      password: await bcrypt.hash("demo", 10),
      jobRole: role,
      department: dept,
      leaveAllowance: 20,
      leaveBalance: 10 + (i % 10),
    });
    employees.push(e);
  }

  const titles = ["Prepare sprint report", "Fix auth bug", "Review PRs", "Write tests", "Client follow-up"];
  for (let i = 0; i < 30; i++) {
    const assignee = pick(employees);
    const d = new Date();
    d.setDate(d.getDate() + (i - 15));
    await Task.create({
      title: `${pick(titles)} #${i + 1}`,
      assignedToId: assignee._id,
      assignedTo: assignee.name,
      priority: pick(["Low", "Medium", "High"]),
      deadline: d,
      description: "Seeded demo task",
      status: pick(["Pending", "In Progress", "Completed"]),
    });
  }

  for (let i = 0; i < 20; i++) {
    const employee = pick(employees);
    const start = new Date();
    start.setDate(start.getDate() - 70 + i * 4);
    const end = new Date(start);
    end.setDate(start.getDate() + (i % 4));
    await LeaveRequest.create({
      employeeId: employee._id,
      employeeName: employee.name,
      fromDate: start,
      toDate: end,
      reason: "Seeded leave",
      leaveType: pick(["Casual", "Sick", "Earned"]),
      status: pick(["Approved", "Pending", "Rejected"]),
      appliedOn: new Date(start.getTime() - 2 * 86400000),
    });
  }

  for (let i = 0; i < 15; i++) {
    await AuditLog.create({
      actionType: pick(["user_login", "leave_request_created", "task_created", "task_reassigned"]),
      actorId: admin._id,
      actorName: admin.name,
      targetType: "seed",
      targetId: String(i + 1),
      newValue: { seeded: true, index: i + 1 },
      ipAddress: "127.0.0.1",
    });
  }

  for (let i = 0; i < 20; i++) {
    const sender = pick(employees);
    let receiver = pick(employees);
    if (String(receiver._id) === String(sender._id)) receiver = pick(employees);
    const task = await Task.findOne();
    await Kudos.create({
      senderId: sender._id,
      receiverId: receiver._id,
      taskId: task._id,
      category: pick(["Great collaboration", "Fast turnaround", "Saved the day", "Above and beyond", "Mentorship"]),
      message: "Thanks for the help!",
    });
  }

  for (let i = 0; i < 2; i++) {
    const u = employees[i];
    for (const item of ["complete_profile", "upload_avatar", "acknowledge_policy", "first_task_received"]) {
      await OnboardingChecklist.create({
        userId: u._id,
        itemKey: item,
        isComplete: Math.random() > 0.5,
        completedAt: Math.random() > 0.5 ? new Date() : null,
      });
    }
  }
}

if (require.main === module) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) {
    console.error("ADMIN_SEED_KEY is required");
    process.exit(1);
  }
  resetDemoData({ preserveAdminId: null })
    .then(() => {
      console.log("Demo seed reset complete");
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { resetDemoData };
