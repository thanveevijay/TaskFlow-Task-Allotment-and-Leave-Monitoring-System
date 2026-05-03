const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, query: queryValidator, validationResult } = require("express-validator");
require("dotenv").config();

const connectDB = require("./config/db");
const Task = require("./models/Task");
const Employee = require("./models/Employee");
const LeaveRequest = require("./models/LeaveRequest");
const Activity = require("./models/Activity");
const AuditLog = require("./models/AuditLog");
const Notification = require("./models/Notification");
const UserNotificationPref = require("./models/UserNotificationPref");
const Kudos = require("./models/Kudos");
const OnboardingChecklist = require("./models/OnboardingChecklist");
const StockSetting = require("./models/StockSetting");
const {
  DEFAULT_MONTHLY_SALARY,
  computePayrollRow,
  getSalaryPolicyDTO,
  resolveMonthlySalary,
} = require("./lib/payroll");
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}
let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch {
  PDFDocument = null;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-insecure-change-me") {
  console.warn("JWT_SECRET is using dev default; set a strong secret in production.");
}

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// SSE Clients Map
const sseClients = new Map();
function notifyUser(userId, data) {
  const client = sseClients.get(String(userId));
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const safeExt = allowed.includes(ext) ? ext : ".jpg";
    const uid = String(req.avatarTargetUserId || req.user?.id || "x");
    cb(null, `avatar-${uid}-${Date.now()}${safeExt}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files allowed"));
  },
});

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ message: "Manager access required" });
  }
  next();
}

function setAvatarTargetFromParam(paramName) {
  return (req, res, next) => {
    req.avatarTargetUserId = req.params[paramName];
    next();
  };
}

function setAvatarTargetSelf(req, res, next) {
  const uid = req.user?.id;
  req.avatarTargetUserId = uid;
  res.locals.authenticatedMongoId = uid;
  next();
}

function safeParseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inclusiveDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, days);
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }
  next();
}

function signToken(employee) {
  const id = String(employee._id);
  return jwt.sign({ sub: id, id, role: employee.accessRole }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

function authenticate(req, res, next) {
  let h = req.headers.authorization;
  if (!h && req.query.token) {
    h = `Bearer ${req.query.token}`;
  }
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET);
    const id = payload.sub ?? payload.id ?? payload.userId;
    if (id == null || String(id).trim() === "") {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.user = { id: String(id), role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

async function getRequesterEmployee(req) {
  if (!req?.user?.id) return null;
  return Employee.findById(req.user.id).select("-password");
}

async function getManagerDepartment(req) {
  if (!req?.user?.id || req.user.role !== "manager") return null;
  const manager = await getRequesterEmployee(req);
  return String(manager?.department || "").trim();
}

function dedupeIds(list) {
  return Array.from(new Set((list || []).map((x) => String(x))));
}

function parseManagerDeptAccessCodes() {
  const raw = String(process.env.MANAGER_DEPT_ACCESS_CODES || "").trim();
  const fallback = {
    Engineering: "ENG-ACCESS-2026",
    HR: "HR-ACCESS-2026",
    Finance: "FIN-ACCESS-2026",
    Operations: "OPS-ACCESS-2026",
  };
  if (!raw) return fallback;
  const out = {};
  for (const pair of raw.split(",")) {
    const [k, v] = pair.split(":");
    const key = String(k || "").trim();
    const value = String(v || "").trim();
    if (key && value) out[key] = value;
  }
  return Object.keys(out).length ? out : fallback;
}

function verifyManagerDeptAccessCode(employee, code) {
  const dept = String(employee?.department || "").trim();
  const expected = parseManagerDeptAccessCodes()[dept];
  if (!expected) return false;
  return String(code || "").trim() === expected;
}

function toTaskDTO(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    assignedToId: doc.assignedToId ? String(doc.assignedToId) : null,
    assignedTo: doc.assignedTo || "",
    priority: doc.priority,
    deadline: doc.deadline ? doc.deadline.toISOString().slice(0, 10) : "",
    description: doc.description || "",
    status: doc.status,
    priorityScore: Number(doc.priorityScore || 0),
    smartPriorityLabel: doc.smartPriorityLabel || "Low",
    dependentTaskIds: Array.isArray(doc.dependentTaskIds) ? doc.dependentTaskIds.map((x) => String(x)) : [],
    closedAt: doc.closedAt ? doc.closedAt.toISOString() : null,
    originalAssigneeId: doc.originalAssigneeId ? String(doc.originalAssigneeId) : null,
    originalAssigneeName: doc.originalAssigneeName || "",
    reassignmentNote: doc.reassignmentNote || "",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    comments: Array.isArray(doc.comments) ? doc.comments.map(c => ({
      id: String(c._id),
      text: c.text,
      authorId: String(c.authorId),
      authorName: c.authorName,
      createdAt: c.createdAt ? c.createdAt.toISOString() : null,
    })) : [],
    checklists: Array.isArray(doc.checklists) ? doc.checklists.map(chk => ({
      id: String(chk._id),
      text: chk.text,
      isCompleted: chk.isCompleted
    })) : [],
    recurrence: doc.recurrence || "none",
    aiStrategySuggestion: doc.aiStrategySuggestion || "",
  };
}

function toLeaveDTO(doc) {
  return {
    id: String(doc._id),
    employeeId: doc.employeeId ? String(doc.employeeId) : null,
    employeeName: doc.employeeName || "",
    fromDate: doc.fromDate ? doc.fromDate.toISOString().slice(0, 10) : "",
    toDate: doc.toDate ? doc.toDate.toISOString().slice(0, 10) : "",
    reason: doc.reason || "",
    status: doc.status,
    leaveType: doc.leaveType || "Casual",
    isPaid: doc.isPaid !== false,
    handovers: Array.isArray(doc.handovers)
      ? doc.handovers.map((h) => ({
        taskId: h.taskId ? String(h.taskId) : "",
        substituteEmployeeId: h.substituteEmployeeId ? String(h.substituteEmployeeId) : "",
      }))
      : [],
    appliedOn: doc.appliedOn
      ? doc.appliedOn.toISOString().slice(0, 10)
      : doc.createdAt
        ? doc.createdAt.toISOString().slice(0, 10)
        : "",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

function initialsFromDisplayName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return String(name || "?")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function employeePublicDTO(e) {
  return {
    id: String(e._id),
    name: e.name,
    email: e.email,
    department: e.department || "",
    role: e.jobRole || "",
    accessRole: e.accessRole || "employee",
    avatar: e.avatar || "",
    avatarUrl: e.avatarUrl || "",
    leaveBalance: e.leaveBalance ?? 0,
    monthlySalary: resolveMonthlySalary(e),
  };
}

function toActivityDTO(doc) {
  return {
    id: String(doc._id),
    actorName: doc.actorName || "",
    action: doc.action,
    entityType: doc.entityType || "",
    entityId: doc.entityId || "",
    meta: doc.meta || "",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  };
}

function toNotificationDTO(doc) {
  return {
    id: String(doc._id),
    message: doc.message || "",
    type: doc.type || "info",
    isRead: !!doc.isRead,
    link: doc.link || "",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  };
}

async function logActivity(actor, action, entityType, entityId, targetEmployeeId, meta) {
  if (!actor) return;
  try {
    await Activity.create({
      actorId: actor._id,
      actorName: actor.name,
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : "",
      targetEmployeeId: targetEmployeeId || null,
      meta: meta ? String(meta).slice(0, 500) : "",
    });
  } catch (err) {
    console.error("Activity log failed:", err?.message || err);
  }
}

async function logAudit(req, actor, actionType, targetType, targetId, oldValue, newValue) {
  try {
    await AuditLog.create({
      actionType,
      actorId: actor?._id || null,
      actorName: actor?.name || "",
      targetId: targetId != null ? String(targetId) : "",
      targetType: targetType || "",
      oldValue: oldValue || null,
      newValue: newValue || null,
      ipAddress: req.ip || "",
    });
  } catch (err) {
    console.error("Audit log failed:", err?.message || err);
  }
}

async function createNotification(userId, message, type = "info", link = "") {
  if (!userId) return null;
  try {
    const notif = await Notification.create({ userId, message, type, link, isRead: false });
    notifyUser(userId, { event: "notification", payload: toNotificationDTO(notif) });
    return notif;
  } catch {
    return null;
  }
}

async function getOrCreateNotificationPrefs(userId) {
  let prefs = await UserNotificationPref.findOne({ userId });
  if (!prefs) prefs = await UserNotificationPref.create({ userId });
  return prefs;
}

function getMailer() {
  if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmailIfEnabled(userId, prefKey, subject, html) {
  try {
    const prefs = await getOrCreateNotificationPrefs(userId);
    if (!prefs[prefKey]) return;
    const user = await Employee.findById(userId);
    if (!user?.email) return;
    const mailer = getMailer();
    if (!mailer) return;
    await mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: user.email,
      subject,
      html,
    });
  } catch { }
}

async function ensureOnboardingChecklistFor(userId) {
  const items = ["complete_profile", "upload_avatar", "acknowledge_policy", "first_task_received"];
  for (const itemKey of items) {
    await OnboardingChecklist.updateOne(
      { userId, itemKey },
      { $setOnInsert: { isComplete: false, completedAt: null } },
      { upsert: true }
    );
  }
}

async function recomputeTaskPriority(taskDoc) {
  const now = new Date();
  const deadlineMs = taskDoc.deadline ? new Date(taskDoc.deadline).getTime() : now.getTime() + 14 * 86400000;
  const daysUntilDeadline = Math.max(0, Math.ceil((deadlineMs - now.getTime()) / 86400000));
  
  const assigneeActiveCount = taskDoc.assignedToId
    ? await Task.countDocuments({
      assignedToId: taskDoc.assignedToId,
      status: { $in: ["Pending", "In Progress"] },
      _id: { $ne: taskDoc._id },
    })
    : 0;

  const dependentBlockedCount = Array.isArray(taskDoc.dependentTaskIds)
    ? await Task.countDocuments({ _id: { $in: taskDoc.dependentTaskIds }, status: { $ne: "Completed" } })
    : 0;

  // Hybrid Logic: Mathematical Priority + AI-Style Strategy
  const raw = daysUntilDeadline * 0.4 + assigneeActiveCount * 0.3 + dependentBlockedCount * 0.3;
  const normalized = Math.max(0, Math.min(100, Math.round((100 - Math.min(100, raw * 5)) * 100) / 100));
  
  let label = "Low";
  let strategy = "This task has ample time. Focus on high-priority items first.";

  if (normalized >= 80) {
    label = "Critical";
    strategy = "Immediate action required. This task is blocking others or has an urgent deadline.";
  } else if (normalized >= 60) {
    label = "High";
    strategy = "Prioritize this soon. The deadline is approaching or your workload is increasing.";
  } else if (normalized >= 40) {
    label = "Medium";
    strategy = "Keep a steady pace. Ensure dependent tasks are tracked.";
  }

  taskDoc.priorityScore = normalized;
  taskDoc.smartPriorityLabel = label;
  taskDoc.aiStrategySuggestion = strategy; // New Field 
}

/** 
 * Feature 2: Native Recurring Task Engine 
 * Periodically checks for tasks with recurrence and clones them 
 */
async function processRecurringTasks() {
  console.log("[Engine] Checking for recurring tasks...");
  const tasks = await Task.find({ 
    recurrence: { $in: ["daily", "weekly", "monthly"] },
    status: "Completed",
    lastRecurrenceProcessed: { $ne: new Date().toISOString().slice(0, 10) } 
  });

  for (const t of tasks) {
    const today = new Date().toISOString().slice(0, 10);
    // Clone task
    await Task.create({
      title: `${t.title} (Recurring)`,
      assignedToId: t.assignedToId,
      assignedTo: t.assignedTo,
      priority: t.priority,
      deadline: new Date(Date.now() + 7 * 86400000), // Default +7 days
      description: t.description,
      status: "Pending",
      recurrence: t.recurrence,
    });
    
    // Mark as processed today
    t.lastRecurrenceProcessed = today;
    await t.save();
    console.log(`[Engine] Cloned task: ${t.title}`);
  }
}
// Run every hour
setInterval(processRecurringTasks, 3600000);

async function ensureEmployeeAvatars() {
  const users = await Employee.find({
    $or: [{ avatarUrl: { $exists: false } }, { avatarUrl: null }, { avatarUrl: "" }],
  });
  for (const u of users) {
    u.avatarUrl = `https://i.pravatar.cc/128?u=${encodeURIComponent(u.email)}`;
    await u.save();
  }
}

async function seedIfEmpty() {
  const employeesCount = await Employee.countDocuments();
  if (employeesCount > 0) {
    console.log(`[Database] ${employeesCount} employees found — skipping seed. Run 'node scripts/reset-seed.js' to reset.`);
    return;
  }
  const isGeneric = await Employee.findOne({ name: { $regex: /Employee|Piyush|Reyansh/i } });
  
  if (isGeneric || employeesCount < 10) {
    console.log("[Database] Resetting for REALISTIC High-Fidelity seed...");
    await Employee.deleteMany({});
    await Task.deleteMany({});
    await LeaveRequest.deleteMany({});
  }

  if (await Employee.countDocuments() === 0) {
    console.log("[Seeding] Generating 70 Realistic Identities...");
    const hashedPassword = await bcrypt.hash("demo123", 10);
    
    // Quota structure: Eng (25), HR (15), Ops (15), Finance (15)
    const departments = [
      {
        name: "Engineering",
        manager: { name: "Nikhil Rao", email: "nikhil.rao@taskflow.io", role: "Engineering Manager", code: "ENG-ACCESS-2026" },
        employees: [
          { name: "Arjun Mehta", email: "arjun.mehta@taskflow.io", role: "Software Engineer" },
          { name: "Priya Nair", email: "priya.nair@taskflow.io", role: "Senior Software Engineer" },
          { name: "Rohit Verma", email: "rohit.verma@taskflow.io", role: "DevOps Engineer" },
          { name: "Kavya Iyer", email: "kavya.iyer@taskflow.io", role: "QA Engineer" },
          { name: "Vikram Sethi", email: "vikram.sethi@taskflow.io", role: "Frontend Developer" },
          { name: "Harsh Gupta", email: "harsh.gupta@taskflow.io", role: "Software Engineer", deduction: true },
          { name: "Anita Thomas", email: "anita.thomas@taskflow.io", role: "Software Engineer", deduction: true },
          { name: "Siddharth Raj", email: "siddharth.raj@taskflow.io", role: "Backend Dev" },
          { name: "Ishani Gore", email: "ishani.gore@taskflow.io", role: "Fullstack Dev" },
          { name: "Varun Malhotra", email: "varun.malhotra@taskflow.io", role: "DevOps" }
        ],
        extraCount: 14 // total 25
      },
      {
        name: "HR",
        manager: { name: "Sneha Kapoor", email: "sneha.kapoor@taskflow.io", role: "HR Manager", code: "HR-ACCESS-2026" },
        employees: [
          { name: "Ritika Bansal", email: "ritika.bansal@taskflow.io", role: "HR Specialist", deduction: true },
          { name: "Mohit Arora", email: "mohit.arora@taskflow.io", role: "Recruiter", deduction: true },
          { name: "Sonal Chawla", email: "sonal.chawla@taskflow.io", role: "HR Coordinator", deduction: true },
          { name: "Vivek Mehra", email: "vivek.mehra@taskflow.io", role: "HR Associate", deduction: true },
          { name: "Aditi Oberoi", email: "aditi.oberoi@taskflow.io", role: "HR Associate", deduction: true }
        ],
        extraCount: 9 // total 15
      },
      {
        name: "Finance",
        manager: { name: "Rahul Menon", email: "rahul.menon@taskflow.io", role: "Finance Manager", code: "FIN-ACCESS-2026" },
        employees: [
          { name: "Manish Tandon", email: "manish.tandon@taskflow.io", role: "Financial Analyst", deduction: true },
          { name: "Rhea Sen", email: "rhea.sen@taskflow.io", role: "Accountant", deduction: true },
          { name: "Deepak Suri", email: "deepak.suri@taskflow.io", role: "Finance Operations", deduction: true }
        ],
        extraCount: 11 // total 15
      },
      {
        name: "Operations",
        manager: { name: "Ananya Iqbal", email: "ananya.iqbal@taskflow.io", role: "Operations Manager", code: "OPS-ACCESS-2026" },
        employees: [
          { name: "Yash Tripathi", email: "yash.tripathi@taskflow.io", role: "Operations Specialist", deduction: true },
          { name: "Shreya Lal", email: "shreya.lal@taskflow.io", role: "Logistics Coordinator", deduction: true },
          { name: "Hemant Arvind", email: "hemant.arvind@taskflow.io", role: "Supply Chain Analyst", deduction: true }
        ],
        extraCount: 11 // total 15
      }
    ];

    const firstNames = ["Aarav", "Advait", "Ishaan", "Vihaan", "Reyansh", "Aryan", "Kabir", "Meera", "Saanvi", "Myra", "Anika", "Diya", "Tara", "Kiara", "Shruti", "Neha", "Pooja", "Rohan", "Rahul", "Sameer", "Amit", "Sandeep", "Karan", "Abhishek", "Deepak", "Vivek", "Manish", "Ritika", "Sonal", "Naveen", "Varun", "Aditya", "Ishani", "Kavya", "Tanvi", "Sanya", "Riya", "Aavya", "Arnav", "Dhairya", "Jivan", "Kiaan", "Laksh", "Madhav", "Naksh"];
    const lastNames = ["Mehta", "Nair", "Sharma", "Gupta", "Kulkarni", "Menon", "Aggarwal", "Deshmukh", "Bhatt", "Chhabra", "Sen", "Patel", "Iyer", "Deshpande", "Singh", "Kapoor", "Khurrana", "Rao", "Kaushal", "Malhotra", "Advani", "Padukone", "Chopra", "Pannu", "Bachchan", "Roshan", "Shroff", "Aaryan", "Tripathi", "Siddiqui", "Bajpayee", "Verma", "Ahlawat", "Gandhi", "Sarbh", "Irani", "Rawal", "Shukla", "Pathak", "Shorey", "Joshi", "Bansal"];

    let globalCount = 0;
    for (const d of departments) {
      // Create Manager
      await Employee.create({
        name: d.manager.name, email: d.manager.email, password: hashedPassword,
        accessRole: "manager", department: d.name, jobRole: d.manager.role,
        avatar: d.manager.name.split(" ").map(n=>n[0]).join(""),
        avatarUrl: `https://i.pravatar.cc/128?u=${encodeURIComponent(d.manager.email)}`,
        monthlySalary: 215000 + (globalCount * 100), leaveAllowance: 20, leaveBalance: 20
      });
      globalCount++;

      // Create Key Employees
      for (const e of d.employees) {
        const emp = await Employee.create({
          name: e.name, email: e.email, password: hashedPassword,
          accessRole: "employee", department: d.name, jobRole: e.role,
          avatar: e.name.split(" ").map(n=>n[0]).join(""),
          avatarUrl: `https://i.pravatar.cc/128?u=${encodeURIComponent(e.email)}`,
          monthlySalary: e.role.includes("Senior") ? 118000 : 78000,
          leaveAllowance: 20, leaveBalance: e.deduction ? 13 : 20
        });

        if (e.deduction) {
          await LeaveRequest.create({
            employeeId: emp._id, employeeName: emp.name,
            fromDate: new Date(2026, 3, 1), toDate: new Date(2026, 3, 8),
            reason: "Annual Vacation / Family Event", status: "Approved", appliedOn: new Date()
          });
        }
        globalCount++;
      }

      // Create Fillers (Now with realistic Full Names)
      for (let i = 0; i < d.extraCount; i++) {
        const fname = firstNames[(globalCount * 7) % firstNames.length];
        const lname = lastNames[(globalCount * 3) % lastNames.length];
        const name = `${fname} ${lname}`;
        const email = `${fname.toLowerCase()}.${lname.toLowerCase()}.${globalCount}@taskflow.io`;
        
        await Employee.create({
          name, email, password: hashedPassword,
          accessRole: "employee", department: d.name, jobRole: `${d.name} Associate`,
          avatar: name.split(" ").map(n=>n[0]).join(""),
          avatarUrl: `https://i.pravatar.cc/128?u=${encodeURIComponent(email)}`,
          monthlySalary: 52000 + (Math.random() * 15000),
          leaveAllowance: 20, leaveBalance: 20
        });
        globalCount++;
      }
    }

    // --- SEED 200 TASKS (50 per Dept) ---
    const allEmps = await Employee.find({});
    const mainDepts = ["Engineering", "HR", "Finance", "Operations"];
    
    console.log("[Seeding] Generating 200 Department-Scoped Tasks...");
    
    const engThemes = ["VPC Lockdown", "K8s Cluster Patch", "Auth Refactor", "API Documentation", "SQL Optimization", "CI Pipeline fix", "Mobile Dark Theme", "Security Audit", "Docker Build Opt", "Unit Test Coverage"];
    const hrThemes = ["Talent Review", "Benefit Rollout", "Policy Update", "New Hire Sync", "Interview Panels", "Wellness Program", "Compliance Training", "Payroll Audit", "Exit Interview", "Referral Bonus"];
    const finThemes = ["P&L Analysis", "Q2 Budgeting", "Tax Compliance", "Vendor Payment", "Expense Audit", "Investor Deck", "Revenue Forecast", "Internal Audit", "Ledger Cleanup", "Payroll Finalization"];
    const opsThemes = ["Supply Chain Sync", "Inventory Audit", "Logistics Rout", "Vendor Outreach", "Site Maintenance", "Office Expansion", "Safety Protocol", "Asset Tracking", "Service Renewal", "Equipment Upd"];

    for (const dName of mainDepts) {
      const deptEmps = allEmps.filter(e => e.department === dName && e.accessRole === "employee");
      const deptMgr = allEmps.find(e => e.department === dName && e.accessRole === "manager") || allEmps[0];
      const themes = dName === "Engineering" ? engThemes : (dName === "HR" ? hrThemes : (dName === "Finance" ? finThemes : opsThemes));

      for (let i = 0; i < 50; i++) {
        const theme = themes[i % themes.length];
        const assignee = deptEmps[i % deptEmps.length];
        await Task.create({
          title: `${theme} - Phase ${i + 1}`,
          description: `Strategic ${dName} priority: ${theme}. Critical path for company goals.`,
          dept: dName,
          priority: i % 4 === 0 ? "High" : "Medium",
          status: i % 3 === 0 ? "Completed" : (i % 2 === 0 ? "In Progress" : "Pending"),
          assignedTo: assignee.name,
          assignedToId: assignee._id,
          creator: deptMgr._id,
          checklists: [{ text: "Analysis", isCompleted: true }, { text: "Execution", isCompleted: false }],
          comments: [{ text: "Proceed with caution.", authorName: deptMgr.name, authorId: deptMgr._id, createdAt: new Date() }]
        });
      }

      // --- SEED LEAVES FOR MAJORITY (70% of each dept takes 1-2 days off) ---
      const slice = deptEmps.slice(0, Math.floor(deptEmps.length * 0.7));
      for (let j = 0; j < slice.length; j++) {
        const emp = slice[j];
        await LeaveRequest.create({
          employeeId: emp._id, employeeName: emp.name,
          fromDate: new Date(2026, 3, 15 + (j % 5)), toDate: new Date(2026, 3, 16 + (j % 5)),
          reason: "Planned Short Leave", status: "Approved", appliedOn: new Date()
        });
        emp.leaveBalance -= 2;
        await emp.save();
      }
    }
  }

  console.log(`[Database] 200+ TASK SYNC COMPLETE. Total Employees: ${await Employee.countDocuments()}, Total Tasks: ${await Task.countDocuments()}`);
}

seedIfEmpty().catch((err) => {
  console.error("Seed error:", err?.message || err);
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/assets", express.static("C:/Users/thanv/.gemini/antigravity/brain/abc152b5-86d6-4b4b-9314-036327e0f49b"));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// SSE Stream Setup
app.get("/stream", authenticate, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.set(req.user.id, res);
  // Send heartbeat
  const ping = setInterval(() => res.write(":\n\n"), 15000);

  req.on("close", () => {
    clearInterval(ping);
    sseClients.delete(req.user.id);
  });
});

app.post(
  "/auth/login",
  loginLimiter,
  body("email").isEmail(),
  body("password").isString().isLength({ min: 1 }),
  body("role").optional().isIn(["manager", "employee"]),
  body("managerAccessCode").optional().isString(),
  handleValidation,
  async (req, res) => {
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);
    const selectedRole = req.body.role ? String(req.body.role) : "";
    const employee = await Employee.findOne({ email });
    if (!employee) return res.status(401).json({ message: "Invalid credentials" });

    let valid = false;
    if (employee.password && employee.password.startsWith("$2")) {
      valid = await bcrypt.compare(password, employee.password);
    } else {
      valid = employee.password === password;
      if (valid) {
        employee.password = await bcrypt.hash(password, 10);
        await employee.save();
      }
    }
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });
    if (selectedRole && employee.accessRole !== selectedRole) {
      return res.status(403).json({
        message: `You are not registered as a ${selectedRole === "manager" ? "Manager" : "Employee"}`,
      });
    }
    if ((selectedRole === "manager" || (!selectedRole && employee.accessRole === "manager")) && !verifyManagerDeptAccessCode(employee, req.body.managerAccessCode)) {
      return res.status(403).json({ message: "Invalid manager department access code" });
    }

    const token = signToken(employee);
    await logAudit(req, employee, "user_login", "user", employee._id, null, {
      role: employee.accessRole,
      email: employee.email,
    });
    return res.json({
      token,
      accessRole: employee.accessRole,
      employee: employeePublicDTO(employee),
    });
  }
);

// ──────────────────────────────────────────────────────────
// AUTH: change-password, forgot-password, reset-password, me, avatar
// ──────────────────────────────────────────────────────────

app.post(
  "/auth/change-password",
  authenticate,
  body("currentPassword").isString().isLength({ min: 1 }),
  body("newPassword").isString().isLength({ min: 4 }),
  handleValidation,
  async (req, res) => {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: "User not found" });
    const valid = employee.password.startsWith("$2")
      ? await bcrypt.compare(req.body.currentPassword, employee.password)
      : employee.password === req.body.currentPassword;
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
    employee.password = await bcrypt.hash(req.body.newPassword, 10);
    await employee.save();
    await logAudit(req, employee, "password_changed", "user", employee._id, null, null);
    res.json({ message: "Password changed" });
  }
);

app.post(
  "/auth/forgot-password",
  body("email").isEmail(),
  handleValidation,
  async (req, res) => {
    const email = String(req.body.email).toLowerCase().trim();
    const employee = await Employee.findOne({ email });
    if (!employee) return res.json({ message: "If that email exists, a code has been sent." });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    employee.resetCodeHash = await bcrypt.hash(code, 10);
    employee.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await employee.save();
    await sendEmailIfEnabled(employee._id, "leaveApprovedEmail", "Password Reset Code", `<p>Your reset code: <strong>${code}</strong></p>`);
    const resp = { message: "If that email exists, a code has been sent." };
    if (process.env.NODE_ENV !== "production") resp.devResetCode = code;
    res.json(resp);
  }
);

app.post(
  "/auth/reset-password",
  body("email").isEmail(),
  body("code").isString().isLength({ min: 1 }),
  body("newPassword").isString().isLength({ min: 4 }),
  handleValidation,
  async (req, res) => {
    const email = String(req.body.email).toLowerCase().trim();
    const employee = await Employee.findOne({ email });
    if (!employee || !employee.resetCodeHash) return res.status(400).json({ message: "Invalid or expired code" });
    if (employee.resetCodeExpiresAt && employee.resetCodeExpiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    const match = await bcrypt.compare(String(req.body.code), employee.resetCodeHash);
    if (!match) return res.status(400).json({ message: "Invalid or expired code" });
    employee.password = await bcrypt.hash(req.body.newPassword, 10);
    employee.resetCodeHash = "";
    employee.resetCodeExpiresAt = null;
    await employee.save();
    res.json({ message: "Password has been reset" });
  }
);

app.get("/auth/me", authenticate, async (req, res) => {
  const employee = await Employee.findById(req.user.id).select("-password");
  if (!employee) return res.status(404).json({ message: "User not found" });
  res.json({ accessRole: employee.accessRole, employee: employeePublicDTO(employee) });
});

app.patch(
  "/auth/me",
  authenticate,
  async (req, res) => {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: "User not found" });
    const old = { name: employee.name, email: employee.email };
    if (req.body.name) employee.name = String(req.body.name).trim();
    if (req.body.email) employee.email = String(req.body.email).toLowerCase().trim();
    await employee.save();
    await logAudit(req, employee, "profile_updated", "user", employee._id, old, { name: employee.name, email: employee.email });
    res.json({ accessRole: employee.accessRole, employee: employeePublicDTO(employee) });
  }
);

app.post(
  "/auth/avatar",
  authenticate,
  setAvatarTargetSelf,
  uploadAvatar.single("avatar"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: "User not found" });
    employee.avatarUrl = `/uploads/${req.file.filename}`;
    employee.avatar = initialsFromDisplayName(employee.name);
    await employee.save();
    await OnboardingChecklist.updateOne(
      { userId: employee._id, itemKey: "upload_avatar" },
      { $set: { isComplete: true, completedAt: new Date() } }
    );
    res.json({ employee: employeePublicDTO(employee) });
  }
);

// ──────────────────────────────────────────────────────────
// TASKS
// ──────────────────────────────────────────────────────────

app.get("/tasks", authenticate, async (req, res) => {
  const filter = {};
  if (req.query.assignedToId) filter.assignedToId = req.query.assignedToId;

  if (req.user.role === "manager") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) {
      const validEmployeeDocs = await Employee.find({ department: mgrDept }, '_id');
      const validEmployeeIds = validEmployeeDocs.map(e => e._id);
      
      if (filter.assignedToId) {
        // Must match someone in their department
        if (!validEmployeeIds.some(id => String(id) === String(filter.assignedToId))) {
          return res.json([]);
        }
      } else {
        // See their department's tasks OR unassigned tasks pool
        filter.$or = [
          { assignedToId: { $in: validEmployeeIds } },
          { assignedToId: null }
        ];
      }
    }
  }

  const docs = await Task.find(filter).sort({ createdAt: -1 });
  res.json(docs.map(toTaskDTO));
});

app.post("/tasks/:id/comments", authenticate, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  
  const actor = await getRequesterEmployee(req);
  if (!actor) return res.status(401).json({ message: "Unauthorized" });

  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Text is required" });

  task.comments.push({
    text,
    authorId: actor._id,
    authorName: actor.name,
    createdAt: new Date()
  });
  await task.save();
  res.json(toTaskDTO(task));
});

app.post("/tasks/:id/checklists", authenticate, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Checklist text is required" });

  task.checklists.push({ text, isCompleted: false });
  await task.save();
  res.json(toTaskDTO(task));
});

app.patch("/tasks/:id/checklists/:itemId", authenticate, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  
  const item = task.checklists.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: "Checklist item not found" });

  if (typeof req.body.isCompleted === 'boolean') {
    item.isCompleted = req.body.isCompleted;
  }
  await task.save();
  res.json(toTaskDTO(task));
});

app.post("/tasks", authenticate, async (req, res) => {
  const { title, assignedToId, priority, deadline, description, dependentTaskIds, status, recurrence } = req.body;
  let assignedTo = "";
  if (assignedToId) {
    const emp = await Employee.findById(assignedToId);
    assignedTo = emp ? emp.name : "";
  }
  const task = new Task({
    title,
    assignedToId: assignedToId || null,
    assignedTo,
    priority: priority || "Medium",
    deadline: safeParseDate(deadline),
    description: description || "",
    dependentTaskIds: dependentTaskIds || [],
    status: status || "Pending",
    recurrence: recurrence || "none",
  });
  await recomputeTaskPriority(task);
  await task.save();

  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "created_task", "task", task._id, task.assignedToId, task.title);
  await logAudit(req, actor, "task_created", "task", task._id, null, { title: task.title, assignedTo: task.assignedTo });
  if (task.assignedToId) {
    await createNotification(task.assignedToId, `New task assigned: ${task.title}`, "task", "");
    await sendEmailIfEnabled(task.assignedToId, "taskAssignedEmail", "New Task Assigned", `<p>You've been assigned: <strong>${task.title}</strong></p>`);
    await OnboardingChecklist.updateOne(
      { userId: task.assignedToId, itemKey: "first_task_received" },
      { $set: { isComplete: true, completedAt: new Date() } }
    );
  }
  res.status(201).json(toTaskDTO(task));
});

app.get("/tasks/smart-suggestions", authenticate, async (req, res) => {
  const filter = { status: { $in: ["Pending", "In Progress"] } };
  let employeeFilter = {};

  if (req.user.role === "manager") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) {
      employeeFilter.department = mgrDept;
      const validEmployeeDocs = await Employee.find(employeeFilter, '_id');
      const validEmployeeIds = validEmployeeDocs.map(e => e._id);
      
      filter.$or = [
        { assignedToId: { $in: validEmployeeIds } },
        { assignedToId: null }
      ];
    }
  }

  const openTasks = await Task.find(filter)
    .sort({ priorityScore: -1 })
    .limit(20);
    
  const visibleEmployees = await Employee.find(employeeFilter).select("-password -resetCodeHash");
  
  const items = [];
  for (const t of openTasks) {
    const suggestedSubstitutes = visibleEmployees
      .filter((e) => String(e._id) !== String(t.assignedToId) && e.accessRole !== "manager")
      .slice(0, 3)
      .map((e) => ({ id: String(e._id), name: e.name }));
    items.push({
      id: String(t._id),
      title: t.title,
      assignedToId: t.assignedToId ? String(t.assignedToId) : null,
      assignedTo: t.assignedTo || "",
      priorityScore: t.priorityScore || 0,
      suggestedSubstitutes,
    });
  }
  res.json({ items });
});

app.patch("/tasks/:id/status", authenticate, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  // NOTE: Relaxing the checklist requirement as per user request to allow moving tasks to completed freely.
  /*
  if (req.body.status === "Completed") {
    const uncompletedChecklists = task.checklists.filter(c => !c.isCompleted);
    if (uncompletedChecklists.length > 0) {
      return res.status(400).json({ message: "Cannot complete task: uncompleted checklist items remain." });
    }
  }
  */


  const oldStatus = task.status;
  task.status = req.body.status;
  if (req.body.status === "Completed" && !task.closedAt) task.closedAt = new Date();
  if (req.body.status !== "Completed") task.closedAt = null;
  await recomputeTaskPriority(task);
  await task.save();
  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "updated_task_status", "task", task._id, task.assignedToId, `${oldStatus} → ${task.status}`);
  await logAudit(req, actor, "task_status_changed", "task", task._id, { status: oldStatus }, { status: task.status });
  res.json(toTaskDTO(task));
});

app.patch("/tasks/:id/reassign", authenticate, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  const oldAssigneeId = task.assignedToId;
  const oldAssigneeName = task.assignedTo;
  const newEmp = await Employee.findById(req.body.newAssignedToId);
  if (!newEmp) return res.status(404).json({ message: "New assignee not found" });
  if (!task.originalAssigneeId) {
    task.originalAssigneeId = oldAssigneeId;
    task.originalAssigneeName = oldAssigneeName;
  }
  task.assignedToId = newEmp._id;
  task.assignedTo = newEmp.name;
  task.reassignmentNote = req.body.note || `Reassigned from ${oldAssigneeName} to ${newEmp.name}`;
  await recomputeTaskPriority(task);
  await task.save();
  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "reassigned_task", "task", task._id, newEmp._id, `${oldAssigneeName} → ${newEmp.name}`);
  await logAudit(req, actor, "task_reassigned", "task", task._id, { assignedTo: oldAssigneeName }, { assignedTo: newEmp.name });
  await createNotification(newEmp._id, `Task reassigned to you: ${task.title}`, "task", "");
  res.json(toTaskDTO(task));
});

app.delete("/tasks/:id", authenticate, async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "deleted_task", "task", task._id, null, task.title);
  await logAudit(req, actor, "task_deleted", "task", task._id, { title: task.title }, null);
  res.json({ message: "Deleted" });
});

// ──────────────────────────────────────────────────────────
// EMPLOYEES
// ──────────────────────────────────────────────────────────

app.get("/employees", authenticate, async (req, res) => {
  let employeeFilter = {};
  
  if (req.user.role === "manager") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) {
      employeeFilter.department = mgrDept;
    }
  }

  const employees = await Employee.find(employeeFilter).select("-password");
  const validEmployeeIds = employees.map(e => e._id);
  
  const taskFilter = employeeFilter.department 
    ? { $or: [{ assignedToId: { $in: validEmployeeIds } }, { assignedToId: null }] } 
    : {};
  const tasks = await Task.find(taskFilter);
  const result = employees.map((e) => {
    const dto = employeePublicDTO(e);
    dto.tasksCompleted = tasks.filter((t) => String(t.assignedToId) === String(e._id) && t.status === "Completed").length;
    dto.tasksInProgress = tasks.filter((t) => String(t.assignedToId) === String(e._id) && t.status !== "Completed").length;
    return dto;
  });
  res.json(result);
});

app.post(
  "/employees",
  authenticate,
  requireManager,
  body("name").isString().isLength({ min: 1 }),
  body("email").isEmail(),
  body("password").isString().isLength({ min: 1 }),
  handleValidation,
  async (req, res) => {
    const { name, email, password, jobRole, department, accessRole, leaveAllowance, leaveBalance } = req.body;
    const existing = await Employee.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: "Email already in use" });
    const hashed = await bcrypt.hash(password, 10);
    const employee = await Employee.create({
      accessRole: accessRole || "employee",
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashed,
      jobRole: jobRole || "",
      department: department || "",
      avatar: initialsFromDisplayName(name),
      avatarUrl: `https://i.pravatar.cc/128?u=${encodeURIComponent(email)}`,
      leaveAllowance: leaveAllowance ?? 20,
      leaveBalance: leaveBalance ?? 20,
      monthlySalary: DEFAULT_MONTHLY_SALARY,
    });
    await ensureOnboardingChecklistFor(employee._id);
    const actor = await getRequesterEmployee(req);
    await logActivity(actor, "created_employee", "employee", employee._id, null, employee.name);
    await logAudit(req, actor, "employee_created", "employee", employee._id, null, { name: employee.name, email: employee.email });
    res.status(201).json(employeePublicDTO(employee));
  }
);

app.post(
  "/employees/:id/avatar",
  authenticate,
  setAvatarTargetFromParam("id"),
  uploadAvatar.single("avatar"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    employee.avatarUrl = `/uploads/${req.file.filename}`;
    employee.avatar = initialsFromDisplayName(employee.name);
    await employee.save();
    res.json(employeePublicDTO(employee));
  }
);

app.delete("/employees/:id", authenticate, requireManager, async (req, res) => {
  const emp = await Employee.findByIdAndDelete(req.params.id);
  if (!emp) return res.status(404).json({ message: "Employee not found" });
  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "deleted_employee", "employee", emp._id, null, emp.name);
  await logAudit(req, actor, "employee_deleted", "employee", emp._id, { name: emp.name }, null);
  res.json({ message: "Deleted" });
});

// ──────────────────────────────────────────────────────────
// LEAVE REQUESTS
// ──────────────────────────────────────────────────────────

app.get("/leave-requests", authenticate, async (req, res) => {
  const filter = {};
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;

  if (req.user.role === "manager") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) {
      const validEmployeeDocs = await Employee.find({ department: mgrDept }, '_id');
      const validEmployeeIds = validEmployeeDocs.map(e => e._id);
      
      if (filter.employeeId) {
        if (!validEmployeeIds.some(id => String(id) === String(filter.employeeId))) {
          return res.json([]);
        }
      } else {
        filter.employeeId = { $in: validEmployeeIds };
      }
    }
  }

  const docs = await LeaveRequest.find(filter).sort({ createdAt: -1 });
  res.json(docs.map(toLeaveDTO));
});

app.post("/leave-requests", authenticate, async (req, res) => {
  const { employeeId, fromDate, toDate, reason, leaveType, handovers } = req.body;
  const employee = await Employee.findById(employeeId);
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  const days = inclusiveDays(fromDate, toDate);
  const lr = await LeaveRequest.create({
    employeeId: employee._id,
    employeeName: employee.name,
    fromDate: safeParseDate(fromDate),
    toDate: safeParseDate(toDate),
    reason: reason || "",
    leaveType: leaveType || "Casual",
    handovers: handovers || [],
    status: "Pending",
    appliedOn: new Date(),
  });

  // Feature 3: Smart Conflict Detection (Return warning in response)
  const conflicts = await Task.find({
    assignedToId: employee._id,
    status: { $in: ["Pending", "In Progress"] },
    deadline: { $gte: new Date(fromDate), $lte: new Date(toDate) }
  });

  const conflictWarning = conflicts.length > 0
    ? `Heads up! You have ${conflicts.length} task(s) due during this leave period. Please ensure handovers are completed.`
    : null;
  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "submitted_leave", "leave", lr._id, null, `${days} day(s)`);
  await logAudit(req, actor, "leave_request_created", "leave", lr._id, null, { employeeName: employee.name, days });

  // Notify managers
  const managers = await Employee.find({ accessRole: "manager" });
  for (const m of managers) {
    await createNotification(m._id, `${employee.name} requested ${days} day(s) leave`, "leave", "");
    await sendEmailIfEnabled(m._id, "newLeaveSubmittedEmail", "New Leave Request", `<p>${employee.name} has requested ${days} day(s) of leave.</p>`);
  }
  res.status(201).json({ ...toLeaveDTO(lr), conflictWarning });
});

app.patch("/leave-requests/:id/status", authenticate, async (req, res) => {
  const lr = await LeaveRequest.findById(req.params.id);
  if (!lr) return res.status(404).json({ message: "Leave request not found" });
  const oldStatus = lr.status;
  lr.status = req.body.status;
  await lr.save();

  // Adjust leave balance on approval/rejection
  if (req.body.status === "Approved" && oldStatus !== "Approved") {
    const days = inclusiveDays(lr.fromDate, lr.toDate);
    await Employee.findByIdAndUpdate(lr.employeeId, { $inc: { leaveBalance: -days } });
    await createNotification(lr.employeeId, `Your leave request has been approved`, "success", "");
    await sendEmailIfEnabled(lr.employeeId, "leaveApprovedEmail", "Leave Approved", `<p>Your leave from ${lr.fromDate.toISOString().slice(0, 10)} to ${lr.toDate.toISOString().slice(0, 10)} has been approved.</p>`);
  } else if (req.body.status === "Rejected") {
    if (oldStatus === "Approved") {
      const days = inclusiveDays(lr.fromDate, lr.toDate);
      await Employee.findByIdAndUpdate(lr.employeeId, { $inc: { leaveBalance: days } });
    }
    await createNotification(lr.employeeId, `Your leave request has been rejected`, "warning", "");
    await sendEmailIfEnabled(lr.employeeId, "leaveRejectedEmail", "Leave Rejected", `<p>Your leave request has been rejected.</p>`);
  }

  const actor = await getRequesterEmployee(req);
  await logActivity(actor, "updated_leave_status", "leave", lr._id, lr.employeeId, `${oldStatus} → ${lr.status}`);
  await logAudit(req, actor, "leave_status_changed", "leave", lr._id, { status: oldStatus }, { status: lr.status });
  res.json(toLeaveDTO(lr));
});

// ──────────────────────────────────────────────────────────
// REPORTS
// ──────────────────────────────────────────────────────────

app.get("/reports", authenticate, async (req, res) => {
  let mgrDept = null;
  if (req.user.role === "manager") {
    mgrDept = await getManagerDepartment(req);
  }

  const employeeFilter = mgrDept ? { department: mgrDept } : {};
  const employees = await Employee.find(employeeFilter).select("-password");
  const empIds = employees.map(e => String(e._id));
  
  const taskFilter = mgrDept 
    ? { $or: [{ assignedToId: { $in: employees.map(e => e._id) } }, { assignedToId: null }] } 
    : {};

  const tasks = await Task.find(taskFilter);
  const leaveRequests = await LeaveRequest.find({ employeeId: { $in: empIds } });
  
  const role = req.query.role || req.user.role;
  const employeeId = req.query.employeeId;

  let filteredTasks = tasks;
  let filteredLeave = leaveRequests;
  if (role === "employee" && employeeId) {
    filteredTasks = tasks.filter((t) => String(t.assignedToId) === employeeId);
    filteredLeave = leaveRequests.filter((l) => String(l.employeeId) === employeeId);
  }

  const now = new Date();
  const employeesOnLeaveIds = leaveRequests.filter(
    (l) => l.status === "Approved" && new Date(l.fromDate) <= now && new Date(l.toDate) >= now
  ).map(l => String(l.employeeId));
  
  const uniqueEmployeesOnLeave = [...new Set(employeesOnLeaveIds)].length;

  res.json({
    totalTasks: filteredTasks.length,
    completedTasks: filteredTasks.filter((t) => t.status === "Completed").length,
    pendingTasks: filteredTasks.filter((t) => t.status === "Pending").length,
    inProgressTasks: filteredTasks.filter((t) => t.status === "In Progress").length,
    employeesOnLeave: uniqueEmployeesOnLeave,
    tasks: filteredTasks.map(toTaskDTO),
    employees: employees.map((e) => {
      const dto = employeePublicDTO(e);
      dto.tasksCompleted = tasks.filter((t) => String(t.assignedToId) === String(e._id) && t.status === "Completed").length;
      dto.tasksInProgress = tasks.filter((t) => String(t.assignedToId) === String(e._id) && t.status !== "Completed").length;
      return dto;
    }),
    leaveRequests: filteredLeave.map(toLeaveDTO),
  });
});

app.get("/reports/departments", authenticate, async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  
  let employeeFilter = {};
  if (req.user.role === "manager" && req.query.includeAll !== "1") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) employeeFilter.department = mgrDept;
  }

  const employees = await Employee.find(employeeFilter).select("-password");
  const validEmployeeIds = employees.map(e => e._id);
  
  const taskFilter = employeeFilter.department 
    ? { $or: [{ assignedToId: { $in: validEmployeeIds } }, { assignedToId: null }] } 
    : {};
  const tasks = await Task.find(taskFilter);
  const leaveRequests = await LeaveRequest.find();

  const deptMap = {};
  for (const e of employees) {
    const dept = e.department || "Other";
    if (!deptMap[dept]) {
      deptMap[dept] = { department: dept, headcount: 0, totalTasks: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0, avgTaskCompletionRate: 0, totalApprovedLeaveDays: 0, leaveUtilisationPercent: 0, totalPayrollCost: 0 };
    }
    deptMap[dept].headcount++;
    const empTasks = tasks.filter((t) => String(t.assignedToId) === String(e._id));
    deptMap[dept].totalTasks += empTasks.length;
    deptMap[dept].completedTasks += empTasks.filter((t) => t.status === "Completed").length;
    deptMap[dept].inProgressTasks += empTasks.filter((t) => t.status === "In Progress").length;
    deptMap[dept].pendingTasks += empTasks.filter((t) => t.status === "Pending").length;
    const row = computePayrollRow(e, leaveRequests, year, month);
    deptMap[dept].totalPayrollCost += row.netSalary;
    deptMap[dept].totalApprovedLeaveDays += row.leaveDaysInMonth;
  }
  const rows = Object.values(deptMap).map((d) => {
    d.avgTaskCompletionRate = d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0;
    d.leaveUtilisationPercent = d.headcount > 0 ? Math.round((d.totalApprovedLeaveDays / (d.headcount * 20)) * 100) : 0;
    return d;
  });
  res.json({ month, year, rows });
});

app.get("/reports/workload", authenticate, async (req, res) => {
  const week = req.query.week === "next" ? "next" : "current";
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  if (week === "next") startOfWeek.setDate(startOfWeek.getDate() + 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  let employeeFilter = {};
  if (req.user.role === "manager") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) employeeFilter.department = mgrDept;
  }

  const employees = await Employee.find(employeeFilter).select("-password");
  const validEmployeeIds = employees.map(e => e._id);
  
  const taskFilter = { status: { $in: ["Pending", "In Progress"] } };
  if (employeeFilter.department) {
    taskFilter.$or = [{ assignedToId: { $in: validEmployeeIds } }, { assignedToId: null }];
  }
  
  const tasks = await Task.find(taskFilter);
  const rows = [];
  for (const e of employees) {
    const empTasks = tasks.filter((t) => String(t.assignedToId) === String(e._id));
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      const dayTasks = empTasks.filter((t) => {
        if (!t.deadline) return d === 0;
        return t.deadline.toISOString().slice(0, 10) === dateStr;
      });
      days.push({
        date: dateStr,
        count: dayTasks.length,
        tasks: dayTasks.map((t) => ({ id: String(t._id), title: t.title, status: t.status })),
      });
    }
    rows.push({ employeeId: String(e._id), employeeName: e.name, department: e.department || "", days });
  }
  res.json({
    week,
    range: { start: startOfWeek.toISOString().slice(0, 10), end: endOfWeek.toISOString().slice(0, 10) },
    rows,
  });
});

// ──────────────────────────────────────────────────────────
// PAYROLL
// ──────────────────────────────────────────────────────────

app.get("/payroll/monthly", authenticate, async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  let employeeFilter = {};
  if (req.user.role === "manager") {
    const mgrDept = await getManagerDepartment(req);
    if (mgrDept) employeeFilter.department = mgrDept;
  }

  const employees = await Employee.find(employeeFilter).select("-password");
  const leaveRequests = await LeaveRequest.find({ status: "Approved" });
  const rows = employees.map((e) => computePayrollRow(e, leaveRequests, year, month));
  res.json({ year, month, policy: getSalaryPolicyDTO(), rows });
});

app.post("/payroll/request-slip", authenticate, async (req, res) => {
  const { month, year } = req.body;
  const employee = await Employee.findById(req.user.id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const manager = await Employee.findOne({ department: employee.department, accessRole: "manager" });
  if (manager) {
    await Notification.create({
      userId: manager._id,
      type: "warning",
      message: `${employee.name} has requested their payslip for ${month}/${year}.`,
      isRead: false,
      link: "/reports", // managers check payroll in reports
    });
  }
  res.json({ ok: true, message: "Payslip requested" });
});

app.post("/payroll/send-slip", authenticate, async (req, res) => {
  const { employeeId, month, year } = req.body;
  const employee = await Employee.findById(employeeId);
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  await Notification.create({
    userId: employee._id,
    type: "success",
    message: `Your payslip for ${month}/${year} is now available.`,
    isRead: false,
    link: "/dashboard", // employees check payroll in dashboard
  });

  res.json({ ok: true, message: "Payslip sent" });
});

// ──────────────────────────────────────────────────────────
// KUDOS
// ──────────────────────────────────────────────────────────

app.post("/kudos", authenticate, async (req, res) => {
  const { receiverId, taskId, category, message } = req.body;
  const senderId = req.user.id;
  const kudos = await Kudos.create({ senderId, receiverId, taskId, category, message });
  
  const sender = await Employee.findById(senderId);
  const receiver = await Employee.findById(receiverId);

  await Notification.create({
    userId: receiverId,
    type: "success",
    message: `${sender ? sender.name : 'Someone'} gave you kudos for ${category}!`,
    isRead: false,
    link: "/dashboard"
  });

  res.status(201).json({
    id: kudos._id.toString(),
    senderName: sender?.name,
    receiverName: receiver?.name,
    category: kudos.category,
    message: kudos.message,
    createdAt: kudos.createdAt
  });
});

app.get("/kudos/recent", authenticate, async (req, res) => {
  const docs = await Kudos.find().sort({ createdAt: -1 }).limit(10).populate("senderId receiverId");
  const items = docs.map(k => ({
    id: k._id.toString(),
    senderName: k.senderId ? k.senderId.name : "Unknown",
    receiverName: k.receiverId ? k.receiverId.name : "Unknown",
    category: k.category,
    message: k.message,
    createdAt: k.createdAt
  }));
  res.json(items);
});

app.get("/kudos/leaderboard", authenticate, async (req, res) => {
  const result = await Kudos.aggregate([
    { $group: { _id: "$receiverId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  const populated = await Employee.populate(result, { path: "_id", select: "name" });
  const items = populated.map(p => ({
    employeeId: p._id?._id?.toString() || p._id?.toString() || "unknown",
    employeeName: p._id?.name || "Team Member",
    count: p.count
  }));
  
  res.json({ items });
});

// ──────────────────────────────────────────────────────────
// NOTIFICATIONS (activity feed + in-app)
// ──────────────────────────────────────────────────────────

app.get("/notifications", authenticate, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 12, 100);
  const docs = await Activity.find().sort({ createdAt: -1 }).limit(limit);
  res.json(docs.map(toActivityDTO));
});

app.get("/notifications/in-app", authenticate, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const docs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(limit);
  res.json(docs.map(toNotificationDTO));
});

app.get("/notifications/unread-count", authenticate, async (req, res) => {
  const unread = await Notification.countDocuments({ userId: req.user.id, isRead: false });
  res.json({ unread });
});

app.post("/notifications/read-all", authenticate, async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
  res.json({ ok: true });
});

app.post("/notifications/:id/read", authenticate, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ ok: true });
});

// /api/ prefixed routes for direct fetch calls in useRealtime.ts & EmployeeDashboard.tsx
app.post("/api/notifications/read-all", authenticate, async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
  res.json({ ok: true });
});

app.post("/api/notifications/:id/read", authenticate, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ ok: true });
});

// ──────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ──────────────────────────────────────────────────────────

app.get("/notification-prefs", authenticate, async (req, res) => {
  const prefs = await getOrCreateNotificationPrefs(req.user.id);
  res.json({
    leaveApprovedEmail: prefs.leaveApprovedEmail,
    leaveRejectedEmail: prefs.leaveRejectedEmail,
    taskAssignedEmail: prefs.taskAssignedEmail,
    deadlineSoonEmail: prefs.deadlineSoonEmail,
    newLeaveSubmittedEmail: prefs.newLeaveSubmittedEmail,
  });
});

app.patch("/notification-prefs", authenticate, async (req, res) => {
  const allowed = ["leaveApprovedEmail", "leaveRejectedEmail", "taskAssignedEmail", "deadlineSoonEmail", "newLeaveSubmittedEmail"];
  const update = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) update[k] = !!req.body[k];
  }
  const prefs = await UserNotificationPref.findOneAndUpdate(
    { userId: req.user.id },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json({
    leaveApprovedEmail: prefs.leaveApprovedEmail,
    leaveRejectedEmail: prefs.leaveRejectedEmail,
    taskAssignedEmail: prefs.taskAssignedEmail,
    deadlineSoonEmail: prefs.deadlineSoonEmail,
    newLeaveSubmittedEmail: prefs.newLeaveSubmittedEmail,
  });
});

// ──────────────────────────────────────────────────────────
// KUDOS
// ──────────────────────────────────────────────────────────

app.post("/kudos", authenticate, async (req, res) => {
  const { receiverId, taskId, category, message } = req.body;
  const sender = await Employee.findById(req.user.id).select("-password");
  if (!sender) return res.status(401).json({ message: "Unauthorized" });
  const receiver = await Employee.findById(receiverId);
  if (!receiver) return res.status(404).json({ message: "Receiver not found" });
  const kudos = await Kudos.create({
    senderId: sender._id,
    receiverId: receiver._id,
    taskId,
    category,
    message: message || "",
  });
  await createNotification(receiver._id, `${sender.name} gave you kudos: ${category}`, "success", "");
  await logActivity(sender, "gave_kudos", "kudos", kudos._id, receiver._id, category);
  res.status(201).json({
    id: String(kudos._id),
    senderName: sender.name,
    receiverName: receiver.name,
    category: kudos.category,
    message: kudos.message,
    createdAt: kudos.createdAt ? kudos.createdAt.toISOString() : null,
  });
});

app.get("/kudos/recent", authenticate, async (req, res) => {
  const docs = await Kudos.find().sort({ createdAt: -1 }).limit(20);
  const empMap = {};
  const empIds = [...new Set(docs.flatMap((d) => [String(d.senderId), String(d.receiverId)]))];
  const emps = await Employee.find({ _id: { $in: empIds } }).select("name");
  for (const e of emps) empMap[String(e._id)] = e.name;
  res.json(
    docs.map((d) => ({
      id: String(d._id),
      senderName: empMap[String(d.senderId)] || "",
      receiverName: empMap[String(d.receiverId)] || "",
      category: d.category,
      message: d.message || "",
      createdAt: d.createdAt ? d.createdAt.toISOString() : null,
    }))
  );
});

app.get("/kudos/leaderboard", authenticate, async (req, res) => {
  const agg = await Kudos.aggregate([
    { $group: { _id: "$receiverId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  const empIds = agg.map((a) => a._id);
  const emps = await Employee.find({ _id: { $in: empIds } }).select("name");
  const nameMap = {};
  for (const e of emps) nameMap[String(e._id)] = e.name;
  res.json({
    items: agg.map((a) => ({
      employeeId: String(a._id),
      employeeName: nameMap[String(a._id)] || "",
      count: a.count,
    })),
  });
});

// ──────────────────────────────────────────────────────────
// ONBOARDING CHECKLIST
// ──────────────────────────────────────────────────────────

app.get("/onboarding-checklist", authenticate, async (req, res) => {
  await ensureOnboardingChecklistFor(req.user.id);
  const items = await OnboardingChecklist.find({ userId: req.user.id });
  res.json(
    items.map((i) => ({
      id: String(i._id),
      itemKey: i.itemKey,
      isComplete: i.isComplete,
      completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    }))
  );
});

app.post("/onboarding-checklist/acknowledge-policy", authenticate, async (req, res) => {
  await OnboardingChecklist.updateOne(
    { userId: req.user.id, itemKey: "acknowledge_policy" },
    { $set: { isComplete: true, completedAt: new Date() } },
    { upsert: true }
  );
  res.json({ ok: true });
});

app.get("/onboarding-checklist/:userId", authenticate, async (req, res) => {
  await ensureOnboardingChecklistFor(req.params.userId);
  const items = await OnboardingChecklist.find({ userId: req.params.userId });
  res.json(
    items.map((i) => ({
      id: String(i._id),
      itemKey: i.itemKey,
      isComplete: i.isComplete,
      completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    }))
  );
});

// ──────────────────────────────────────────────────────────
// STOCK
// ──────────────────────────────────────────────────────────

app.get("/stock/setting", authenticate, async (req, res) => {
  const doc = await StockSetting.findOne();
  res.json({ symbol: doc?.symbol || "AAPL" });
});

app.patch("/stock/setting", authenticate, async (req, res) => {
  const symbol = String(req.body.symbol || "").toUpperCase().trim();
  const doc = await StockSetting.findOneAndUpdate(
    {},
    { symbol, updatedBy: req.user.id },
    { upsert: true, new: true }
  );
  res.json({ symbol: doc.symbol });
});

app.get("/stock/quote", authenticate, async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 90);
  const setting = await StockSetting.findOne();
  const symbol = setting?.symbol || "AAPL";

  // Generate synthetic stock data (since no external API is configured)
  const basePrice = symbol === "AAPL" ? 178 : symbol === "GOOGL" ? 141 : symbol === "MSFT" ? 415 : symbol === "AMZN" ? 178 : 100;
  const points = [];
  const now = new Date();
  let price = basePrice;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    price = price + (Math.random() - 0.48) * 3;
    price = Math.max(basePrice * 0.85, Math.min(basePrice * 1.15, price));
    points.push({ date: d.toISOString().slice(0, 10), price: Math.round(price * 100) / 100 });
  }
  const prices = points.map((p) => p.price);
  res.json({
    symbol,
    companyName: symbol === "AAPL" ? "Apple Inc." : symbol === "GOOGL" ? "Alphabet Inc." : symbol === "MSFT" ? "Microsoft Corp." : symbol === "AMZN" ? "Amazon.com Inc." : symbol,
    currentPrice: prices[prices.length - 1],
    changePct: Math.round(((prices[prices.length - 1] - prices[0]) / prices[0]) * 10000) / 100,
    points,
    high: Math.max(...prices),
    low: Math.min(...prices),
    volume: Math.floor(50000000 + Math.random() * 30000000),
  });
});

// ──────────────────────────────────────────────────────────
// AUDIT LOGS
// ──────────────────────────────────────────────────────────

app.get("/audit-logs", authenticate, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const filter = {};
  if (req.query.actionType) filter.actionType = req.query.actionType;
  if (req.query.actor) filter.actorName = { $regex: req.query.actor, $options: "i" };
  const total = await AuditLog.countDocuments(filter);
  const docs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json({
    page,
    limit,
    total,
    items: docs.map((d) => ({
      id: String(d._id),
      timestamp: d.createdAt ? d.createdAt.toISOString() : null,
      actor: d.actorName || "",
      actionType: d.actionType,
      targetType: d.targetType || "",
      targetId: d.targetId || "",
      oldValue: d.oldValue || null,
      newValue: d.newValue || null,
      ipAddress: d.ipAddress || "",
    })),
  });
});

app.get("/audit-logs/export.csv", authenticate, async (req, res) => {
  const filter = {};
  if (req.query.actionType) filter.actionType = req.query.actionType;
  if (req.query.actor) filter.actorName = { $regex: req.query.actor, $options: "i" };
  const docs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000);
  const header = "Timestamp,Actor,ActionType,TargetType,TargetId,IP\n";
  const rows = docs.map((d) =>
    `"${d.createdAt ? d.createdAt.toISOString() : ""}","${(d.actorName || "").replace(/"/g, '""')}","${d.actionType}","${d.targetType || ""}","${d.targetId || ""}","${d.ipAddress || ""}"`
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=audit-logs.csv`);
  res.send(header + rows);
});

// ──────────────────────────────────────────────────────────
// EXPORTS (CSV & PDF)
// ──────────────────────────────────────────────────────────

app.get("/export/leave", authenticate, async (req, res) => {
  const docs = await LeaveRequest.find().sort({ createdAt: -1 });
  const header = "EmployeeName,FromDate,ToDate,Reason,Status,LeaveType,AppliedOn\n";
  const rows = docs.map((d) =>
    `"${d.employeeName}","${d.fromDate ? d.fromDate.toISOString().slice(0, 10) : ""}","${d.toDate ? d.toDate.toISOString().slice(0, 10) : ""}","${(d.reason || "").replace(/"/g, '""')}","${d.status}","${d.leaveType || ""}","${d.appliedOn ? d.appliedOn.toISOString().slice(0, 10) : ""}"`
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=leave-requests.csv");
  res.send(header + rows);
});

app.get("/export/tasks", authenticate, async (req, res) => {
  const docs = await Task.find().sort({ createdAt: -1 });
  const header = "Title,AssignedTo,Priority,Deadline,Status,SmartPriority\n";
  const rows = docs.map((d) =>
    `"${(d.title || "").replace(/"/g, '""')}","${d.assignedTo || ""}","${d.priority}","${d.deadline ? d.deadline.toISOString().slice(0, 10) : ""}","${d.status}","${d.smartPriorityLabel || ""}"`
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=tasks.csv");
  res.send(header + rows);
});

app.get("/export/audit", authenticate, async (req, res) => {
  const docs = await AuditLog.find().sort({ createdAt: -1 }).limit(5000);
  const header = "Timestamp,Actor,ActionType,TargetType,TargetId\n";
  const rows = docs.map((d) =>
    `"${d.createdAt ? d.createdAt.toISOString() : ""}","${(d.actorName || "").replace(/"/g, '""')}","${d.actionType}","${d.targetType || ""}","${d.targetId || ""}"`
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
  res.send(header + rows);
});

app.get("/export/payroll-summary", authenticate, async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const employees = await Employee.find().select("-password");
  const leaveRequests = await LeaveRequest.find({ status: "Approved" });
  const rows = employees.map((e) => computePayrollRow(e, leaveRequests, year, month));

  if (!PDFDocument) {
    // Fallback to CSV if pdfkit not available
    const header = "Employee,Department,GrossSalary,LeaveDays,Deduction,NetSalary\n";
    const csv = rows.map((r) =>
      `"${r.employeeName}","${r.department}",${r.monthlySalary},${r.leaveDaysInMonth},${r.deductionAmount},${r.netSalary}`
    ).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=payroll-summary.csv");
    return res.send(header + csv);
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=payroll-summary-${year}-${month}.pdf`);
  doc.pipe(res);
  doc.fontSize(18).text(`Payroll Summary — ${year}/${String(month).padStart(2, "0")}`, { align: "center" });
  doc.moveDown();
  for (const r of rows) {
    doc.fontSize(10).text(`${r.employeeName} | ${r.department} | Gross: ₹${r.monthlySalary.toLocaleString("en-IN")} | Leave: ${r.leaveDaysInMonth}d | Deduction: ₹${r.deductionAmount.toLocaleString("en-IN")} | Net: ₹${r.netSalary.toLocaleString("en-IN")}`);
  }
  doc.end();
});

app.get("/export/payslip", authenticate, async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const employeeId = req.query.employeeId || req.user.id;
  const employee = await Employee.findById(employeeId).select("-password");
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  const leaveRequests = await LeaveRequest.find({ employeeId: employee._id, status: "Approved" });
  const row = computePayrollRow(employee, leaveRequests, year, month);

  if (!PDFDocument) {
    res.setHeader("Content-Type", "application/json");
    return res.json(row);
  }

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=payslip-${employee.name.replace(/\s+/g, "_")}-${year}-${month}.pdf`);
  doc.pipe(res);

  // --- Styles & Formatting ---
  const primaryColor = "#4338ca"; // Darker Indigo
  const accentColor = "#6366f1";
  const bgSoft = "#f9fafb";
  const textDark = "#111827"; // Near Black
  const textMuted = "#4b5563"; // Strong Gray

  // --- Header ---
  doc.rect(0, 0, 600, 140).fill(primaryColor);
  doc.fillColor("#ffffff").fontSize(28).font("Helvetica-Bold").text("TASKFLOW", 50, 45);
  doc.fontSize(10).font("Helvetica").text("Enterprise Productivity Suite", 50, 80);
  doc.fontSize(11).text("123 Innovation Drive, Silicon Valley, CA", 50, 95);
  
  doc.fontSize(22).font("Helvetica-Bold").text("PAY SLIP", 400, 55, { align: "right" });
  doc.fontSize(12).font("Helvetica").text(`${new Date(year, month-1).toLocaleString('default', { month: 'long' })} ${year}`, 400, 85, { align: "right" });

  // --- Employee Info ---
  doc.moveDown(6);
  doc.fillColor(textDark);
  doc.fontSize(13).font("Helvetica-Bold").text("EMPLOYEE METRICS", 50, 160);
  doc.rect(50, 178, 500, 2).fill(accentColor);
  
  const startY = 200;
  doc.fillColor(textMuted).fontSize(10).font("Helvetica-Bold").text("FULL NAME:", 50, startY);
  doc.fillColor(textDark).font("Helvetica").text(row.employeeName, 130, startY);
  
  doc.fillColor(textMuted).font("Helvetica-Bold").text("EMAIL ID:", 50, startY + 22);
  doc.fillColor(textDark).font("Helvetica").text(employee.email, 130, startY + 22);
  
  doc.fillColor(textMuted).font("Helvetica-Bold").text("DEPARTMENT:", 300, startY);
  doc.fillColor(textDark).font("Helvetica").text(row.department, 400, startY);
  
  doc.fillColor(textMuted).font("Helvetica-Bold").text("DESIGNATION:", 300, startY + 22);
  doc.fillColor(textDark).font("Helvetica").text(employee.jobRole || "Staff", 400, startY + 22);

  // --- Earnings & Deductions Table ---
  doc.moveDown(5);
  const tableTop = 280;
  doc.fontSize(13).font("Helvetica-Bold").fillColor(textDark).text("FINANCIAL SUMMARY", 50, tableTop);
  
  // Table Header
  doc.rect(50, tableTop + 20, 500, 30).fill(bgSoft);
  doc.fillColor(textMuted).fontSize(10).font("Helvetica-Bold").text("PAYMENT DESCRIPTION", 65, tableTop + 30);
  doc.text("AMOUNT (INR)", 450, tableTop + 30, { align: "right", width: 90 });

  // Rows
  const drawLine = (y) => doc.moveTo(50, y).lineTo(550, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
  let curY = tableTop + 65;
  
  const addRow = (label, value, isDeduction = false) => {
    doc.fillColor(textDark).fontSize(11).font("Helvetica").text(label, 65, curY);
    doc.fillColor(isDeduction ? "#be123c" : textDark).font("Helvetica-Bold").text(`${isDeduction ? "-" : ""} RS. ${value.toLocaleString("en-IN")}`, 450, curY, { align: "right", width: 90 });
    curY += 30;
    drawLine(curY - 10);
  };

  addRow("Basic Monthly Gross", row.monthlySalary);
  if (row.deductionAmount > 0) {
    addRow(`Attendance Deductions (${row.excessLeaveDays} Days)`, row.deductionAmount, true);
  } else {
    addRow("Leave & Attendance Bonus", 0);
  }

  // --- Total Box ---
  doc.moveDown(3);
  doc.rect(300, curY + 20, 250, 55).fill(primaryColor);
  doc.fillColor("#ffffff").fontSize(12).font("Helvetica").text("TAKE HOME SALARY", 320, curY + 35);
  doc.fontSize(20).font("Helvetica-Bold").text(`RS. ${row.netSalary.toLocaleString("en-IN")}`, 410, curY + 50, { align: "right", width: 130 });

  // --- Footer ---
  const footerY = 740;
  doc.rect(50, footerY - 40, 150, 0.5).fill(textMuted); // Signature line
  doc.fillColor(textMuted).fontSize(9).font("Helvetica-Bold").text("Authorized Signatory", 50, footerY - 30);
  
  doc.fontSize(8).font("Helvetica").text("NOTE: This document is system-generated and verified by the TaskFlow Payroll Engine.", 50, footerY + 10, { align: "center", width: 500 });
  
  doc.end();
});

// /api/export route used by EmployeeDashboard.tsx direct fetch
app.get("/api/export", authenticate, async (req, res) => {
  const type = req.query.type;
  if (type === "payslip") {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const employeeId = req.query.employeeId || req.user.id;
    const employee = await Employee.findById(employeeId).select("-password");
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    const leaveReqs = await LeaveRequest.find({ employeeId: employee._id, status: "Approved" });
    const row = computePayrollRow(employee, leaveReqs, year, month);
    if (!PDFDocument) return res.json(row);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=payslip-${employee.name.replace(/\s+/g, "_")}-${year}-${month}.pdf`);
    doc.pipe(res);

    const primaryColor = "#4f46e5";
    const textDark = "#1e293b";
    const textMuted = "#64748b";

    doc.rect(0, 0, 600, 100).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("TASKFLOW", 50, 40);
    doc.fontSize(16).text("PAY SLIP", 400, 45, { align: "right" });

    doc.fillColor(textDark).fontSize(10).font("Helvetica-Bold").text("Employee Info", 50, 130);
    doc.font("Helvetica").text(`${row.employeeName} | ${row.department} | ${employee.email}`, 50, 145);

    doc.rect(50, 180, 500, 0.5).fill("#e2e8f0");
    doc.fillColor(textMuted).text("Earnings Summary", 50, 195);
    doc.fillColor(textDark).fontSize(12).text(`Gross Salary: ₹${row.monthlySalary.toLocaleString("en-IN")}`, 50, 215);
    doc.text(`Leave Deductions: ₹${row.deductionAmount.toLocaleString("en-IN")}`, 50, 235);
    
    doc.fontSize(16).font("Helvetica-Bold").fillColor(primaryColor).text(`Net Pay: ₹${row.netSalary.toLocaleString("en-IN")}`, 50, 270);
    doc.fontSize(8).fillColor(textMuted).text("System Generated Payslip", 50, 750, { align: "center" });

    doc.end();
    return;
  }
  res.status(400).json({ message: "Unsupported export type" });
});

// ──────────────────────────────────────────────────────────
// ADMIN: seed-reset
// ──────────────────────────────────────────────────────────

app.post("/admin/seed-reset", async (req, res) => {
  const key = req.headers["x-admin-seed-key"];
  const expected = process.env.ADMIN_SEED_KEY || "dev-seed-key";
  if (!key || key !== expected) return res.status(403).json({ message: "Invalid seed key" });
  try {
    const { resetDemoData } = require("./scripts/seed-reset");
    await resetDemoData({ preserveAdminId: null });
    res.json({ message: "Seed reset complete" });
  } catch (err) {
    console.error("Seed reset error:", err);
    res.status(500).json({ message: "Seed reset failed" });
  }
});

// ──────────────────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────
// RECURRING TASK AUTOMATION ENGINE
// ──────────────────────────────────────────────────────────
setInterval(async () => {
  try {
    const tasksToSpawn = await Task.find({
      recurrence: { $in: ["daily", "weekly", "monthly"] },
      nextRecurrenceSpawned: false,
    });
    for (const task of tasksToSpawn) {
      if (task.status !== "Completed" && task.deadline && new Date() < new Date(task.deadline)) {
        continue; // Only spawn if completed OR deadline passed
      }

      const nextDeadline = new Date(task.deadline || Date.now());
      if (task.recurrence === "daily") nextDeadline.setDate(nextDeadline.getDate() + 1);
      else if (task.recurrence === "weekly") nextDeadline.setDate(nextDeadline.getDate() + 7);
      else if (task.recurrence === "monthly") nextDeadline.setMonth(nextDeadline.getMonth() + 1);

      const clone = new Task({
        title: task.title,
        assignedToId: task.assignedToId,
        assignedTo: task.assignedTo,
        priority: task.priority,
        deadline: nextDeadline,
        description: task.description,
        dependentTaskIds: task.dependentTaskIds,
        status: "Pending",
        recurrence: task.recurrence,
        checklists: task.checklists.map(c => ({ text: c.text, isCompleted: false }))
      });
      await recomputeTaskPriority(clone);
      await clone.save();

      task.nextRecurrenceSpawned = true;
      task.recurrence = "none"; // the newly created clone carries the recurrence torch!
      await task.save();

      if (clone.assignedToId) {
        await createNotification(clone.assignedToId, `Recurring task spawned: ${clone.title}`, "task", "");
      }
    }
  } catch (err) {
    console.error("Cron engine error:", err);
  }
}, 30000); // 30s check

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// ──────────────────────────────────────────────────────────
// RECURRING TASKS ENGINE
// ──────────────────────────────────────────────────────────
async function processRecurringTasks() {
  try {
    const tasks = await Task.find({
      recurrence: { $in: ["daily", "weekly", "monthly"] },
      status: "Completed",
      nextRecurrenceSpawned: false,
    });
    for (const task of tasks) {
      if (!task.closedAt) continue;
      
      let nextDeadline = new Date(task.deadline || task.closedAt);
      if (task.recurrence === "daily") nextDeadline.setDate(nextDeadline.getDate() + 1);
      if (task.recurrence === "weekly") nextDeadline.setDate(nextDeadline.getDate() + 7);
      if (task.recurrence === "monthly") nextDeadline.setMonth(nextDeadline.getMonth() + 1);

      const newTask = new Task({
        title: task.title,
        assignedToId: task.assignedToId,
        assignedTo: task.assignedTo,
        priority: task.priority,
        deadline: nextDeadline,
        description: task.description,
        status: "Pending",
        recurrence: task.recurrence,
        nextRecurrenceSpawned: false,
      });
      await newTask.save();
      
      task.nextRecurrenceSpawned = true;
      await task.save();
    }
  } catch (err) {
    console.error("Recurring tasks engine error:", err);
  }
}
setInterval(processRecurringTasks, 60 * 1000); // Check every minute
