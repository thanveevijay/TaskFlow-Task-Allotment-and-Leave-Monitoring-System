const mongoose = require("mongoose");

const KudosSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    category: {
      type: String,
      enum: ["Great collaboration", "Fast turnaround", "Saved the day", "Above and beyond", "Mentorship"],
      required: true,
    },
    message: { type: String, default: "", maxlength: 120 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

KudosSchema.index({ createdAt: -1 });
KudosSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model("Kudos", KudosSchema);
