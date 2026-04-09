import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    projectId: { type: String, required: true, ref: "Project" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    feedback: { type: String, default: "", maxlength: 5000 },
    status: { type: String, enum: ["Todo", "InProgress", "Done"], default: "Todo" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    deadline: { type: String, required: true },
    assigneeId: { type: String, default: null, ref: "User" },
    collaboratorIds: { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
    restoreUntil: { type: Date, default: null },
    deletedByProject: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

taskSchema.index({ projectId: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ deadline: 1 });

taskSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.createdAt = ret.createdAt?.toISOString?.() ?? ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() ?? ret.updatedAt;
    return ret;
  },
});

export const Task = mongoose.model("Task", taskSchema);
