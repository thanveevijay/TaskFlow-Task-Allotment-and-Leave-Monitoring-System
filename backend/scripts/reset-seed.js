/**
 * Run: node backend/scripts/reset-seed.js
 * Drops all employees, tasks, leave requests and re-seeds with realistic data.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Employee = require("../models/Employee");
const Task = require("../models/Task");
const LeaveRequest = require("../models/LeaveRequest");
const Notification = require("../models/Notification");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskdb";

// ── Realistic task pool per department ────────────────────────────────────────
const ENG_BASE = [
  { title: "Migrate auth to OAuth 2.0", desc: "Replace legacy JWT with OAuth 2.0", checklists: ["Audit JWT", "Setup config", "Test endpoints"] },
  { title: "Refactor SQL queries", desc: "Use connection pooling for performance", checklists: ["Benchmark", "Integrate pg-pool", "Test"] },
  { title: "Add security scanning", desc: "Integrate Trivy + Snyk in CI/CD", checklists: ["Add Trivy", "Configure Snyk", "Test PRs"] },
  { title: "Mobile Dark Mode", desc: "System-aware dark mode for React Native", checklists: ["Theme tokens", "Update screens", "Test on iOS"] },
  { title: "API rate limiting", desc: "Roll out Redis-backed rate limits", checklists: ["Provision Redis", "Config limits", "Monitor"] },
];
const HR_BASE = [
  { title: "Q2 Talent Acquisition", desc: "8 open roles in Engineering and Product", checklists: ["JDs", "Post on LinkedIn", "Schedule panels"] },
  { title: "Perf Review Cycle", desc: "Setup self-review and manager review forms", checklists: ["Timeline", "Forms", "Scoring rubric"] },
  { title: "Wellness Program", desc: "Rollout mental health webinars", checklists: ["Vendor finalize", "Opt-in email", "Book slots"] },
  { title: "Update contracts", desc: "Amend ESIC clauses per new labour code", checklists: ["Review code", "Draft template", "Legal sign-off"] },
  { title: "Exit interview process", desc: "Standardise exit interviews", checklists: ["Design form", "Train team", "Tracking"] },
];
const FIN_BASE = [
  { title: "Q1 P&L finalisation", desc: "Prepare variance analysis and board deck", checklists: ["Collect P&L", "Reconcile", "Board deck"] },
  { title: "Tax compliance filing", desc: "Corporate income tax and advance tax", checklists: ["TDS certs", "26AS match", "File tax"] },
  { title: "Vendor recon — April", desc: "50+ vendor invoices pending", checklists: ["Download invoices", "Match POs", "Process pay"] },
  { title: "FY27 budget planning", desc: "Kickoff budgeting cycle", checklists: ["Send template", "Collect data", "Build model"] },
  { title: "Expense policy update", desc: "Implement new travel limits", checklists: ["Update doc", "Config in Zoho", "Communicate"] },
];
const OPS_BASE = [
  { title: "Pune office setup", desc: "40-seat satellite office setup", checklists: ["Lease", "IT setup", "Furniture"] },
  { title: "Supply chain review", desc: "Evaluate tier-1 suppliers", checklists: ["Data collection", "Scorecard", "Review calls"] },
  { title: "Safety protocol audit", desc: "Fire and electrical safety drill", checklists: ["Schedule", "Fire check", "Elec check"] },
  { title: "IT asset inventory", desc: "Audit laptops and networking gear", checklists: ["Download list", "Physical check", "Update"] },
  { title: "Vendor renewals", desc: "8 major contracts expiring in Q2", checklists: ["List contracts", "Assess perf", "Renegotiate"] },
];

function generateTasks(baseList, count) {
  const tasks = [];
  const modifiers = ["urgent", "v2", "follow-up", "phase 2", "review", "audit"];
  for (let i = 0; i < count; i++) {
    const base = baseList[i % baseList.length];
    const modifier = i >= baseList.length ? ` - ${modifiers[i % modifiers.length]}` : "";
    tasks.push({
      title: `${base.title}${modifier}`,
      description: `${base.desc}. This is auto-generated task detail for context. Need to ensure all checklists are completed correctly.`,
      checklists: base.checklists,
      comments: [
        { text: "Need to look into this ASAP.", authorIndex: 0 },
        { text: "I have started working on the initial phase.", authorIndex: 1 },
      ],
      priority: i % 3 === 0 ? "High" : i % 2 === 0 ? "Medium" : "Low",
    });
  }
  return tasks;
}

const ENG_TASKS = generateTasks(ENG_BASE, 25);
const HR_TASKS = generateTasks(HR_BASE, 22);
const FINANCE_TASKS = generateTasks(FIN_BASE, 24);
const OPS_TASKS = generateTasks(OPS_BASE, 20);

// ── Helper ────────────────────────────────────────────────────────────────────
function daysFromNow(d) {
  return new Date(Date.now() + d * 86400000);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

const leaveReasons = [
  "Family function — sister's wedding",
  "Medical appointment — follow-up checkup",
  "Sick leave — viral fever",
  "Annual vacation — Goa trip",
  "Personal — legal documentation work",
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB:", MONGO_URI);

  await Employee.deleteMany({});
  await Task.deleteMany({});
  await LeaveRequest.deleteMany({});
  await Notification.deleteMany({});
  console.log("Cleared old data.");

  const pwd = await bcrypt.hash("demo123", 10);

  // ── Define departments ──
  const depts = [
    {
      name: "Engineering",
      manager: { name: "Nikhil Rao", email: "nikhil.rao@taskflow.io", role: "Engineering Manager" },
      salary: 220000,
      employees: [
        { name: "Arjun Mehta", email: "arjun.mehta@taskflow.io", role: "Software Engineer", salary: 95000, type: "normal" },
        { name: "Priya Nair", email: "priya.nair@taskflow.io", role: "Senior Software Engineer", salary: 125000, type: "exhausted" },
        { name: "Rohit Verma", email: "rohit.verma@taskflow.io", role: "DevOps Engineer", salary: 105000, type: "deduction" },
        { name: "Kavya Iyer", email: "kavya.iyer@taskflow.io", role: "QA Engineer", salary: 82000, type: "normal" },
        { name: "Vikram Sethi", email: "vikram.sethi@taskflow.io", role: "Frontend Developer", salary: 90000, type: "normal" },
      ],
      tasks: ENG_TASKS,
    },
    {
      name: "HR",
      manager: { name: "Sneha Kapoor", email: "sneha.kapoor@taskflow.io", role: "HR Manager" },
      salary: 185000,
      employees: [
        { name: "Ritika Bansal", email: "ritika.bansal@taskflow.io", role: "HR Specialist", salary: 72000, type: "normal" },
        { name: "Mohit Arora", email: "mohit.arora@taskflow.io", role: "Senior Recruiter", salary: 78000, type: "exhausted" },
        { name: "Sonal Chawla", email: "sonal.chawla@taskflow.io", role: "HR Coordinator", salary: 58000, type: "deduction" },
      ],
      tasks: HR_TASKS,
    },
    {
      name: "Finance",
      manager: { name: "Rahul Menon", email: "rahul.menon@taskflow.io", role: "Finance Manager" },
      salary: 200000,
      employees: [
        { name: "Manish Tandon", email: "manish.tandon@taskflow.io", role: "Senior Financial Analyst", salary: 110000, type: "normal" },
        { name: "Rhea Sen", email: "rhea.sen@taskflow.io", role: "Accountant", salary: 72000, type: "exhausted" },
        { name: "Deepak Suri", email: "deepak.suri@taskflow.io", role: "Finance Operations Lead", salary: 88000, type: "deduction" },
      ],
      tasks: FINANCE_TASKS,
    },
    {
      name: "Operations",
      manager: { name: "Ananya Iqbal", email: "ananya.iqbal@taskflow.io", role: "Operations Manager" },
      salary: 190000,
      employees: [
        { name: "Yash Tripathi", email: "yash.tripathi@taskflow.io", role: "Operations Specialist", salary: 75000, type: "normal" },
        { name: "Shreya Lal", email: "shreya.lal@taskflow.io", role: "Logistics Coordinator", salary: 68000, type: "exhausted" },
        { name: "Hemant Arvind", email: "hemant.arvind@taskflow.io", role: "Supply Chain Analyst", salary: 82000, type: "deduction" },
      ],
      tasks: OPS_TASKS,
    },
  ];

  const deadlineOffsets = [-5, -2, 2, 5, 8, 12, 18, 25, 30, -1, 3, 7];
  const statusCycle = ["Completed", "In Progress", "Pending", "In Progress", "Completed", "Pending"];

  for (const dept of depts) {
    const mgr = await Employee.create({
      name: dept.manager.name, email: dept.manager.email, password: pwd,
      accessRole: "manager", department: dept.name, jobRole: dept.manager.role,
      avatar: dept.manager.name.split(" ").map(n => n[0]).join(""),
      avatarUrl: `https://i.pravatar.cc/128?u=${encodeURIComponent(dept.manager.email)}`,
      monthlySalary: dept.salary, leaveAllowance: 20, leaveBalance: 20,
    });

    const empDocs = [];
    for (let i = 0; i < dept.employees.length; i++) {
      const e = dept.employees[i];
      let leaveBalance = 20;
      let usedLeave = 0;

      if (e.type === "exhausted") {
        leaveBalance = 0;
        usedLeave = 20;
      } else if (e.type === "deduction") {
        leaveBalance = -5; // Extracted more leave than allowance
        usedLeave = 25;
      } else {
        leaveBalance = 15;
        usedLeave = 5;
      }

      const emp = await Employee.create({
        name: e.name, email: e.email, password: pwd,
        accessRole: "employee", department: dept.name, jobRole: e.role,
        avatar: e.name.split(" ").map(n => n[0]).join(""),
        avatarUrl: `https://i.pravatar.cc/128?u=${encodeURIComponent(e.email)}`,
        monthlySalary: e.salary, leaveAllowance: 20, leaveBalance,
      });
      empDocs.push(emp);

      // Create leave requests to justify the balance
      if (usedLeave > 0) {
        await LeaveRequest.create({
          employeeId: emp._id, employeeName: emp.name,
          fromDate: new Date(2026, 1, 1),
          toDate: new Date(2026, 1, 1 + usedLeave - 1),
          reason: "Bulk leave taken",
          status: "Approved",
          leaveType: "Casual",
          appliedOn: new Date(2026, 0, 15),
        });
      }

      // Add 2 initial unread notifications for each employee
      await Notification.create({
        userId: emp._id,
        type: "task",
        message: "You have been assigned to 5 new tasks this week.",
        isRead: false,
        link: "/tasks"
      });
      await Notification.create({
        userId: emp._id,
        type: "warning",
        message: "Please submit your weekly timesheet by Friday.",
        isRead: false,
        link: "/dashboard"
      });
    }

    // Create 20-25 tasks
    for (let i = 0; i < dept.tasks.length; i++) {
      const t = dept.tasks[i];
      const assignee = empDocs[i % empDocs.length];
      const status = pick(statusCycle, i);
      const deadlineOffset = pick(deadlineOffsets, i);

      const checklists = t.checklists.map((text, ci) => ({
        text,
        isCompleted: status === "Completed" ? true : ci < Math.floor(t.checklists.length / 2),
      }));

      const authorPool = [mgr, ...empDocs];
      
      let comments = [];
      // Only 30% of tasks have comments, and the text varies
      if (Math.random() < 0.3) {
        const commentTemplates = [
          "Can you provide more details?",
          "I've started working on this.",
          "Almost done, waiting on QA.",
          "Looks good, please proceed.",
          "Needs a minor revision.",
          "Great job on this!",
          "I'm blocked on this currently."
        ];
        const numComments = Math.floor(Math.random() * 3) + 1;
        for (let c = 0; c < numComments; c++) {
          const author = authorPool[Math.floor(Math.random() * authorPool.length)];
          comments.push({
            text: commentTemplates[Math.floor(Math.random() * commentTemplates.length)],
            authorId: author._id,
            authorName: author.name,
            createdAt: new Date(Date.now() - Math.random() * 7 * 86400000),
          });
        }
      }

      const task = await Task.create({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status,
        deadline: daysFromNow(deadlineOffset),
        assignedToId: assignee._id,
        assignedTo: assignee.name,
        checklists,
        comments,
        createdAt: new Date(Date.now() - Math.random() * 30 * 86400000),
        recurrence: "none",
      });

      // Seed Kudos
      if (Math.random() < 0.2) {
        const sender = authorPool[Math.floor(Math.random() * authorPool.length)];
        const receiver = assignee;
        const categories = ["Great collaboration", "Fast turnaround", "Saved the day", "Above and beyond", "Mentorship"];
        if (sender._id.toString() !== receiver._id.toString()) {
          const Kudos = require("../models/Kudos");
          await Kudos.create({
            senderId: sender._id,
            receiverId: receiver._id,
            taskId: task._id,
            category: categories[Math.floor(Math.random() * categories.length)],
            message: "Amazing work on this task!",
            createdAt: new Date(Date.now() - Math.random() * 10 * 86400000)
          });
        }
      }
      // Seed Leaves for April and May
      const leaveMonths = [
        { month: 3, name: "April" }, // April (0-indexed 3)
        { month: 4, name: "May" }   // May (0-indexed 4)
      ];

      for (const lm of leaveMonths) {
        // 40% chance of having a leave in a given month
        if (Math.random() < 0.4) {
          const startDay = Math.floor(Math.random() * 20) + 1;
          const duration = Math.floor(Math.random() * 4) + 1;
          const fromDate = new Date(2026, lm.month, startDay);
          const toDate = new Date(2026, lm.month, startDay + duration);
          
          const reasons = ["Personal emergency", "Vacation", "Sick leave", "Family event", "Mental health day"];
          const statuses = ["Approved", "Approved", "Pending", "Rejected"]; // Biased towards Approved
          
          await LeaveRequest.create({
            employeeId: assignee._id,
            employeeName: assignee.name,
            type: "Casual",
            fromDate,
            toDate,
            days: duration + 1,
            reason: reasons[Math.floor(Math.random() * reasons.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            appliedAt: new Date(fromDate.getTime() - 7 * 86400000)
          });
        }
      }
    }

    console.log(`[✓] ${dept.name}: 1 manager, ${empDocs.length} employees, ${dept.tasks.length} tasks seeded.`);
  }

  const empTotal = await Employee.countDocuments();
  const taskTotal = await Task.countDocuments();
  const leaveTotal = await LeaveRequest.countDocuments();
  console.log(`\n✅ Seed complete — ${empTotal} employees, ${taskTotal} tasks, ${leaveTotal} leave requests.`);
  console.log("\nLogin credentials (all roles):");
  console.log("  Engineering Manager: nikhil.rao@taskflow.io / demo123 / code: ENG-ACCESS-2026");
  console.log("  HR Manager:          sneha.kapoor@taskflow.io / demo123 / code: HR-ACCESS-2026");
  console.log("  Finance Manager:     rahul.menon@taskflow.io / demo123 / code: FIN-ACCESS-2026");
  console.log("  Ops Manager:         ananya.iqbal@taskflow.io / demo123 / code: OPS-ACCESS-2026");
  console.log("  Employee (normal):   arjun.mehta@taskflow.io / demo123");
  console.log("  Employee (deduct):   rohit.verma@taskflow.io / demo123");

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
