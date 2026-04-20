const mongoose = require("mongoose");

const UserNotificationPrefSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
    leaveApprovedEmail: { type: Boolean, default: true },
    leaveRejectedEmail: { type: Boolean, default: true },
    taskAssignedEmail: { type: Boolean, default: true },
    deadlineSoonEmail: { type: Boolean, default: true },
    newLeaveSubmittedEmail: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserNotificationPref", UserNotificationPrefSchema);
