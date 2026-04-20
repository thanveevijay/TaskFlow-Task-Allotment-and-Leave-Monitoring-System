const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    assignedTo: { type: String, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    deadline: { type: Date, default: null },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
    originalAssigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    originalAssigneeName: { type: String, default: "" },
    reassignmentNote: { type: String, default: "" },
    dependentTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    priorityScore: { type: Number, default: 0, index: true },
    smartPriorityLabel: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Low" },
    closedAt: { type: Date, default: null },
    comments: [
      {
        text: { type: String, required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        authorName: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    checklists: [
      {
        text: { type: String, required: true },
        isCompleted: { type: Boolean, default: false }
      }
    ],
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    nextRecurrenceSpawned: { type: Boolean, default: false },
    lastRecurrenceProcessed: { type: String, default: "" },
    aiStrategySuggestion: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ assignedToId: 1, status: 1 });
TaskSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Task", TaskSchema);

