const bcrypt = require("bcryptjs");
require("dotenv").config();
const connectDB = require("../config/db");

const Employee = require("../models/Employee");
const Task = require("../models/Task");
const LeaveRequest = require("../models/LeaveRequest");
const AuditLog = require("../models/AuditLog");
const Kudos = require("../models/Kudos");
const OnboardingChecklist = require("../models/OnboardingChecklist");
const Notification = require("../models/Notification");
const UserNotificationPref = require("../models/UserNotificationPref");

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function emailFromName(name, index) {
  const base = String(name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return `${base || "employee"}.${index}@company.com`;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts[0]?.[0] || "E") + (parts[1]?.[0] || "");
}

function generateNames(targetCount, baseNames) {
  const firstNames = [
    "Aarav", "Vivaan", "Aditya", "Ishaan", "Krish", "Reyansh", "Kabir", "Atharv", "Ayaan", "Dhruv",
    "Anika", "Diya", "Kiara", "Myra", "Sara", "Riya", "Aisha", "Tara", "Naina", "Siya",
  ];
  const lastNames = [
    "Shah", "Bose", "Rana", "Mishra", "Kohli", "Banerjee", "Nanda", "Yadav", "Madan", "Kale",
    "Agarwal", "Srivastava", "Patel", "Saxena", "Bora", "Chatterjee", "Bhardwaj", "Naidu", "Singh", "Deshmukh",
  ];
  const unique = new Set(baseNames);
  let i = 0;
  while (unique.size < targetCount) {
    const full = `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / firstNames.length) % lastNames.length]}`;
    unique.add(full);
    i += 1;
  }
  return Array.from(unique).slice(0, targetCount);
}

async function seedLarge() {
  const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "demo123";
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Clean domain data to avoid collisions and make reruns deterministic enough.
  await Task.deleteMany({});
  await LeaveRequest.deleteMany({});
  await AuditLog.deleteMany({});
  await Kudos.deleteMany({});
  await OnboardingChecklist.deleteMany({});
  await Notification.deleteMany({});
  await UserNotificationPref.deleteMany({});
  await Employee.deleteMany({});

  const departments = [
    { name: "Engineering", count: 20, managerEmail: "nikhil.rao@company.com", managerName: "Nikhil Rao" },
    { name: "HR", count: 14, managerEmail: "sneha.kapoor@company.com", managerName: "Sneha Kapoor" },
    { name: "Finance", count: 14, managerEmail: "rahul.menon@company.com", managerName: "Rahul Menon" },
    { name: "Operations", count: 16, managerEmail: "ananya.iqbal@company.com", managerName: "Ananya Iqbal" },
  ];
  const departmentNames = {
    Engineering: [
      "Arjun Mehta",
      "Priya Nair",
      "Rohit Verma",
      "Kavya Iyer",
      "Vikram Sethi",
      "Neha Sharma",
      "Aman Khanna",
      "Divya Joshi",
      "Karthik Reddy",
      "Meera Das",
      "Siddharth Jain",
      "Pooja Kulkarni",
      "Harsh Gupta",
      "Anita Thomas",
    ],
    HR: [
      "Ritika Bansal",
      "Mohit Arora",
      "Sonal Chawla",
      "Varun Bhatia",
      "Isha Malhotra",
      "Kiran Sood",
      "Naveen Dutta",
      "Aditi Oberoi",
    ],
    Finance: [
      "Manish Tandon",
      "Rhea Sen",
      "Deepak Suri",
      "Tanvi Batra",
      "Gaurav Puri",
      "Ira Khurana",
      "Nitin Bedi",
      "Sanya Pillai",
    ],
    Operations: [
      "Yash Tripathi",
      "Shreya Lal",
      "Hemant Arvind",
      "Nisha Paul",
      "Adarsh Shetty",
      "Palak Bedi",
      "Tushar Anand",
      "Jaya Fernandes",
      "Pranav Bhasin",
      "Mitali Roy",
    ],
  };

  const titlePools = {
    Engineering: [
      "Fix JWT refresh token race condition",
      "Implement role guard middleware for manager APIs",
      "Refactor leave approval validation flow",
      "Build payroll deduction reconciliation endpoint",
      "Write integration tests for task reassignment",
      "Optimize dashboard report aggregation query",
      "Add retry handling for notification delivery",
      "Harden forgot-password token verification flow",
      "Improve API response time for task listing",
      "Ship release notes module for sprint close",
    ],
    HR: [
      "Screen shortlisted candidates for backend role",
      "Conduct final HR discussion for design applicants",
      "Publish updated leave policy communication",
      "Complete onboarding documentation for new hires",
      "Schedule interview panel for operations hiring",
      "Prepare monthly employee engagement pulse survey",
      "Review probation confirmations for Q2 joiners",
      "Finalize induction calendar for fresh recruits",
      "Resolve pending attendance correction requests",
      "Coordinate manager feedback cycle reminders",
    ],
    Finance: [
      "Review payroll variance report for current cycle",
      "Reconcile monthly travel and expense statements",
      "Validate TDS deductions before payslip release",
      "Prepare quarterly budget forecast projection",
      "Close month-end ledger and accrual entries",
      "Audit vendor invoices pending approval",
      "Publish department-wise burn-rate summary",
      "Verify reimbursement claims against policy",
      "Consolidate statutory compliance checklist",
      "Prepare cash-flow snapshot for leadership review",
    ],
    Operations: [
      "Track vendor SLA breaches and escalations",
      "Prepare weekly delivery operations dashboard",
      "Audit open procurement requests for compliance",
      "Coordinate inventory handoff between locations",
      "Resolve unresolved customer escalation backlog",
      "Plan shift allocation for support desk coverage",
      "Review logistics partner performance metrics",
      "Close pending warehouse discrepancy tickets",
      "Update incident response runbook checklist",
      "Publish operations risk register update",
    ],
  };
  const projectTags = {
    Engineering: ["Auth Revamp", "TaskOps", "Payroll Core", "Platform Stability", "Release 2.1"],
    HR: ["Talent Pipeline", "PeopleOps", "Onboarding Wave", "Policy Rollout", "Engagement Drive"],
    Finance: ["Payroll Cycle", "Month-End Close", "Compliance Sprint", "Budget FY", "Treasury Watch"],
    Operations: ["Ops Control Tower", "Delivery Excellence", "Vendor Governance", "Risk & Compliance", "Support Reliability"],
  };
  const descriptionPools = {
    Engineering: [
      "Validate edge cases, update API contract notes, and push coverage above 85% with integration tests.",
      "Coordinate with QA for regression checklist and confirm no auth/session breakage in staging.",
      "Ship behind feature flag, monitor logs for 24 hours, and publish rollback guidance.",
      "Refactor service layer to reduce duplication and improve readability for future enhancements.",
    ],
    HR: [
      "Coordinate with hiring managers, consolidate feedback, and close candidate loop within SLA.",
      "Prepare communication draft, policy FAQ, and onboarding checklist updates for current cohort.",
      "Track completion metrics and escalate pending onboarding actions to reporting managers.",
      "Document outcomes in monthly people-ops tracker and share highlights with leadership.",
    ],
    Finance: [
      "Cross-check ledger entries against source statements and flag anomalies for approval.",
      "Reconcile month-to-date figures, verify deductions, and prepare audit-ready notes.",
      "Coordinate with payroll ops to close pending exceptions before payslip generation.",
      "Publish summary with variance reasons and action items for department heads.",
    ],
    Operations: [
      "Review open tickets, prioritize critical blockers, and update owners with expected timelines.",
      "Align with vendor SPOCs on SLA misses and track remediation through closure.",
      "Verify inventory and procurement records, then publish compliance gap tracker.",
      "Update runbook actions for recurring incidents and confirm handoff ownership.",
    ],
  };

  const reasonPools = [
    "Medical emergency",
    "Family emergency",
    "Unexpected travel",
    "Personal unavoidable commitment",
  ];

  const allEmployees = [];
  const allManagers = [];
  let serial = 1;

  console.log('Creating managers...');
  for (const dept of departments) {
    console.log(`Creating manager for ${dept.name}: ${dept.managerName}`);
    const manager = await Employee.create({
      accessRole: "manager",
      name: dept.managerName,
      email: dept.managerEmail,
      password: passwordHash,
      jobRole: "Manager",
      department: dept.name,
      avatar: initials(dept.managerName).toUpperCase(),
      avatarUrl: "",
      leaveAllowance: 20,
      leaveBalance: 20,
      monthlySalary: randomInt(115000, 150000),
    });
    allManagers.push(manager);
    console.log(`Manager created: ${manager.name}`);

    console.log(`Creating ${dept.count} employees for ${dept.name}...`);
    const names = generateNames(dept.count, departmentNames[dept.name]);
    for (let i = 0; i < dept.count; i++) {
      const name = names[i];
      const email = emailFromName(name, serial);
      const monthlySalary =
        dept.name === "Engineering"
          ? randomInt(85000, 110000)
          : dept.name === "Finance"
            ? randomInt(70000, 90000)
            : dept.name === "HR"
              ? randomInt(60000, 82000)
              : randomInt(58000, 78000);
      
      try {
        const emp = await Employee.create({
          accessRole: "employee",
          name,
          email,
          password: passwordHash,
          jobRole: (() => {
            if (dept.name === "Engineering") {
              const engRoles = ["Software Engineer", "Senior Software Engineer", "DevOps Engineer", "QA Engineer", "Frontend Developer", "Full Stack Developer", "Backend Developer", "Mobile Developer"];
              return engRoles[i % engRoles.length];
            } else if (dept.name === "HR") {
              const hrRoles = ["HR Specialist", "Recruiter", "HR Coordinator", "Training Specialist", "HR Analyst", "HR Business Partner", "Talent Acquisition Specialist", "HR Manager"];
              return hrRoles[i % hrRoles.length];
            } else if (dept.name === "Finance") {
              const financeRoles = ["Financial Analyst", "Accountant", "Finance Manager", "Budget Analyst", "Cost Controller", "Tax Specialist", "Financial Planner", "Investment Analyst"];
              return financeRoles[i % financeRoles.length];
            } else {
              const opsRoles = ["Operations Manager", "Logistics Coordinator", "Supply Chain Analyst", "Process Engineer", "Quality Assurance", "Operations Analyst", "Warehouse Manager", "Procurement Specialist"];
              return opsRoles[i % opsRoles.length];
            }
          })(),
          department: dept.name,
          avatar: initials(name).toUpperCase(),
          avatarUrl: "",
          leaveAllowance: 20,
          leaveBalance: randomInt(8, 20),
          monthlySalary,
        });
        allEmployees.push(emp);
        serial += 1;
        if (i === 0) console.log(`First employee created: ${emp.name} - ${emp.email}`);
      } catch (error) {
        console.error(`Error creating employee ${name}:`, error.message);
      }
    }
    console.log(`Completed ${dept.name} department`);
  }

  const tasks = [];
  for (const emp of allEmployees) {
    // Guarantee multiple tasks with mixed statuses for every employee.
    const statuses = ["Pending", "In Progress", "Completed", "Pending"];
    for (let i = 0; i < 4; i++) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + randomInt(-8, 20));
      tasks.push({
        title: `${pick(titlePools[emp.department])} - ${pick(projectTags[emp.department])}`,
        assignedToId: emp._id,
        assignedTo: emp.name,
        priority: pick(["Low", "Medium", "High"]),
        deadline,
        description: pick(descriptionPools[emp.department]),
        status: statuses[i],
      });
    }
  }
  // Add additional department pool tasks for realistic spread.
  for (const dept of departments) {
    const deptEmployees = allEmployees.filter((e) => e.department === dept.name);
    for (let i = 0; i < 40; i++) {
      const assignee = pick(deptEmployees);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + randomInt(-6, 25));
      tasks.push({
        title: `${pick(titlePools[dept.name])} - ${pick(projectTags[dept.name])}`,
        assignedToId: assignee._id,
        assignedTo: assignee.name,
        priority: pick(["Low", "Medium", "High"]),
        deadline,
        description: pick(descriptionPools[dept.name]),
        status: pick(["Pending", "In Progress", "Completed"]),
      });
    }
  }
  const createdTasks = await Task.insertMany(tasks);

  // Add realistic dependency chains for Engineering and Finance tasks.
  const linkDependencies = async (department, chainCount) => {
    const deptTasks = createdTasks
      .filter((t) => t.description && descriptionPools[department].some((d) => t.description === d))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    if (deptTasks.length < 4) return;
    let cursor = 0;
    for (let i = 0; i < chainCount; i++) {
      const slice = deptTasks.slice(cursor, cursor + 4);
      if (slice.length < 4) break;
      slice[1].dependentTaskIds = [slice[0]._id];
      slice[2].dependentTaskIds = [slice[1]._id];
      slice[3].dependentTaskIds = [slice[2]._id];
      await slice[1].save();
      await slice[2].save();
      await slice[3].save();
      cursor += 4;
    }
  };
  await linkDependencies("Engineering", 10);
  await linkDependencies("Finance", 8);

  const leaveRows = [];
  // Regular leave requests.
  for (let i = 0; i < 70; i++) {
    const employee = pick(allEmployees);
    const from = new Date();
    from.setDate(from.getDate() - randomInt(1, 60));
    const to = new Date(from);
    to.setDate(to.getDate() + randomInt(1, 3));
    leaveRows.push({
      employeeId: employee._id,
      employeeName: employee.name,
      fromDate: from,
      toDate: to,
      reason: pick(reasonPools),
      leaveType: pick(["Casual", "Sick", "Earned"]),
      status: pick(["Approved", "Pending", "Rejected"]),
      appliedOn: new Date(from.getTime() - 2 * 86400000),
      handovers: [],
      isPaid: true,
    });
  }

  // Unavoidable leaves with same-department handover and approved status.
  const unavoidableEmployees = allEmployees.slice(0, 14);
  for (const employee of unavoidableEmployees) {
    const deptPeers = allEmployees.filter((e) => e.department === employee.department && String(e._id) !== String(employee._id));
    const substitute = pick(deptPeers);
    const empTasks = createdTasks.filter((t) => String(t.assignedToId) === String(employee._id) && t.status !== "Completed").slice(0, 2);
    const start = new Date();
    start.setDate(start.getDate() - randomInt(2, 8));
    const end = new Date(start);
    end.setDate(end.getDate() + randomInt(2, 4));

    const handovers = empTasks.map((t) => ({ taskId: t._id, substituteEmployeeId: substitute._id }));
    leaveRows.push({
      employeeId: employee._id,
      employeeName: employee.name,
      fromDate: start,
      toDate: end,
      reason: "Unavoidable emergency leave - task handover required",
      leaveType: pick(["Casual", "Sick"]),
      status: "Approved",
      appliedOn: new Date(start.getTime() - 2 * 86400000),
      handovers,
      isPaid: true,
    });

    for (const t of empTasks) {
      t.originalAssigneeId = employee._id;
      t.originalAssigneeName = employee.name;
      t.assignedToId = substitute._id;
      t.assignedTo = substitute.name;
      t.reassignmentNote = `Seed handover: reassigned within ${employee.department} due to unavoidable leave (${employee.name} -> ${substitute.name}).`;
      await t.save();
    }
  }

  // Employees exceeding 5 approved leave days in current month for payroll deductions.
  const exceeders = allEmployees.slice(14, 28);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  for (const employee of exceeders) {
    const from = new Date(currentYear, currentMonth, 2);
    const to = new Date(currentYear, currentMonth, 10); // 9 days inclusive
    leaveRows.push({
      employeeId: employee._id,
      employeeName: employee.name,
      fromDate: from,
      toDate: to,
      reason: "Extended unavoidable leave",
      leaveType: "Earned",
      status: "Approved",
      appliedOn: new Date(currentYear, currentMonth, 1),
      handovers: [],
      isPaid: false,
    });
  }
  await LeaveRequest.insertMany(leaveRows);

  const managerForAudit = allManagers[0];
  const auditRows = createdTasks.slice(0, 20).map((t, idx) => ({
    actionType: pick(["task_created", "task_reassigned", "leave_request_created", "employee_created"]),
    actorId: managerForAudit._id,
    actorName: managerForAudit.name,
    targetType: "seed",
    targetId: String(idx + 1),
    newValue: { seeded: true, taskTitle: t.title },
    ipAddress: "127.0.0.1",
  }));
  await AuditLog.insertMany(auditRows);

  for (const emp of allEmployees.slice(0, 20)) {
    for (const item of ["complete_profile", "upload_avatar", "acknowledge_policy", "first_task_received"]) {
      await OnboardingChecklist.updateOne(
        { userId: emp._id, itemKey: item },
        {
          $set: {
            isComplete: Math.random() > 0.35,
            completedAt: Math.random() > 0.35 ? new Date() : null,
          },
        },
        { upsert: true }
      );
    }
    await UserNotificationPref.updateOne(
      { userId: emp._id },
      {
        $setOnInsert: {
          userId: emp._id,
          emailEnabled: true,
          inAppEnabled: true,
          leaveDecisionEmail: true,
          leaveDecisionInApp: true,
          taskAssignedEmail: true,
          taskAssignedInApp: true,
          deadlineReminderEmail: true,
          deadlineReminderInApp: true,
        },
      },
      { upsert: true }
    );
  }

  return {
    password: PASSWORD,
    managers: allManagers.length,
    employees: allEmployees.length,
    departments: departments.map((d) => `${d.name}: ${d.count}`).join(", "),
    tasks: createdTasks.length,
    leaves: leaveRows.length,
  };
}

if (require.main === module) {
  connectDB()
    .then(() => seedLarge())
    .then((stats) => {
      console.log("Large seed completed");
      console.log(`Managers: ${stats.managers}`);
      console.log(`Employees: ${stats.employees}`);
      console.log(`Departments: ${stats.departments}`);
      console.log(`Tasks: ${stats.tasks}`);
      console.log(`Leave requests: ${stats.leaves}`);
      console.log(`Default password: ${stats.password}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Large seed failed:", err);
      process.exit(1);
    });
}

module.exports = { seedLarge };
