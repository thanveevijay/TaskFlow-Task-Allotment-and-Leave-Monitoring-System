const mongoose = require("mongoose");

const OnboardingChecklistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    itemKey: {
      type: String,
      enum: ["complete_profile", "upload_avatar", "acknowledge_policy", "first_task_received"],
      required: true,
    },
    isComplete: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OnboardingChecklistSchema.index({ userId: 1, itemKey: 1 }, { unique: true });

module.exports = mongoose.model("OnboardingChecklist", OnboardingChecklistSchema);
