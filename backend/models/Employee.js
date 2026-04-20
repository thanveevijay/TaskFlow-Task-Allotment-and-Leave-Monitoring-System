const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    accessRole: { type: String, enum: ["manager", "employee"], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    jobRole: { type: String, default: "" },
    department: { type: String, default: "" },
    avatar: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    leaveAllowance: { type: Number, default: 20 },
    leaveBalance: { type: Number, default: 20 },
    /** Legacy field; payroll uses company default in code, not this value. */
    monthlySalary: { type: Number, default: 80000 },
    resetCodeHash: { type: String, default: "" },
    resetCodeExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
