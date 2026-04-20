const mongoose = require("mongoose");

const LeaveRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String, default: "" },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    leaveType: { type: String, enum: ["Casual", "Sick", "Earned"], default: "Casual" },
    isPaid: { type: Boolean, default: true },
    handovers: [
      {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
        substituteEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
      },
    ],
    appliedOn: { type: Date, default: null },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employeeId: 1, createdAt: -1 });
LeaveRequestSchema.index({ status: 1, fromDate: 1, toDate: 1 });

module.exports = mongoose.model("LeaveRequest", LeaveRequestSchema);
