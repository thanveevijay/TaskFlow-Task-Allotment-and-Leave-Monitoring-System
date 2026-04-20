const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    actorName: { type: String, default: "" },
    action: { type: String, required: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    targetEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    meta: { type: String, default: "" },
  },
  { timestamps: true }
);

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ targetEmployeeId: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", ActivitySchema);
