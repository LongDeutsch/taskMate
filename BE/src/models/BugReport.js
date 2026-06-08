import mongoose from "mongoose";

export const BUG_STATUSES = ["todo", "in_progress", "done"];

const bugReportSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: "User" },
    userName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    status: { type: String, enum: BUG_STATUSES, default: "todo" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

bugReportSchema.index({ userId: 1, createdAt: -1 });
bugReportSchema.index({ status: 1, createdAt: -1 });

bugReportSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
    return ret;
  },
});

export const BugReport = mongoose.model("BugReport", bugReportSchema);
