const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actionType: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    actorName: { type: String, default: "" },
    targetId: { type: String, default: "" },
    targetType: { type: String, default: "" },
    oldValue: { type: Object, default: null },
    newValue: { type: Object, default: null },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actionType: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
